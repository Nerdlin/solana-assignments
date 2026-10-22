use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

pub use errors::*;
pub use instructions::*;
pub use state::*;

#[allow(unused_imports)]
pub(crate) use instructions::close_raydium_position::{
    __client_accounts_close_raydium_position, __cpi_client_accounts_close_raydium_position,
};
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
pub(crate) use instructions::open_raydium_position::{
    __client_accounts_open_raydium_position, __cpi_client_accounts_open_raydium_position,
};
#[allow(unused_imports)]
pub(crate) use instructions::swap_raydium::{
    __client_accounts_swap_raydium, __cpi_client_accounts_swap_raydium,
};
#[allow(unused_imports)]
pub(crate) use instructions::withdraw::{
    __client_accounts_withdraw, __cpi_client_accounts_withdraw,
};

declare_id!("AVXVhopnmJAHyq5LnzXNKuXosL3Nvt8K1kFxYU9VYYj7");

#[program]
pub mod week13_clmm_position {
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

    /// Неделя 12: Обмен токенов через пул Raydium CLMM
    pub fn swap_raydium<'a, 'b, 'c: 'info, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, SwapRaydium<'info>>,
        amount_in: u64,
        min_amount_out: u64,
    ) -> Result<()> {
        instructions::swap_raydium::handler(ctx, amount_in, min_amount_out)
    }

    /// Неделя 13: Открыть позицию концентрированной ликвидности в Raydium CLMM
    pub fn open_raydium_position<'a, 'b, 'c: 'info, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, OpenRaydiumPosition<'info>>,
        tick_lower_index: i32,
        tick_upper_index: i32,
        tick_array_lower_start_index: i32,
        tick_array_upper_start_index: i32,
        liquidity: u128,
        amount_0_max: u64,
        amount_1_max: u64,
    ) -> Result<()> {
        instructions::open_raydium_position::handler(
            ctx,
            tick_lower_index,
            tick_upper_index,
            tick_array_lower_start_index,
            tick_array_upper_start_index,
            liquidity,
            amount_0_max,
            amount_1_max,
        )
    }

    /// Неделя 13: Собрать комиссии и закрыть позицию в Raydium CLMM
    pub fn close_raydium_position<'a, 'b, 'c: 'info, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, CloseRaydiumPosition<'info>>,
        amount_0_min: u64,
        amount_1_min: u64,
    ) -> Result<()> {
        instructions::close_raydium_position::handler(ctx, amount_0_min, amount_1_min)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_impermanent_loss_ratio() {
        // Отношение цен k = P_new / P_old = 1.25 (+25% рост цены одного токена)
        // IL = 2 * sqrt(k) / (1 + k) - 1
        let k = 1.25f64;
        let il = 2.0 * k.sqrt() / (1.0 + k) - 1.0;
        assert!((il.abs() - 0.006).abs() < 0.001); // ~0.6% IL
    }

    #[test]
    fn test_vault_and_card_lens() {
        assert_eq!(VaultState::LEN, 153);
        assert_eq!(UserCard::LEN, 89);
    }
}
