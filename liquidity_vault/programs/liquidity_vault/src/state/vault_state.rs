use anchor_lang::prelude::*;

/// Состояние общего хранилища (Liquidity Vault).
/// PDA seeds: `[b"vault", token_mint.key().as_ref()]`
#[account]
#[derive(Default)]
pub struct VaultState {
    /// Администратор vault
    pub admin: Pubkey,
    /// Основной токен хранилища (Token A)
    pub token_mint: Pubkey,
    /// Токен-аккаунт хранилища под управлением PDA
    pub vault_token_account: Pubkey,
    /// Минт share-токенов (квитанций долей)
    pub share_mint: Pubkey,
    /// Всего токенов в vault (on-chain учет)
    pub total_tokens: u64,
    /// Всего выпущено share-токенов
    pub total_shares: u64,
    /// Bump сида vault_state PDA
    pub bump: u8,
}

impl VaultState {
    pub const LEN: usize = 8 + // discriminator
        32 + // admin
        32 + // token_mint
        32 + // vault_token_account
        32 + // share_mint
        8 +  // total_tokens
        8 +  // total_shares
        1;   // bump
}
