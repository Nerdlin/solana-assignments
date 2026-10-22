use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::state::VaultState;

/// Неделя 8: Каркас Vault — Инициализация Vault
/// Создает:
/// 1. VaultState PDA (`[b"vault", token_mint]`)
/// 2. vault_token_account PDA (`[b"vault_tokens", token_mint]`) — физическое хранилище токенов
/// 3. share_mint PDA (`[b"share_mint", token_mint]`) — mint квитанций долей с decimals = 6
#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = admin,
        space = VaultState::LEN,
        seeds = [b"vault", token_mint.key().as_ref()],
        bump,
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        init,
        payer = admin,
        token::mint = token_mint,
        token::authority = vault_state,
        seeds = [b"vault_tokens", token_mint.key().as_ref()],
        bump,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = admin,
        mint::decimals = 6,
        mint::authority = vault_state,
        seeds = [b"share_mint", token_mint.key().as_ref()],
        bump,
    )]
    pub share_mint: Account<'info, Mint>,

    pub token_mint: Account<'info, Mint>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<InitializeVault>) -> Result<()> {
    let vault = &mut ctx.accounts.vault_state;
    vault.admin = ctx.accounts.admin.key();
    vault.token_mint = ctx.accounts.token_mint.key();
    vault.vault_token_account = ctx.accounts.vault_token_account.key();
    vault.share_mint = ctx.accounts.share_mint.key();
    vault.total_tokens = 0;
    vault.total_shares = 0;
    vault.bump = ctx.bumps.vault_state;

    msg!("Vault initialized for mint: {}", vault.token_mint);
    Ok(())
}
