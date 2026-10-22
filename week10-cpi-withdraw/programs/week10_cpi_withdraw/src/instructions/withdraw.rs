use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};

use crate::errors::VaultError;
use crate::state::{UserCard, VaultState};

/// Неделя 10: CPI и вывод из vault
/// Пользователь возвращает и сжигает `shares_amount` shares, забирая пропорциональную долю токенов.
/// Расчет:
///   tokens_out = shares_amount × total_tokens / total_shares
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault_state.token_mint.as_ref()],
        bump = vault_state.bump,
    )]
    pub vault_state: Account<'info, VaultState>,

    /// Карточка пользователя — списание долей
    #[account(
        mut,
        seeds = [b"user_card", vault_state.key().as_ref(), user.key().as_ref()],
        bump = user_card.bump,
    )]
    pub user_card: Account<'info, UserCard>,

    /// Хранилище токенов vault (источник вывода)
    #[account(
        mut,
        seeds = [b"vault_tokens", vault_state.token_mint.as_ref()],
        bump,
        token::mint = vault_state.token_mint,
        token::authority = vault_state,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Минт share-токенов (сжигание)
    #[account(
        mut,
        seeds = [b"share_mint", vault_state.token_mint.as_ref()],
        bump,
        mint::authority = vault_state,
    )]
    pub share_mint: Account<'info, Mint>,

    /// Токен-аккаунт пользователя (куда перечисляются токены)
    #[account(
        mut,
        token::mint = vault_state.token_mint,
        token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// Share-аккаунт пользователя (откуда сжигаются shares)
    #[account(
        mut,
        token::mint = share_mint,
        token::authority = user,
    )]
    pub user_share_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Withdraw>, shares_amount: u64) -> Result<()> {
    require!(shares_amount > 0, VaultError::ZeroAmount);

    let vault = &ctx.accounts.vault_state;
    require!(vault.total_shares > 0, VaultError::VaultEmpty);

    let card = &ctx.accounts.user_card;
    require!(card.shares >= shares_amount, VaultError::InsufficientShares);

    // Рассчитываем сумму токенов к возврату
    let tokens_out = (shares_amount as u128)
        .checked_mul(vault.total_tokens as u128)
        .and_then(|v| v.checked_div(vault.total_shares as u128))
        .and_then(|v| u64::try_from(v).ok())
        .ok_or(VaultError::MathOverflow)?;

    require!(tokens_out > 0, VaultError::WithdrawTooSmall);

    // 1. CPI: сжигаем share-токены с аккаунта пользователя (подписывает сам пользователь)
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.share_mint.to_account_info(),
                from: ctx.accounts.user_share_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        shares_amount,
    )?;

    // 2. CPI: переводим токены из хранилища vault пользователю (подписывает vault PDA)
    let token_mint_key = ctx.accounts.vault_state.token_mint;
    let bump = ctx.accounts.vault_state.bump;
    let seeds = &[
        b"vault".as_ref(),
        token_mint_key.as_ref(),
        &[bump],
    ];
    let signer = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.vault_state.to_account_info(),
            },
            signer,
        ),
        tokens_out,
    )?;

    // 3. Обновляем глобальный баланс vault
    let vault = &mut ctx.accounts.vault_state;
    vault.total_tokens = vault.total_tokens.checked_sub(tokens_out).ok_or(VaultError::MathOverflow)?;
    vault.total_shares = vault.total_shares.checked_sub(shares_amount).ok_or(VaultError::MathOverflow)?;

    // 4. Обновляем баланс в карточке пользователя
    let card = &mut ctx.accounts.user_card;
    card.shares = card.shares.checked_sub(shares_amount).ok_or(VaultError::MathOverflow)?;
    card.deposited = card.deposited.saturating_sub(tokens_out);

    msg!(
        "Withdraw success: burned {} shares -> returned {} tokens (vault: tokens={}, shares={})",
        shares_amount, tokens_out, vault.total_tokens, vault.total_shares
    );
    Ok(())
}
