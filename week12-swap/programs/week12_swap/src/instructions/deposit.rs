use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

use crate::errors::VaultError;
use crate::state::{UserCard, VaultState};

/// Неделя 9: Депозит и share-токены
/// Пользователь переводит токены в vault_token_account, а взамен получает share-токены.
/// Расчет:
///   Первый депозит:       shares = amount                         (1:1)
///   Последующие депозиты: shares = amount × total_shares / total_tokens
#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault_state.token_mint.as_ref()],
        bump = vault_state.bump,
    )]
    pub vault_state: Account<'info, VaultState>,

    /// Карточка пользователя — депозит возможен только при наличии карточки
    #[account(
        mut,
        seeds = [b"user_card", vault_state.key().as_ref(), user.key().as_ref()],
        bump = user_card.bump,
    )]
    pub user_card: Account<'info, UserCard>,

    /// Токен-аккаунт хранилища vault
    #[account(
        mut,
        seeds = [b"vault_tokens", vault_state.token_mint.as_ref()],
        bump,
        token::mint = vault_state.token_mint,
        token::authority = vault_state,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Минт share-токенов
    #[account(
        mut,
        seeds = [b"share_mint", vault_state.token_mint.as_ref()],
        bump,
        mint::authority = vault_state,
    )]
    pub share_mint: Account<'info, Mint>,

    /// Токен-аккаунт пользователя (источник токенов)
    #[account(
        mut,
        token::mint = vault_state.token_mint,
        token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// Share-аккаунт пользователя (получатель shares)
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

pub fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount > 0, VaultError::ZeroAmount);

    let vault = &ctx.accounts.vault_state;

    // Рассчитываем количество shares
    let shares = if vault.total_shares == 0 || vault.total_tokens == 0 {
        amount // первый депозит: 1 share = 1 токен
    } else {
        (amount as u128)
            .checked_mul(vault.total_shares as u128)
            .and_then(|v| v.checked_div(vault.total_tokens as u128))
            .and_then(|v| u64::try_from(v).ok())
            .ok_or(VaultError::MathOverflow)?
    };

    require!(shares > 0, VaultError::SharesTooSmall);

    // 1. CPI: переводим токены пользователя в хранилище vault (подписывает пользователь)
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    )?;

    // 2. CPI: чеканим share-токены на кошелек пользователя (подписывает vault PDA)
    let token_mint_key = ctx.accounts.vault_state.token_mint;
    let bump = ctx.accounts.vault_state.bump;
    let seeds = &[
        b"vault".as_ref(),
        token_mint_key.as_ref(),
        &[bump],
    ];
    let signer = &[&seeds[..]];

    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.share_mint.to_account_info(),
                to: ctx.accounts.user_share_account.to_account_info(),
                authority: ctx.accounts.vault_state.to_account_info(),
            },
            signer,
        ),
        shares,
    )?;

    // 3. Обновляем глобальный учет vault
    let vault = &mut ctx.accounts.vault_state;
    vault.total_tokens = vault.total_tokens.checked_add(amount).ok_or(VaultError::MathOverflow)?;
    vault.total_shares = vault.total_shares.checked_add(shares).ok_or(VaultError::MathOverflow)?;

    // 4. Обновляем личную карточку пользователя
    let card = &mut ctx.accounts.user_card;
    card.deposited = card.deposited.checked_add(amount).ok_or(VaultError::MathOverflow)?;
    card.shares = card.shares.checked_add(shares).ok_or(VaultError::MathOverflow)?;

    msg!(
        "Deposit success: {} tokens -> {} shares (vault: tokens={}, shares={})",
        amount, shares, vault.total_tokens, vault.total_shares
    );
    Ok(())
}
