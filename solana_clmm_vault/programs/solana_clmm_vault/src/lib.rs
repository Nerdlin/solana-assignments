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


declare_id!("EbojNUfh9Jk6dyZaaQAJWofbdnkvdxfQbeAPq6iWoHAu");

#[program]
pub mod solana_clmm_vault {
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

    /// Неделя 10: Вернуть share-токены (сжечь) и вывести токены через CPI
    pub fn withdraw(ctx: Context<Withdraw>, shares_amount: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, shares_amount)
    }

    /// Неделя 12: Обмен токенов через пул Raydium CLMM с защитой от проскальзывания
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
    fn test_vault_state_space() {
        assert_eq!(VaultState::LEN, 8 + 32 + 32 + 32 + 32 + 8 + 8 + 1);
        assert_eq!(VaultState::LEN, 153);
    }

    #[test]
    fn test_user_card_space() {
        assert_eq!(UserCard::LEN, 8 + 32 + 32 + 8 + 8 + 1);
        assert_eq!(UserCard::LEN, 89);
    }

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
    fn test_proportional_deposit_and_withdraw_with_yield() {
        // Начальный депозит: 1 000 000 токенов -> 1 000 000 shares
        let mut total_tokens: u64 = 1_000_000;
        let mut total_shares: u64 = 1_000_000;

        // В хранилище накопился yield (комиссии от пула ликвидности): 200 000 токенов
        total_tokens += 200_000; // теперь 1 200 000 токенов на 1 000 000 shares (1 share = 1.2 токена)

        // Второй пользователь вносит 600 000 токенов
        let deposit_amount_2: u64 = 600_000;
        let shares_2 = (deposit_amount_2 as u128)
            .checked_mul(total_shares as u128)
            .unwrap()
            .checked_div(total_tokens as u128)
            .unwrap() as u64;

        // 600 000 * 1 000 000 / 1 200 000 = 500 000 shares
        assert_eq!(shares_2, 500_000);

        total_tokens += deposit_amount_2; // 1 800 000 токенов
        total_shares += shares_2;         // 1 500 000 shares

        // Второй пользователь выводит свои 500 000 shares
        let withdraw_shares: u64 = 500_000;
        let tokens_out = (withdraw_shares as u128)
            .checked_mul(total_tokens as u128)
            .unwrap()
            .checked_div(total_shares as u128)
            .unwrap() as u64;

        // Получает ровно свои 600 000 токенов обратно
        assert_eq!(tokens_out, 600_000);

        // Первый пользователь выводит свои 1 000 000 shares
        let remaining_tokens = total_tokens - tokens_out; // 1 200 000
        let remaining_shares = total_shares - withdraw_shares; // 1 000 000
        let tokens_out_1 = (1_000_000u128)
            .checked_mul(remaining_tokens as u128)
            .unwrap()
            .checked_div(remaining_shares as u128)
            .unwrap() as u64;

        // Первый пользователь получает 1 200 000 токенов (свой депозит + весь накопленный yield!)
        assert_eq!(tokens_out_1, 1_200_000);
    }

    #[test]
    fn test_tick_range_validation() {
        let tick_spacing = 60;
        let tick_lower = -120;
        let tick_upper = 120;

        assert!(tick_lower < tick_upper);
        assert_eq!(tick_lower % tick_spacing, 0);
        assert_eq!(tick_upper % tick_spacing, 0);
    }
}
