import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { getDevnetConnection, getOrCreateWallet, explorerUrl } from "./helpers";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("==========================================================");
  console.log("🏭 Шаг 3: Эмиссия (Mint) токенов на кошелек владельца");
  console.log("==========================================================");

  const mintFile = path.join(__dirname, "../mint_address.json");
  if (!fs.existsSync(mintFile)) {
    console.error("❌ Сначала создайте токен: npm run create-mint");
    process.exit(1);
  }

  const { mint: mintStr, decimals } = JSON.parse(fs.readFileSync(mintFile, "utf-8"));
  const mint = new PublicKey(mintStr);
  const connection = getDevnetConnection();
  const wallet = getOrCreateWallet();

  console.log(`🪙 Токен: ${mint.toBase58()}`);
  console.log(`👤 Владелец: ${wallet.publicKey.toBase58()}`);

  console.log("\n📦 Получение или создание связанного токен-аккаунта (ATA - Associated Token Account)...");
  // В Solana токены хранятся не на самом кошельке, а на специальном ATA-аккаунте
  const userTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    mint,
    wallet.publicKey
  );

  console.log(`📍 Адрес токен-аккаунта (ATA): ${userTokenAccount.address.toBase58()}`);

  const amountToMint = 10_000; // 10,000 токенов
  const rawAmount = BigInt(amountToMint) * BigInt(10 ** decimals);

  console.log(`\n Выпуск ${amountToMint.toLocaleString()} токенов...`);
  const mintTxSig = await mintTo(
    connection,
    wallet,
    mint,
    userTokenAccount.address,
    wallet,
    rawAmount
  );

  console.log("\n Токены успешно отчеканены!");
  console.log(` Хеш транзакции: ${mintTxSig}`);
  console.log(`🔗 Просмотр транзакции в Explorer:`);
  console.log(`   ${explorerUrl(mintTxSig, "tx")}`);
  console.log(`🔗 Просмотр баланса токен-аккаунта в Explorer:`);
  console.log(`   ${explorerUrl(userTokenAccount.address.toBase58(), "address")}`);
}

main().catch(console.error);
