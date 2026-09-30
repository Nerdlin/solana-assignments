# Неделя 5: Anchor Framework

## Задание
> Создать Counter Program и взаимодействовать с ней через client.

---

## 🛠 Что реализовано в смарт-контракте (Anchor):
Программа написана с использованием индустриального фреймворка **Anchor** ([programs/counter/src/lib.rs](file:///c:/MI/пары/Startup/week5_anchor_counter/programs/counter/src/lib.rs)):

1. **Инструкции**:
   - `initialize`: аллокация памяти (8 байт дискриминатор + 8 байт u64 count + 32 байта authority), списание рента с плательщика и инициализация.
   - `increment`: безопасное увеличение счетчика `checked_add` с защитой от `Overflow`.
   - `decrement`: уменьшение счетчика с кастомной валидацией `require!(counter.count > 0, ErrorCode::Underflow)`.
   - `set_value`: установка конкретного значения со строгим ограничением прав `has_one = authority @ ErrorCode::Unauthorized`.
2. **Безопасность**:
   - Автоматическая проверка дискриминаторов типов аккаунтов.
   - Защита от переполнения и контроль прав доступа через ограничения `#[account(...)]`.

---

## 🚀 Сборка и деплой

### Вариант 1: В браузере через Solana Playground (Рекомендуется)
1. Откройте [https://beta.solpg.io](https://beta.solpg.io).
2. Нажмите **Create a new project** -> Выберите фреймворк **Anchor (Rust)** -> Назовите `anchor_counter`.
3. Замените код `src/lib.rs` в Playground на код из нашего файла [programs/counter/src/lib.rs](file:///c:/MI/пары/Startup/week5_anchor_counter/programs/counter/src/lib.rs).
4. Нажмите **Build** -> **Deploy**.
5. Скопируйте полученный `Program ID` и вставьте его при запуске клиента.

### Вариант 2: Локально через Anchor CLI
```bash
cd week5_anchor_counter
anchor build
anchor test
anchor deploy --provider.cluster devnet
```

---

## 💻 Взаимодействие через клиент (TypeScript)
В директории [client/](file:///c:/MI/пары/Startup/week5_anchor_counter/client) подготовлен скрипт взаимодействия:
```bash
cd week5_anchor_counter/client
npm install
npx ts-node interact.ts <ВАШ_PROGRAM_ID>
```
Скрипт использует типизированный интерфейс IDL, производит отправку транзакций на Devnet и читает данные аккаунта из блокчейна в реальном времени.
