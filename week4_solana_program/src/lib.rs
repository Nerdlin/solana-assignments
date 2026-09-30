use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

/// Состояние аккаунта, хранящего данные программы (счетчик обращений)
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct GreetingAccount {
    /// Количество раз, которое программа была вызвана
    pub counter: u32,
    /// Сообщение или статус
    pub message: String,
}

// Регистрация точки входа программы в Solana runtime
entrypoint!(process_instruction);

/// Главная функция исполнения инструкций программы
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("====================================================");
    msg!("🚀 Первая Solana Program запущена на Devnet!");
    msg!("Program ID: {}", program_id);

    // Итератор по переданным аккаунтам
    let accounts_iter = &mut accounts.iter();

    // Первый аккаунт — аккаунт хранилища данных (нашего счетчика)
    let account = next_account_info(accounts_iter)?;

    // Проверяем, что владельцем аккаунта является именно эта программа.
    // Если владелец другой, программа не имеет права изменять данные аккаунта!
    if account.owner != program_id {
        msg!("Ошибка: Аккаунт {} не принадлежит программе {}", account.key, program_id);
        return Err(ProgramError::IncorrectProgramId);
    }

    // Десериализуем данные из байтового среза аккаунта
    let mut greeting_account = GreetingAccount::try_from_slice(&account.data.borrow())
        .unwrap_or(GreetingAccount {
            counter: 0,
            message: "Hello from Solana Devnet!".to_string(),
        });

    // Инкрементируем счетчик
    greeting_account.counter = greeting_account.counter.saturating_add(1);

    // Если клиент передал кастомное сообщение в instruction_data, читаем его
    if !instruction_data.is_empty() {
        if let Ok(custom_msg) = String::from_utf8(instruction_data.to_vec()) {
            msg!("Получено кастомное сообщение: '{}'", custom_msg);
            greeting_account.message = custom_msg;
        }
    }

    // Сериализуем обновленное состояние обратно в буфер аккаунта
    greeting_account.serialize(&mut &mut account.data.borrow_mut()[..])?;

    msg!("Успех! Счетчик обращений увеличен: {}", greeting_account.counter);
    msg!("Текущее сообщение: {}", greeting_account.message);
    msg!("====================================================");

    Ok(())
}
