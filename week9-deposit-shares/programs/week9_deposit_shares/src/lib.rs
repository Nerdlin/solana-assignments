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

declare_id!("FMhz6CM3xLvkcyM565j2EFzKTXrJzC1QdoyKDGud3pft");

#[program]
pub mod week9_deposit_shares {
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
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_first_deposit_share_calculation() {
        let total_shares: u64 = 0;
        let total_vault_tokens: u64 = 0;
        let deposit_amount: u64 = 1_000_000;

        let shares_to_mint = if total_shares == 0 || total_vault_tokens == 0 {
            deposit_amount
        } else {
            (deposit_amount as u128)
                .checked_mul(total_shares as u128)
                .unwrap()
                .checked_div(total_vault_tokens as u128)
                .unwrap() as u64
        };

        assert_eq!(shares_to_mint, 1_000_000);
    }

    #[test]
    fn test_proportional_deposit() {
        // Баланс пула: 1 100 токенов, выпущено 1 000 shares
        let total_tokens: u64 = 1_100;
        let total_shares: u64 = 1_000;
        let deposit_amount: u64 = 110;

        let shares = (deposit_amount as u128)
            .checked_mul(total_shares as u128)
            .unwrap()
            .checked_div(total_tokens as u128)
            .unwrap() as u64;

        // 110 * 1000 / 1100 = ровно 100 shares
        assert_eq!(shares, 100);
    }
}
