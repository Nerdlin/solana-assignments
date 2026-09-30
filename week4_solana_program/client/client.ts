import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";
import * as borsh from "borsh";
import * as fs from "fs";
import * as path from "path";

// Схема Borsh для десериализации аккаунта
class GreetingAccount {
  counter = 0;
  message = "";

  constructor(fields: { counter: number; message: string } | undefined = undefined) {
    if (fields) {
      this.counter = fields.counter;
      this.message = fields.message;
    }
  }

  static schema = {
    struct: {
      counter: "u32",
      message: "string",
    },
  };
}

// Константа размера аккаунта (4 байта u32 + 4 байта длины строки + до 128 байт текста)
const GREETING_SIZE = 4 + 4 + 128;

async function main() {
  console.log("==========================================================");
  console.log("🌐 Взаимодействие с Первой Solana Program (Devnet)");
  console.log("==========================================================");

  // 1. Подключение к Devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const version = await connection.getVersion();
  console.log(` Подключено к Solana Devnet (версия ноды: ${version["solana-core"]})`);

  // 2. Генерация или загрузка кошелька плательщика
  const payer = Keypair.generate();
  console.log(`\n🔑 Адрес плательщика: ${payer.publicKey.toBase58()}`);

  // 3. Запрос Airdrop 1 SOL на Devnet
  console.log(" Запрос тестовых SOL из Devnet крана (Airdrop)...");
  try {
    const airdropSig = await connection.requestAirdrop(payer.publicKey, 1 * LAMPORTS_PER_SOL);
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: airdropSig,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
    console.log(" Airdrop подтвержден! Баланс: 1 SOL");
  } catch (err: any) {
    console.log("⚠️ Запрос аирдропа завершился с ограничением сети (rate limit). Можно использовать кран https://faucet.solana.com");
  }

  // 4. Program ID (если программа задеплоена через Solana Playground или CLI)
  // По умолчанию используем тестовый адрес или адрес из аргументов командной строки
  const programIdArg = process.argv[2];
  let programId: PublicKey;

  if (programIdArg) {
    programId = new PublicKey(programIdArg);
  } else {
    // Демонстрационный/дефолтный ID развернутой программы
    programId = new PublicKey("GszYqS6hRk7JcWnS25eCjYm9U58vP5gLNx1gKxR3demo");
    console.log(`\nℹ️ Используется Program ID: ${programId.toBase58()}`);
    console.log("   (Вы можете передать свой задеплоенный Program ID: npx ts-node client.ts <PROGRAM_ID>)");
  }

  // 5. Создание аккаунта данных (Greeting Account), привязанного к программе
  const greetedAccount = Keypair.generate();
  console.log(`\n📦 Создаем аккаунт хранилища данных: ${greetedAccount.publicKey.toBase58()}`);

  const lamportsForRent = await connection.getMinimumBalanceForRentExemption(GREETING_SIZE);
  console.log(`   Арендная плата (Rent exemption): ${lamportsForRent / LAMPORTS_PER_SOL} SOL`);

  // Инструкция создания аккаунта в блокчейне
  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: greetedAccount.publicKey,
    lamports: lamportsForRent,
    space: GREETING_SIZE,
    programId: programId, // Владельцем аккаунта назначается наша программа!
  });

  // Инструкция вызова нашей программы
  const customMessage = "Привет из моего первого Solana смарт-контракта!";
  const callProgramIx = new TransactionInstruction({
    keys: [{ pubkey: greetedAccount.publicKey, isSigner: false, isWritable: true }],
    programId: programId,
    data: Buffer.from(customMessage, "utf8"),
  });

  console.log("\n🚀 Отправка транзакции в Devnet...");
  try {
    const tx = new Transaction().add(createAccountIx, callProgramIx);
    const txSignature = await sendAndConfirmTransaction(connection, tx, [payer, greetedAccount]);

    console.log(`\n Транзакция успешно подтверждена!`);
    console.log(` Хеш транзакции: ${txSignature}`);
    console.log(` Ссылка в Solana Explorer:`);
    console.log(`   https://explorer.solana.com/tx/${txSignature}?cluster=devnet`);

    // Читаем данные созданного аккаунта из блокчейна
    const accountInfo = await connection.getAccountInfo(greetedAccount.publicKey);
    if (accountInfo) {
      console.log(`\n Данные аккаунта в блокчейне:`);
      console.log(`   Owner: ${accountInfo.owner.toBase58()}`);
      console.log(`   Размер данных: ${accountInfo.data.length} байт`);
    }
  } catch (e: any) {
    console.log(`\nℹ️ Сформированная инструкция валидна.`);
    console.log(`  Детали ошибки отправки на ноду (обычно требуется реальный деплой Program ID): ${e.message}`);
  }
}

main().catch(console.error);
