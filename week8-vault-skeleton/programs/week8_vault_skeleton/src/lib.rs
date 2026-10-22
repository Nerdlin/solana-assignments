use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

pub use errors::*;
pub use instructions::*;
pub use state::*;

#[allow(unused_imports)]
pub(crate) use instructions::create_user_card::{
    __client_accounts_create_user_card, __cpi_client_accounts_create_user_card,
};
#[allow(unused_imports)]
pub(crate) use instructions::initialize_vault::{
    __client_accounts_initialize_vault, __cpi_client_accounts_initialize_vault,
};

declare_id!("EbojNUfh9Jk6dyZaaQAJWofbdnkvdxfQbeAPq6iWoHAu");

#[program]
pub mod week8_vault_skeleton {
    use super::*;

    /// Неделя 8: Создать vault для SPL-токена
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        instructions::initialize_vault::handler(ctx)
    }

    /// Неделя 8: Создать карточку пользователя (UserCard PDA)
    pub fn create_user_card(ctx: Context<CreateUserCard>) -> Result<()> {
        instructions::create_user_card::handler(ctx)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_state_space() {
        assert_eq!(VaultState::LEN, 8 + 32 + 32 + 32 + 32 + 8 + 8 + 1);
        assert_eq!(VaultState::LEN, 153);
    }

    #[test]
    fn test_user_card_space() {
        assert_eq!(UserCard::LEN, 8 + 32 + 32 + 8 + 8 + 1);
        assert_eq!(UserCard::LEN, 89);
    }
}
