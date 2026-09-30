import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import { getDevnetConnection, getOrCreateWallet, explorerUrl } from "./helpers";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("==========================================================");
  console.log("💸 Шаг 4: Перевод (Transfer) токенов новому получателю");
  console.log("==========================================================");

  const mintFile = path.join(__dirname, "../mint_address.json");
  if (!fs.existsSync(mintFile)) {
    console.error("❌ Сначала создайте токен: npm run create-mint");
    process.exit(1);
  }

  const { mint: mintStr, decimals } = JSON.parse(fs.readFileSync(mintFile, "utf-8"));
  const mint = new PublicKey(mintStr);
  const connection = getDevnetConnection();
  const senderWallet = getOrCreateWallet();

  // Создаем тестовый кошелек получателя (Тимур)
  const recipientWallet = Keypair.generate();
  console.log(`👤 Отправитель (Димаш): ${senderWallet.publicKey.toBase58()}`);
  console.log(`👥 Получатель (Тимур):   ${recipientWallet.publicKey.toBase58()}`);

  console.log("\n📦 Получение ATA отправителя...");
  const senderATA = await getOrCreateAssociatedTokenAccount(
    connection,
    senderWallet,
    mint,
    senderWallet.publicKey
  );

  console.log("📦 Создание ATA для получателя...");
  const recipientATA = await getOrCreateAssociatedTokenAccount(
    connection,
    senderWallet, // Оплачивает создание ATA получателя
    mint,
    recipientWallet.publicKey
  );

  const transferAmount = 250; // Переводим 250 токенов
  const rawTransferAmount = BigInt(transferAmount) * BigInt(10 ** decimals);

  console.log(`\n🚀 Отправка ${transferAmount} токенов на адрес получателя...`);
  const transferTxSig = await transfer(
    connection,
    senderWallet,
    senderATA.address,
    recipientATA.address,
    senderWallet,
    rawTransferAmount
  );

  console.log("\n Перевод успешно завершен!");
  console.log(` Хеш транзакции перевода: ${transferTxSig}`);
  console.log(`🔗 Ссылка на транзакцию в Explorer:`);
  console.log(`   ${explorerUrl(transferTxSig, "tx")}`);
  console.log(`🔗 Баланс ATA получателя в Explorer:`);
  console.log(`   ${explorerUrl(recipientATA.address.toBase58(), "address")}`);
}

main().catch(console.error);
