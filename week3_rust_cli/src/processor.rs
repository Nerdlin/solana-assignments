use crate::error::ProgramError;
use crate::instruction::ProgramInstruction;
use crate::state::{Account, CounterState, Pubkey, UserProfileState};

/// Процессор инструкций: полностью повторяет сигнатуру и логику работы Solana entrypoint
pub struct Processor;

impl Processor {
    /// Главная точка входа: принимает Program ID, список аккаунтов и сырые байты инструкции
    pub fn process(
        program_id: &Pubkey,
        accounts: &mut [Account],
        instruction_data: &[u8],
    ) -> Result<(), ProgramError> {
        println!("  -> Solana VM: десериализация инструкции ({} байт)...", instruction_data.len());
        let instruction = ProgramInstruction::unpack(instruction_data)?;

        match instruction {
            ProgramInstruction::InitializeCounter { initial_count } => {
                Self::process_init_counter(program_id, accounts, initial_count)
            }
            ProgramInstruction::Increment { amount } => {
                Self::process_increment(program_id, accounts, amount)
            }
            ProgramInstruction::Decrement { amount } => {
                Self::process_decrement(program_id, accounts, amount)
            }
            ProgramInstruction::UpdateProfile { username, bio } => {
                Self::process_update_profile(program_id, accounts, username, bio)
            }
            ProgramInstruction::TransferLamports { lamports } => {
                Self::process_transfer(accounts, lamports)
            }
        }
    }

    fn process_init_counter(
        program_id: &Pubkey,
        accounts: &mut [Account],
        initial_count: u64,
    ) -> Result<(), ProgramError> {
        if accounts.len() < 2 {
            return Err(ProgramError::Custom(101)); // не хватает аккаунтов
        }
        let (first, rest) = accounts.split_at_mut(1);
        let authority = &first[0];
        if !authority.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        let counter_account = &mut rest[0];
        if &counter_account.owner != program_id {
            return Err(ProgramError::IncorrectProgramId);
        }

        // Проверяем, не был ли аккаунт уже инициализирован
        if let Ok(existing) = borsh::from_slice::<CounterState>(&counter_account.data) {
            if existing.is_initialized {
                return Err(ProgramError::AccountAlreadyInitialized);
            }
        }

        let state = CounterState {
            count: initial_count,
            authority: authority.key,
            is_initialized: true,
        };

        counter_account.data = borsh::to_vec(&state).map_err(|_| ProgramError::InvalidInstructionData)?;
        println!("  [SUCCESS] Счетчик успешно инициализирован: значение = {}, authority = {}", initial_count, authority.key);
        Ok(())
    }

    fn process_increment(
        program_id: &Pubkey,
        accounts: &mut [Account],
        amount: u64,
    ) -> Result<(), ProgramError> {
        if accounts.is_empty() {
            return Err(ProgramError::Custom(102));
        }
        let counter_account = &mut accounts[0];
        if &counter_account.owner != program_id {
            return Err(ProgramError::IncorrectProgramId);
        }

        let mut state = borsh::from_slice::<CounterState>(&counter_account.data)
            .map_err(|_| ProgramError::InvalidInstructionData)?;

        state.count = state.count.checked_add(amount).ok_or(ProgramError::ArithmeticOverflow)?;
        counter_account.data = borsh::to_vec(&state).map_err(|_| ProgramError::InvalidInstructionData)?;

        println!("  [SUCCESS] Счетчик увеличен на +{}. Новое значение: {}", amount, state.count);
        Ok(())
    }

    fn process_decrement(
        program_id: &Pubkey,
        accounts: &mut [Account],
        amount: u64,
    ) -> Result<(), ProgramError> {
        if accounts.is_empty() {
            return Err(ProgramError::Custom(102));
        }
        let counter_account = &mut accounts[0];
        if &counter_account.owner != program_id {
            return Err(ProgramError::IncorrectProgramId);
        }

        let mut state = borsh::from_slice::<CounterState>(&counter_account.data)
            .map_err(|_| ProgramError::InvalidInstructionData)?;

        state.count = state.count.checked_sub(amount).ok_or(ProgramError::ArithmeticOverflow)?;
        counter_account.data = borsh::to_vec(&state).map_err(|_| ProgramError::InvalidInstructionData)?;

        println!("  [SUCCESS] Счетчик уменьшен на -{}. Новое значение: {}", amount, state.count);
        Ok(())
    }

    fn process_update_profile(
        program_id: &Pubkey,
        accounts: &mut [Account],
        username: String,
        bio: String,
    ) -> Result<(), ProgramError> {
        if accounts.len() < 2 {
            return Err(ProgramError::Custom(103));
        }
        let (first, rest) = accounts.split_at_mut(1);
        let authority = &first[0];
        if !authority.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        let profile_account = &mut rest[0];
        if &profile_account.owner != program_id {
            return Err(ProgramError::IncorrectProgramId);
        }

        let profile = UserProfileState {
            authority: authority.key,
            username: username.clone(),
            bio: bio.clone(),
            score: 100,
        };

        profile_account.data = borsh::to_vec(&profile).map_err(|_| ProgramError::InvalidInstructionData)?;
        println!("  [SUCCESS] Профиль создан/обновлен: '{}', bio: '{}'", username, bio);
        Ok(())
    }

    fn process_transfer(accounts: &mut [Account], lamports: u64) -> Result<(), ProgramError> {
        if accounts.len() < 2 {
            return Err(ProgramError::Custom(104));
        }

        // Заимствование двух элементов массива по индексам
        let (from_slice, to_slice) = accounts.split_at_mut(1);
        let from_account = &mut from_slice[0];
        let to_account = &mut to_slice[0];

        if !from_account.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        if from_account.lamports < lamports {
            return Err(ProgramError::InsufficientFunds);
        }

        from_account.lamports = from_account
            .lamports
            .checked_sub(lamports)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        to_account.lamports = to_account
            .lamports
            .checked_add(lamports)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        println!(
            "  [SUCCESS] Перевод {} лампортов с {} на {}. Баланс отправителя: {}",
            lamports, from_account.key, to_account.key, from_account.lamports
        );
        Ok(())
    }
}
