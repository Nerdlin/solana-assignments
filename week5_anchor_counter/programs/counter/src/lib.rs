use anchor_lang::prelude::*;

// Уникальный идентификатор программы (обновляется после сборки/деплоя)
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod counter {
    use super::*;

    /// Инициализация нового счетчика: задает count = 0 и сохраняет адрес владельца (authority)
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.authority = ctx.accounts.user.key();
        counter.count = 0;
        msg!(" Counter инициализирован! Владелец: {}", counter.authority);
        msg!("Начальное значение: {}", counter.count);
        Ok(())
    }

    /// Инкремент значения счетчика на +1
    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = counter.count.checked_add(1).ok_or(ErrorCode::Overflow)?;
        msg!("➕ Counter увеличен. Новое значение: {}", counter.count);
        Ok(())
    }

    /// Декремент значения счетчика на -1 с проверкой на отрицательное значение
    pub fn decrement(ctx: Context<Decrement>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        require!(counter.count > 0, ErrorCode::Underflow);
        counter.count = counter.count.checked_sub(1).ok_or(ErrorCode::Underflow)?;
        msg!("➖ Counter уменьшен. Новое значение: {}", counter.count);
        Ok(())
    }

    /// Установка конкретного значения (доступно только владельцу счетчика)
    pub fn set_value(ctx: Context<SetValue>, value: u64) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = value;
        msg!("🔄 Значение счетчика установлено владельцем: {}", value);
        Ok(())
    }
}

/// Контекст инструкции initialize: создает аккаунт данных и платит рент
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 8 + 32 // 8 байт дискриминатор Anchor + 8 байт u64 count + 32 байта Pubkey authority
    )]
    pub counter: Account<'info, Counter>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Контекст инструкции increment
#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut)]
    pub counter: Account<'info, Counter>,
}

/// Контекст инструкции decrement
#[derive(Accounts)]
pub struct Decrement<'info> {
    #[account(mut)]
    pub counter: Account<'info, Counter>,
}

/// Контекст инструкции set_value: проверяет, что транзакцию подписал authority
#[derive(Accounts)]
pub struct SetValue<'info> {
    #[account(
        mut,
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub counter: Account<'info, Counter>,

    pub authority: Signer<'info>,
}

/// Структура аккаунта состояния счетчика
#[account]
pub struct Counter {
    pub count: u64,
    pub authority: Pubkey,
}

/// Пользовательские коды ошибок программы
#[error_code]
pub enum ErrorCode {
    #[msg("Счетчик не может быть меньше нуля (Underflow)!")]
    Underflow,
    #[msg("Переполнение значения счетчика (Overflow)!")]
    Overflow,
    #[msg("Действие разрешено только создателю (authority) этого счетчика!")]
    Unauthorized,
}
