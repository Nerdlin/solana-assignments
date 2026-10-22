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
pub(crate) use instructions::swap_raydium::{
    __client_accounts_swap_raydium, __cpi_client_accounts_swap_raydium,
};
#[allow(unused_imports)]
pub(crate) use instructions::withdraw::{
    __client_accounts_withdraw, __cpi_client_accounts_withdraw,
};

declare_id!("AWv836vYTsnztNVrtRoRucS3jmEq5nUitqUc4gxvLXbe");

#[program]
pub mod week12_swap {
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

    /// Неделя 10: Сжечь share-токены и вывести базовые токены из хранилища
    pub fn withdraw(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, shares)
    }

    /// Неделя 12: Совершить своп через Raydium CLMM (CPI в raydium-clmm-cpi)
    pub fn swap_raydium<'a, 'b, 'c: 'info, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, SwapRaydium<'info>>,
        amount_in: u64,
        min_amount_out: u64,
    ) -> Result<()> {
        instructions::swap_raydium::handler(ctx, amount_in, min_amount_out)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_swap_slippage_calculation() {
        let expected_output: u64 = 1_000_000;
        let slippage_bps: u64 = 50; // 0.5%
        let min_output = expected_output * (10_000 - slippage_bps) / 10_000;
        assert_eq!(min_output, 995_000);
    }
}
