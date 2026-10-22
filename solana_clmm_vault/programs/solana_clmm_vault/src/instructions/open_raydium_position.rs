use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::Token;
use anchor_spl::token_2022::Token2022;
use anchor_spl::token_interface::{self, Approve, Mint, Revoke, TokenAccount};
use raydium_clmm_cpi::{cpi, states::PoolState};

use crate::errors::VaultError;
use crate::state::VaultState;

/// Неделя 13: Позиция в CLMM-пуле — Открытие позиции
///
/// Vault открывает концентрированную позицию в диапазоне [tick_lower, tick_upper].
/// Владельцем NFT позиции является сам vault_state PDA.
/// Средства берутся из токен-аккаунтов vault (MyToken и wSOL/TokenB).
#[derive(Accounts)]
pub struct OpenRaydiumPosition<'info> {
    /// Администратор vault — платит за аренду position NFT и tick arrays
    #[account(mut)]
    pub admin: Signer<'info>,

    /// Состояние vault
    #[account(
        mut,
        seeds = [b"vault", vault_state.token_mint.as_ref()],
        bump = vault_state.bump,
        constraint = vault_state.admin == admin.key() @ VaultError::Unauthorized,
    )]
    pub vault_state: Account<'info, VaultState>,

    /// Аккаунт основного токена vault
    #[account(
        mut,
        seeds = [b"vault_tokens", vault_state.token_mint.as_ref()],
        bump,
        token::mint = vault_state.token_mint,
        token::authority = vault_state,
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Аккаунт второго токена (например, wSOL), принадлежащий vault PDA
    #[account(
        mut,
        token::authority = vault_state,
    )]
    pub vault_second_token_account: InterfaceAccount<'info, TokenAccount>,

    pub second_token_mint: InterfaceAccount<'info, Mint>,

    // ─── Raydium CLMM аккаунты ────────────────────────────────────────────

    /// Состояние пула Raydium
    #[account(mut)]
    pub pool_state: AccountLoader<'info, PoolState>,

    /// Mint NFT позиции (новый keypair, создается Raydium)
    #[account(mut)]
    pub position_nft_mint: Signer<'info>,

    /// ATA NFT позиции (принадлежит vault PDA — vault владеет позицией)
    /// CHECK: валидируется и инициализируется Raydium CPI
    #[account(mut)]
    pub position_nft_account: UncheckedAccount<'info>,

    /// Личная позиция в Raydium (personal position)
    /// CHECK: валидируется Raydium
    #[account(mut)]
    pub personal_position: UncheckedAccount<'info>,

    /// Tick array нижней границы
    /// CHECK: валидируется Raydium
    #[account(mut)]
    pub tick_array_lower: UncheckedAccount<'info>,

    /// Tick array верхней границы
    /// CHECK: валидируется Raydium
    #[account(mut)]
    pub tick_array_upper: UncheckedAccount<'info>,

    /// Хранилище token0 пула
    #[account(mut)]
    pub token_vault_0: InterfaceAccount<'info, TokenAccount>,

    /// Хранилище token1 пула
    #[account(mut)]
    pub token_vault_1: InterfaceAccount<'info, TokenAccount>,

    pub vault_0_mint: InterfaceAccount<'info, Mint>,
    pub vault_1_mint: InterfaceAccount<'info, Mint>,

    /// Raydium CLMM program
    /// CHECK: проверяется адрес программы
    #[account(address = raydium_clmm_cpi::id())]
    pub clmm_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub token_program_2022: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler<'a, 'b, 'c: 'info, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, OpenRaydiumPosition<'info>>,
    tick_lower_index: i32,
    tick_upper_index: i32,
    tick_array_lower_start_index: i32,
    tick_array_upper_start_index: i32,
    liquidity: u128,
    amount_0_max: u64,
    amount_1_max: u64,
) -> Result<()> {
    require!(tick_lower_index < tick_upper_index, VaultError::InvalidTickRange);

    let token_mint_key = ctx.accounts.vault_state.token_mint;
    let bump = ctx.accounts.vault_state.bump;
    let vault_seeds: &[&[&[u8]]] = &[&[b"vault", token_mint_key.as_ref(), &[bump]]];

    // Определяем, какой аккаунт соответствует token0, а какой token1
    let pool_mint_0 = ctx.accounts.vault_0_mint.key();
    let (token_account_0, token_account_1) = if pool_mint_0 == token_mint_key {
        (
            ctx.accounts.vault_token_account.to_account_info(),
            ctx.accounts.vault_second_token_account.to_account_info(),
        )
    } else {
        (
            ctx.accounts.vault_second_token_account.to_account_info(),
            ctx.accounts.vault_token_account.to_account_info(),
        )
    };

    let (token_a_max, token_b_max) = if pool_mint_0 == token_mint_key {
        (amount_0_max, amount_1_max)
    } else {
        (amount_1_max, amount_0_max)
    };

    // 1. Делегируем админу списание токенов с аккаунтов vault для CPI
    token_interface::approve(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Approve {
                to: ctx.accounts.vault_token_account.to_account_info(),
                delegate: ctx.accounts.admin.to_account_info(),
                authority: ctx.accounts.vault_state.to_account_info(),
            },
            vault_seeds,
        ),
        token_a_max,
    )?;

    token_interface::approve(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Approve {
                to: ctx.accounts.vault_second_token_account.to_account_info(),
                delegate: ctx.accounts.admin.to_account_info(),
                authority: ctx.accounts.vault_state.to_account_info(),
            },
            vault_seeds,
        ),
        token_b_max,
    )?;

    let remaining = ctx.remaining_accounts.to_vec();

    // 2. Вызываем CPI Raydium CLMM open_position_with_token22_nft
    let cpi_accounts = cpi::accounts::OpenPositionWithToken22Nft {
        payer: ctx.accounts.admin.to_account_info(),
        position_nft_owner: ctx.accounts.vault_state.to_account_info(), // vault PDA владеет NFT
        position_nft_mint: ctx.accounts.position_nft_mint.to_account_info(),
        position_nft_account: ctx.accounts.position_nft_account.to_account_info(),
        pool_state: ctx.accounts.pool_state.to_account_info(),
        protocol_position: ctx.accounts.personal_position.to_account_info(),
        tick_array_lower: ctx.accounts.tick_array_lower.to_account_info(),
        tick_array_upper: ctx.accounts.tick_array_upper.to_account_info(),
        personal_position: ctx.accounts.personal_position.to_account_info(),
        token_account_0,
        token_account_1,
        token_vault_0: ctx.accounts.token_vault_0.to_account_info(),
        token_vault_1: ctx.accounts.token_vault_1.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
        token_program_2022: ctx.accounts.token_program_2022.to_account_info(),
        vault_0_mint: ctx.accounts.vault_0_mint.to_account_info(),
        vault_1_mint: ctx.accounts.vault_1_mint.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.clmm_program.to_account_info(),
        cpi_accounts,
        vault_seeds,
    )
    .with_remaining_accounts(remaining);

    cpi::open_position_with_token22_nft(
        cpi_ctx,
        tick_lower_index,
        tick_upper_index,
        tick_array_lower_start_index,
        tick_array_upper_start_index,
        liquidity,
        amount_0_max,
        amount_1_max,
        true,        // with_metadata
        Some(false), // base_flag
    )?;

    // 3. Отзываем делегации после завершения CPI
    token_interface::revoke(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Revoke {
                source: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.vault_state.to_account_info(),
            },
            vault_seeds,
        ),
    )?;

    token_interface::revoke(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Revoke {
                source: ctx.accounts.vault_second_token_account.to_account_info(),
                authority: ctx.accounts.vault_state.to_account_info(),
            },
            vault_seeds,
        ),
    )?;

    msg!(
        "CLMM Position opened: tick_lower={}, tick_upper={}, liquidity={}",
        tick_lower_index, tick_upper_index, liquidity
    );
    Ok(())
}
