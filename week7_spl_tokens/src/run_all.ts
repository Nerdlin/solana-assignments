import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  getMint,
  getAccount,
} from "@solana/spl-token";
import { Keypair } from "@solana/web3.js";
import { getDevnetConnection, getOrCreateWallet, ensureAirdrop, explorerUrl } from "./helpers";
import * as fs from "fs";
import * as path from "path";

async function runFullPipeline() {
  console.log("===============================================================");
  console.log("🪙 ПОЛНЫЙ ДЕМОНСТРАЦИОННЫЙ ЦИКЛ: SPL TOKENS & METADATA (Week 7)");
  console.log("===============================================================\n");

  const connection = getDevnetConnection();
  const wallet = getOrCreateWallet();
  console.log(`[1] Кошелек создателя токена: ${wallet.publicKey.toBase58()}`);

  await ensureAirdrop(connection, wallet, 1);

  console.log("\n[2] Создание Mint аккаунта (SPL Token с 9 decimals)...");
  const decimals = 9;
  const mint = await createMint(
    connection,
    wallet,
    wallet.publicKey,
    wallet.publicKey,
    decimals
  );
  console.log(`🎉 Токен Mint создан: ${mint.toBase58()}`);
  console.log(`   Explorer: ${explorerUrl(mint.toBase58(), "address")}`);

  // Сохраняем адрес
  fs.writeFileSync(
    path.join(__dirname, "../mint_address.json"),
    JSON.stringify({ mint: mint.toBase58(), decimals })
  );

  console.log("\n[3] Создание Associated Token Account (ATA) для владельца...");
  const ownerATA = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    mint,
    wallet.publicKey
  );
  console.log(`   ATA адрес: ${ownerATA.address.toBase58()}`);

  console.log("\n[4] Эмиссия (Mint) 50,000 токенов STARTUP...");
  const mintAmount = 50_000;
  const rawMintAmount = BigInt(mintAmount) * BigInt(10 ** decimals);
  const mintTx = await mintTo(
    connection,
    wallet,
    mint,
    ownerATA.address,
    wallet,
    rawMintAmount
  );
  console.log(`   Mint Tx: ${explorerUrl(mintTx, "tx")}`);

  console.log("\n[5] Создание второго кошелька (Bob) и перевод 1,500 токенов...");
  const bobWallet = Keypair.generate();
  console.log(`   Кошелек Bob: ${bobWallet.publicKey.toBase58()}`);

  const bobATA = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    mint,
    bobWallet.publicKey
  );
  console.log(`   ATA адрес Bob: ${bobATA.address.toBase58()}`);

  const transferAmount = 1_500;
  const rawTransfer = BigInt(transferAmount) * BigInt(10 ** decimals);
  const transferTx = await transfer(
    connection,
    wallet,
    ownerATA.address,
    bobATA.address,
    wallet,
    rawTransfer
  );
  console.log(`   Transfer Tx: ${explorerUrl(transferTx, "tx")}`);

  console.log("\n[6] Проверка итоговых балансов в блокчейне Solana Devnet:");
  const mintInfo = await getMint(connection, mint);
  const ownerAccountInfo = await getAccount(connection, ownerATA.address);
  const bobAccountInfo = await getAccount(connection, bobATA.address);

  console.log(`   - Общая эмиссия (Total Supply): ${Number(mintInfo.supply) / 10 ** decimals} токенов`);
  console.log(`   - Баланс создателя:           ${Number(ownerAccountInfo.amount) / 10 ** decimals} токенов`);
  console.log(`   - Баланс Bob:                 ${Number(bobAccountInfo.amount) / 10 ** decimals} токенов`);

  console.log("\n===============================================================");
  console.log(" Все операции по SPL Token (выпуск, mint, transfer, client)");
  console.log("   успешно выполнены и зафиксированы в Solana Devnet!");
  console.log("===============================================================");
}

runFullPipeline().catch(console.error);
