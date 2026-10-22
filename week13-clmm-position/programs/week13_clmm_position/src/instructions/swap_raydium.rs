use anchor_lang::prelude::*;
use anchor_spl::memo::Memo;
use anchor_spl::token::Token;
use anchor_spl::token_2022::Token2022;
use anchor_spl::token_interface::{self, Approve, Mint, Revoke, TokenAccount};
use raydium_clmm_cpi::{
    cpi,
    states::{AmmConfig, ObservationState, PoolState},
};

use crate::errors::VaultError;
use crate::state::VaultState;

/// Неделя 12: Swap через Raydium CLMM
/// Vault обменивает свои токены через пул ликвидности Raydium CLMM.
///
/// Защита от проскальзывания:
/// `min_amount_out` (other_amount_threshold) задает минимальное число получаемых токенов.
/// Если пул вернет меньше — транзакция прервется.
#[derive(Accounts)]
pub struct SwapRaydium<'info> {
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

    /// Токен-аккаунт vault для отдаваемого токена
    #[account(
        mut,
        token::authority = vault_state,
    )]
    pub vault_input_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Токен-аккаунт vault для получаемого токена
    #[account(
        mut,
        token::authority = vault_state,
    )]
    pub vault_output_token_account: InterfaceAccount<'info, TokenAccount>,

    // ─── Raydium CLMM аккаунты ────────────────────────────────────────────

    pub amm_config: Box<Account<'info, AmmConfig>>,

    #[account(mut)]
    pub pool_state: AccountLoader<'info, PoolState>,

    #[account(mut)]
    pub input_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub output_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub observation_state: AccountLoader<'info, ObservationState>,

    pub input_vault_mint: Box<InterfaceAccount<'info, Mint>>,
    pub output_vault_mint: Box<InterfaceAccount<'info, Mint>>,

    /// Raydium CLMM program
    /// CHECK: проверяется адрес программы
    #[account(address = raydium_clmm_cpi::id())]
    pub clmm_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub token_program_2022: Program<'info, Token2022>,
    pub memo_program: Program<'info, Memo>,
}

pub fn handler<'a, 'b, 'c: 'info, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, SwapRaydium<'info>>,
    amount_in: u64,
    min_amount_out: u64,
) -> Result<()> {
    require!(amount_in > 0, VaultError::ZeroAmount);

    let token_mint_key = ctx.accounts.vault_state.token_mint;
    let bump = ctx.accounts.vault_state.bump;
    let vault_seeds: &[&[&[u8]]] = &[&[b"vault", token_mint_key.as_ref(), &[bump]]];

    // 1. Делегируем админу полномочия на списание amount_in с vault токен-аккаунта
    token_interface::approve(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Approve {
                to: ctx.accounts.vault_input_token_account.to_account_info(),
                delegate: ctx.accounts.admin.to_account_info(),
                authority: ctx.accounts.vault_state.to_account_info(),
            },
            vault_seeds,
        ),
        amount_in,
    )?;

    // 2. Формируем CPI вызов в Raydium CLMM swap_v2
    let remaining = ctx.remaining_accounts.to_vec();

    let cpi_accounts = cpi::accounts::SwapSingleV2 {
        payer: ctx.accounts.admin.to_account_info(),
        amm_config: ctx.accounts.amm_config.to_account_info(),
        pool_state: ctx.accounts.pool_state.to_account_info(),
        input_token_account: ctx.accounts.vault_input_token_account.to_account_info(),
        output_token_account: ctx.accounts.vault_output_token_account.to_account_info(),
        input_vault: ctx.accounts.input_vault.to_account_info(),
        output_vault: ctx.accounts.output_vault.to_account_info(),
        observation_state: ctx.accounts.observation_state.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        token_program_2022: ctx.accounts.token_program_2022.to_account_info(),
        memo_program: ctx.accounts.memo_program.to_account_info(),
        input_vault_mint: ctx.accounts.input_vault_mint.to_account_info(),
        output_vault_mint: ctx.accounts.output_vault_mint.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.clmm_program.to_account_info(),
        cpi_accounts,
        vault_seeds,
    )
    .with_remaining_accounts(remaining);

    // swap_v2:
    // amount: amount_in
    // other_amount_threshold: min_amount_out (slippage control)
    // sqrt_price_limit_x64: 0 (нет ограничения цены)
    // is_base_input: true (фиксированный вход)
    cpi::swap_v2(cpi_ctx, amount_in, min_amount_out, 0, true)?;

    // 3. Отзываем делегацию
    token_interface::revoke(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Revoke {
                source: ctx.accounts.vault_input_token_account.to_account_info(),
                authority: ctx.accounts.vault_state.to_account_info(),
            },
            vault_seeds,
        ),
    )?;

    // 4. Обновляем учет токенов в VaultState, если менялся основной токен
    if ctx.accounts.vault_input_token_account.mint == token_mint_key {
        let vault = &mut ctx.accounts.vault_state;
        vault.total_tokens = vault.total_tokens.saturating_sub(amount_in);
    }

    msg!(
        "Raydium Swap executed: amount_in={}, min_amount_out={}",
        amount_in, min_amount_out
    );
    Ok(())
}
