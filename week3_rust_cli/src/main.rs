mod error;
mod instruction;
mod processor;
mod state;

use instruction::ProgramInstruction;
use processor::Processor;
use state::{Account, CounterState, Pubkey};
use std::env;

fn print_banner() {
    println!("===============================================================");
    println!("     SOLANA RUST CLI SIMULATOR (Week 3 Assignment)");
    println!("===============================================================");
    println!("Демонстрация ключевых концепций Solana-разработки на Rust:");
    println!(" * Borsh (де)сериализация инструкций и состояний");
    println!(" * Модель данных Solana (Account, Pubkey, Lamports, Signers)");
    println!(" * Обработка ошибок (Result, ProgramError, pattern matching)");
    println!(" * Заимствования и мутабельные срезы (&mut [Account])");
    println!("===============================================================\n");
}

fn print_help() {
    println!("Использование:");
    println!("  cargo run -- demo                 - Запуск полной интерактивной демонстрации");
    println!("  cargo run -- test-counter <val>   - Тест сериализации и инкремента счетчика");
    println!("  cargo run -- test-profile <u,b>   - Тест профиля пользователя");
    println!("  cargo run -- test-transfer <amt>  - Тест перевода с проверкой подписи и баланса");
    println!("  cargo run -- test-errors          - Демонстрация отлова ошибок (недостаток средств, чужой ID)");
}

fn run_full_demo() {
    println!("[1] Создание виртуальной среды Solana Runtime...");
    let program_id = Pubkey::from_str_simple("my_counter_program_id_11111111");
    let dimash_pubkey = Pubkey::from_str_simple("dimash_wallet_authority_keypair");
    let counter_pubkey = Pubkey::from_str_simple("counter_account_pda_or_key");
    let timur_pubkey = Pubkey::from_str_simple("timur_wallet_recipient_keypair");

    println!("  Program ID:       {}", program_id);
    println!("  Димаш (Signer):   {}", dimash_pubkey);
    println!("  Counter Account:  {}", counter_pubkey);
    println!("  Тимур Account:    {}\n", timur_pubkey);

    let mut dimash_account = Account::new(dimash_pubkey, 5_000_000_000, Pubkey::from_str_simple("system_program"));
    dimash_account.is_signer = true;

    let mut counter_account = Account::new(counter_pubkey, 2_000_000, program_id);

    let mut timur_account = Account::new(timur_pubkey, 1_000_000_000, Pubkey::from_str_simple("system_program"));

    println!("[2] Сериализация инструкции 'InitializeCounter {{ initial_count: 42 }}' через Borsh...");
    let init_instr = ProgramInstruction::InitializeCounter { initial_count: 42 };
    let init_bytes = init_instr.pack();
    println!("  Сырые байты инструкции: {:02x?}", init_bytes);

    println!("\n[3] Вызов процессора (эмуляция исполнения в Solana VM)...");
    let mut accounts = vec![dimash_account.clone(), counter_account.clone()];
    Processor::process(&program_id, &mut accounts, &init_bytes).expect("Init failed");
    counter_account = accounts[1].clone();

    println!("\n[4] Сериализация и вызов инкремента (+15)...");
    let inc_instr = ProgramInstruction::Increment { amount: 15 };
    let inc_bytes = inc_instr.pack();
    let mut accounts = vec![counter_account.clone()];
    Processor::process(&program_id, &mut accounts, &inc_bytes).expect("Increment failed");
    counter_account = accounts[0].clone();

    let decoded_counter: CounterState = borsh::from_slice(&counter_account.data).unwrap();
    println!("  Десериализованное состояние счетчика: count = {}, authority = {}", decoded_counter.count, decoded_counter.authority);

    println!("\n[5] Тестирование перевода 1.5 SOL (1_500_000_000 лампортов) от Димаша к Тимуру...");
    let transfer_instr = ProgramInstruction::TransferLamports { lamports: 1_500_000_000 };
    let transfer_bytes = transfer_instr.pack();
    let mut accounts = vec![dimash_account.clone(), timur_account.clone()];
    Processor::process(&program_id, &mut accounts, &transfer_bytes).expect("Transfer failed");
    dimash_account = accounts[0].clone();
    timur_account = accounts[1].clone();

    println!("\n[6] Проверка отлова ошибок:");
    println!("  Попытка перевести больше, чем есть на балансе...");
    let overdraft_instr = ProgramInstruction::TransferLamports { lamports: 999_000_000_000 };
    let mut accounts = vec![dimash_account.clone(), timur_account.clone()];
    match Processor::process(&program_id, &mut accounts, &overdraft_instr.pack()) {
        Ok(_) => println!("  Неожиданный успех!"),
        Err(e) => println!("  [OK] Успешно поймана ошибка: {}", e),
    }

    println!("\n  Попытка выполнить операцию без подписи (is_signer = false)...");
    dimash_account.is_signer = false;
    let mut accounts = vec![dimash_account.clone(), timur_account.clone()];
    match Processor::process(&program_id, &mut accounts, &transfer_bytes) {
        Ok(_) => println!("  Неожиданный успех!"),
        Err(e) => println!("  [OK] Успешно поймана ошибка: {}", e),
    }

    println!("\n[7] Завершено успешно! Все конструкции Solana проверены.");
}

fn main() {
    print_banner();
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        println!("Параметры не указаны, запуск демонстрационного сценария по умолчанию:\n");
        run_full_demo();
        println!("\n(Для просмотра доступных флагов запустите: cargo run -- --help)");
        return;
    }

    match args[1].as_str() {
        "demo" => run_full_demo(),
        "test-counter" => {
            let val = args.get(2).and_then(|s| s.parse::<u64>().ok()).unwrap_or(10);
            let program_id = Pubkey::from_str_simple("my_counter_program");
            let mut counter_account = Account::new(Pubkey::from_str_simple("cnt_acc"), 0, program_id);
            let init_state = CounterState { count: val, authority: Pubkey::from_str_simple("admin"), is_initialized: true };
            counter_account.data = borsh::to_vec(&init_state).unwrap();
            let mut accounts = vec![counter_account];
            let instr = ProgramInstruction::Increment { amount: 5 }.pack();
            Processor::process(&program_id, &mut accounts, &instr).unwrap();
        }
        "test-profile" => {
            let username = args.get(2).cloned().unwrap_or_else(|| "solana_dev".to_string());
            let bio = args.get(3).cloned().unwrap_or_else(|| "Building on Solana".to_string());
            let program_id = Pubkey::from_str_simple("profile_program");
            let mut dimash = Account::new(Pubkey::from_str_simple("dimash"), 1000, Pubkey::from_str_simple("sys"));
            dimash.is_signer = true;
            let profile = Account::new(Pubkey::from_str_simple("dimash_profile"), 0, program_id);
            let mut accounts = vec![dimash, profile];
            let instr = ProgramInstruction::UpdateProfile { username, bio }.pack();
            Processor::process(&program_id, &mut accounts, &instr).unwrap();
        }
        "test-errors" => {
            let program_id = Pubkey::from_str_simple("prog");
            let bad_data = vec![255, 255, 255]; // невалидные байты
            let mut accs = vec![];
            match Processor::process(&program_id, &mut accs, &bad_data) {
                Ok(_) => {},
                Err(e) => println!("Тест Borsh error: {}", e),
            }
        }
        "--help" | "-h" | "help" => print_help(),
        other => {
            println!("Неизвестный параметр: '{}'", other);
            print_help();
        }
    }
}
