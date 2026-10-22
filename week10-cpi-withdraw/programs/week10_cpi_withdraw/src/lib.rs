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
pub(crate) use instructions::deposit::{
    __client_accounts_deposit, __cpi_client_accounts_deposit,
};
#[allow(unused_imports)]
pub(crate) use instructions::initialize_vault::{
    __client_accounts_initialize_vault, __cpi_client_accounts_initialize_vault,
};
#[allow(unused_imports)]
pub(crate) use instructions::withdraw::{
    __client_accounts_withdraw, __cpi_client_accounts_withdraw,
};

declare_id!("BZowrhwwupeg34hg8DmxknTZNJ8a7UGS9ZXPeirTQu4Y");

#[program]
pub mod week10_cpi_withdraw {
    use super::*;

    /// Неделя 8: Создать vault для SPL-токена
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        instructions::initialize_vault::handler(ctx)
    }

    /// Неделя 8: Создать карточку пользователя (UserCard PDA)
    pub fn create_user_card(ctx: Context<CreateUserCard>) -> Result<()> {
        instructions::create_user_card::handler(ctx)
    }

    /// Неделя 9: Внести токены в хранилище и выпустить share-токены
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    /// Неделя 10: Сжечь share-токены и вывести базовые токены из хранилища (CPI с PDA signer)
    pub fn withdraw(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, shares)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_withdraw_calculation() {
        let total_shares: u64 = 1_000_000;
        let total_vault_tokens: u64 = 1_500_000; // Vault заработал 50%
        let shares_to_burn: u64 = 500_000;       // Выводим половину своих долей

        let tokens_to_return = (shares_to_burn as u128)
            .checked_mul(total_vault_tokens as u128)
            .unwrap()
            .checked_div(total_shares as u128)
            .unwrap() as u64;

        assert_eq!(tokens_to_return, 750_000); // Получаем половину пула (750k)
    }

    #[test]
    fn test_full_withdraw() {
        let total_shares: u64 = 2_000_000;
        let total_vault_tokens: u64 = 2_000_000;
        let shares_to_burn: u64 = 2_000_000;

        let tokens_to_return = (shares_to_burn as u128)
            .checked_mul(total_vault_tokens as u128)
            .unwrap()
            .checked_div(total_shares as u128)
            .unwrap() as u64;

        assert_eq!(tokens_to_return, 2_000_000);
    }
}
