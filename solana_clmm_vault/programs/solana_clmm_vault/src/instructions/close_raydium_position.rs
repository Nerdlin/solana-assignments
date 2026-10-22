use anchor_lang::prelude::*;
use anchor_spl::memo::Memo;
use anchor_spl::token::Token;
use anchor_spl::token_2022::Token2022;
use anchor_spl::token_interface::{Mint, TokenAccount};
use raydium_clmm_cpi::{
    cpi,
    states::{PersonalPositionState, PoolState, TickArrayState},
};

use crate::errors::VaultError;
use crate::state::VaultState;

/// Неделя 13: Позиция в CLMM-пуле — Сбор комиссий и закрытие позиции
///
/// 1. Выводит всю ликвидность из Raydium CLMM (decrease_liquidity_v2) с возвратом обоих токенов и накопленных комиссий в хранилище vault.
/// 2. Закрывает аккаунт личной позиции (close_position) со сжиганием NFT позиции.
#[derive(Accounts)]
pub struct CloseRaydiumPosition<'info> {
    /// Администратор vault
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

    /// Токен-аккаунт основного токена vault (куда возвращаются токены)
    #[account(
        mut,
        seeds = [b"vault_tokens", vault_state.token_mint.as_ref()],
        bump,
        token::mint = vault_state.token_mint,
        token::authority = vault_state,
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Токен-аккаунт второго токена vault (куда возвращаются токены)
    #[account(
        mut,
        token::authority = vault_state,
    )]
    pub vault_second_token_account: InterfaceAccount<'info, TokenAccount>,

    // ─── Raydium CLMM аккаунты ────────────────────────────────────────────

    #[account(mut)]
    pub pool_state: AccountLoader<'info, PoolState>,

    /// Mint NFT закрываемой позиции
    #[account(mut)]
    pub position_nft_mint: Signer<'info>,

    /// ATA NFT позиции (принадлежит vault PDA)
    #[account(mut)]
    pub position_nft_account: InterfaceAccount<'info, TokenAccount>,

    /// Личная позиция в Raydium CLMM
    #[account(
        mut,
        constraint = personal_position.pool_id == pool_state.key(),
    )]
    pub personal_position: Box<Account<'info, PersonalPositionState>>,

    /// Хранилище token0 пула
    #[account(mut)]
    pub token_vault_0: InterfaceAccount<'info, TokenAccount>,

    /// Хранилище token1 пула
    #[account(mut)]
    pub token_vault_1: InterfaceAccount<'info, TokenAccount>,

    /// Tick array нижней границы
    #[account(mut)]
    pub tick_array_lower: AccountLoader<'info, TickArrayState>,

    /// Tick array верхней границы
    #[account(mut)]
    pub tick_array_upper: AccountLoader<'info, TickArrayState>,

    pub vault_0_mint: InterfaceAccount<'info, Mint>,
    pub vault_1_mint: InterfaceAccount<'info, Mint>,

    /// Raydium CLMM program
    /// CHECK: проверяется адрес программы
    #[account(address = raydium_clmm_cpi::id())]
    pub clmm_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub token_program_2022: Program<'info, Token2022>,
    pub memo_program: Program<'info, Memo>,
    pub system_program: Program<'info, System>,
}

pub fn handler<'a, 'b, 'c: 'info, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, CloseRaydiumPosition<'info>>,
    amount_0_min: u64,
    amount_1_min: u64,
) -> Result<()> {
    let remaining = ctx.remaining_accounts.to_vec();

    let token_mint_key = ctx.accounts.vault_state.token_mint;
    let bump = ctx.accounts.vault_state.bump;
    let vault_seeds: &[&[&[u8]]] = &[&[b"vault", token_mint_key.as_ref(), &[bump]]];

    let liquidity = ctx.accounts.personal_position.liquidity;

    // Определяем получателей token0 и token1
    let pool_mint_0 = ctx.accounts.vault_0_mint.key();
    let (recipient_0, recipient_1) = if pool_mint_0 == token_mint_key {
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

    // 1. Выводим ликвидность и забираем заработанные комиссии (если есть ликвидность)
    if liquidity > 0 {
        let decrease_accounts = cpi::accounts::DecreaseLiquidityV2 {
            nft_owner: ctx.accounts.vault_state.to_account_info(),
            nft_account: ctx.accounts.position_nft_account.to_account_info(),
            personal_position: ctx.accounts.personal_position.to_account_info(),
            pool_state: ctx.accounts.pool_state.to_account_info(),
            protocol_position: ctx.accounts.personal_position.to_account_info(),
            token_vault_0: ctx.accounts.token_vault_0.to_account_info(),
            token_vault_1: ctx.accounts.token_vault_1.to_account_info(),
            tick_array_lower: ctx.accounts.tick_array_lower.to_account_info(),
            tick_array_upper: ctx.accounts.tick_array_upper.to_account_info(),
            recipient_token_account_0: recipient_0,
            recipient_token_account_1: recipient_1,
            token_program: ctx.accounts.token_program.to_account_info(),
            token_program_2022: ctx.accounts.token_program_2022.to_account_info(),
            memo_program: ctx.accounts.memo_program.to_account_info(),
            vault_0_mint: ctx.accounts.vault_0_mint.to_account_info(),
            vault_1_mint: ctx.accounts.vault_1_mint.to_account_info(),
        };

        let decrease_ctx = CpiContext::new_with_signer(
            ctx.accounts.clmm_program.to_account_info(),
            decrease_accounts,
            vault_seeds,
        )
        .with_remaining_accounts(remaining);

        cpi::decrease_liquidity_v2(decrease_ctx, liquidity, amount_0_min, amount_1_min)?;
    }

    // 2. Закрываем личную позицию (сжигаем position NFT)
    let close_accounts = cpi::accounts::ClosePosition {
        nft_owner: ctx.accounts.vault_state.to_account_info(),
        position_nft_mint: ctx.accounts.position_nft_mint.to_account_info(),
        position_nft_account: ctx.accounts.position_nft_account.to_account_info(),
        personal_position: ctx.accounts.personal_position.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        token_program: ctx.accounts.token_program_2022.to_account_info(),
    };

    let close_ctx = CpiContext::new_with_signer(
        ctx.accounts.clmm_program.to_account_info(),
        close_accounts,
        vault_seeds,
    );

    cpi::close_position(close_ctx)?;

    msg!("CLMM Position closed successfully: liquidity withdrawn = {}", liquidity);
    Ok(())
}
