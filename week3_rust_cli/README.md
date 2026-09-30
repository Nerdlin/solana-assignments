# Неделя 3: Rust для Solana-разработчика

## Задание
> Создать небольшую CLI-программу на Rust с использованием конструкций, которые понадобятся в Solana-разработке.

---

## 💡 Использованные концепции Solana в Rust

В данной программе реализована эмуляция виртуальной машины Solana (SVM) и ключевых архитектурных механизмов:

1. **Borsh-сериализация (`BorshSerialize`, `BorshDeserialize`)**:
   - В отличие от JSON, в блокчейне Solana стандарт де-факто — бинарная компактная сериализация Borsh.
   - В `src/instruction.rs` и `src/state.rs` структуры и енумы выводят `#[derive(BorshSerialize, BorshDeserialize)]`.
2. **Модель данных Solana**:
   - `Account`: адрес (`Pubkey`), лампорты (`lamports`), буфер данных (`data: Vec<u8>`), владелец (`owner`), флаги подписи (`is_signer`) и модификации (`is_writable`).
   - `Pubkey`: 32-байтный публичный ключ аккаунта.
3. **Обработка ошибок и контроль типов**:
   - Перечисление `ProgramError` (`MissingRequiredSignature`, `InsufficientFunds`, `InvalidInstructionData`, `ArithmeticOverflow`, `IncorrectProgramId`).
   - Использование `Result<(), ProgramError>`, безопасных математических методов (`checked_add`, `checked_sub`) во избежание эксплойтов переполнения в смарт-контрактах.
4. **Процессор инструкций (`entrypoint`)**:
   - `Processor::process(&Pubkey, &mut [Account], &[u8])`: точная сигнатура точки входа нативных программ Solana.
   - Десериализация байтов в перечисление `ProgramInstruction` с использованием `match`.
5. **Мутабельные срезы и заимствования**:
   - `accounts.split_at_mut(1)` для одновременного безопасного изменения балансов двух аккаунтов без нарушения правил заимствования компилятора Rust (Borrow Checker).

---

## 🚀 Запуск и проверка

Убедитесь, что установлен Rust (через `rustup`):
```bash
cd week3_rust_cli

# 1. Запуск полной интерактивной демонстрации
cargo run -- demo

# 2. Тестирование работы со счетчиком
cargo run -- test-counter 50

# 3. Тестирование работы с профилем пользователя
cargo run -- test-profile "solana_builder" "Fullstack Web3 Dev"

# 4. Проверка обработки ошибок (Borsh, валидация подписи)
cargo run -- test-errors
```

---

## 📂 Структура файлов
- [src/error.rs](file:///c:/MI/пары/Startup/week3_rust_cli/src/error.rs) — Ошибки программы (`ProgramError`)
- [src/state.rs](file:///c:/MI/пары/Startup/week3_rust_cli/src/state.rs) — Модели аккаунтов, публичных ключей и состояний
- [src/instruction.rs](file:///c:/MI/пары/Startup/week3_rust_cli/src/instruction.rs) — Инструкции программы с Borsh pack/unpack
- [src/processor.rs](file:///c:/MI/пары/Startup/week3_rust_cli/src/processor.rs) — Логика исполнения инструкций (эмуляция Solana runtime)
- [src/main.rs](file:///c:/MI/пары/Startup/week3_rust_cli/src/main.rs) — CLI интерфейс и тесты
