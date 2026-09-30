# Неделя 7: SPL Tokens и Token Extensions

## Задание
> Создать собственный токен: выпуск, transfer, metadata и взаимодействие через client.

---

## 🪙 Архитектура SPL Token в Solana
В Solana токены не пишутся каждый раз как отдельный смарт-контракт (в отличие от ERC-20 в Ethereum). Вместо этого в сети есть глобальная программа **SPL Token Program** (и **Token-2022**), а каждый пользователь создает:
1. **Mint Account** — аккаунт самого токена, хранящий общую эмиссию (`supply`), количество десятичных знаков (`decimals`), а также публичные ключи `mintAuthority` и `freezeAuthority`.
2. **Associated Token Account (ATA)** — детерминированный аккаунт-хранилище конкретного токена для конкретного кошелька (`PDA` от адреса кошелька, адреса токена и SPL Token Program).
3. **Metadata Account (Metaplex / Token Extensions)** — аккаунт с описанием токена (Name, Symbol, URI логотипа).

---

## 🚀 Быстрый запуск

Установите зависимости и запустите полный цикл в один клик:
```bash
cd week7_spl_tokens
npm install
npm start
```

Скрипт `run_all.ts` автоматически:
1. Запросит Airdrop тестовых SOL на Devnet.
2. Создаст аккаунт токена (Mint).
3. Создаст Associated Token Account (ATA).
4. Отчеканит 50,000 токенов (MintTo).
5. Создаст второй кошелек и выполнит перевод 1,500 токенов (Transfer).
6. Запросит ончейн-состояние и выведет ссылки на транзакции в **Solana Explorer**.

---

## 🛠 Пошаговый запуск отдельных скриптов
Вы также можете запускать каждый этап отдельно:
```bash
# 1. Создать аккаунт токена (Mint)
npm run create-mint

# 2. Добавить ончейн-метаданные Metaplex (Name, Symbol, Logo URI)
npm run metadata

# 3. Выпустить токены на баланс (Mint)
npm run mint

# 4. Перевести токены другому пользователю (Transfer)
npm run transfer

# 5. Проверить балансы и supply в блокчейне
npm run inspect
```
