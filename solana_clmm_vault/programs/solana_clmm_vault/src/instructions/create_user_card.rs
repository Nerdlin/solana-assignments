use anchor_lang::prelude::*;

use crate::state::{UserCard, VaultState};

/// Неделя 8: Каркас Vault — Карточка пользователя (User Card)
/// У каждого пользователя ровно одна карточка внутри конкретного vault.
/// Seeds: `[b"user_card", vault_state.key().as_ref(), user.key().as_ref()]`
#[derive(Accounts)]
pub struct CreateUserCard<'info> {
    #[account(
        seeds = [b"vault", vault_state.token_mint.as_ref()],
        bump = vault_state.bump,
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        init,
        payer = user,
        space = UserCard::LEN,
        seeds = [b"user_card", vault_state.key().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub user_card: Account<'info, UserCard>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateUserCard>) -> Result<()> {
    let card = &mut ctx.accounts.user_card;
    card.vault = ctx.accounts.vault_state.key();
    card.owner = ctx.accounts.user.key();
    card.deposited = 0;
    card.shares = 0;
    card.bump = ctx.bumps.user_card;

    msg!("User card created for owner: {}", card.owner);
    Ok(())
}
