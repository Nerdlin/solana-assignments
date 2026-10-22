use anchor_lang::prelude::*;

/// Карточка пользователя (User Card PDA) внутри vault.
/// Хранит персональную позицию и учет внесенных средств.
/// PDA seeds: `[b"user_card", vault_state.key().as_ref(), user.key().as_ref()]`
#[account]
#[derive(Default)]
pub struct UserCard {
    /// К какому vault привязана карточка
    pub vault: Pubkey,
    /// Владелец карточки (кошелек пользователя)
    pub owner: Pubkey,
    /// Сколько токенов внес пользователь суммарно
    pub deposited: u64,
    /// Сколько share-токенов числится за пользователем
    pub shares: u64,
    /// Bump сида user_card PDA
    pub bump: u8,
}

impl UserCard {
    pub const LEN: usize = 8 + // discriminator
        32 + // vault
        32 + // owner
        8 +  // deposited
        8 +  // shares
        1;   // bump
}
