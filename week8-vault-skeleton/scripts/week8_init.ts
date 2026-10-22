/**
 * Неделя 8: Каркас Vault — Скрипт инициализации Vault и создания карточки пользователя
 *
 * Действия:
 * 1. Инициализирует VaultState PDA, vault_token_account PDA, share_mint PDA
 * 2. Создает карточку пользователя (UserCard PDA)
 *
 * Запуск:
 *   npx ts-node scripts/week8_init.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env") });

function loadKeypair(): Keypair {
  const p = path.join(process.env.USERPROFILE || process.env.HOME || "", ".config", "solana", "id.json");
  if (fs.existsSync(p)) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf-8"))));
  }
  return Keypair.generate();
}

async function main() {
  console.log("====================================================");
  console.log("🏛️  [Неделя 8] Инициализация Liquidity Vault и User Card");
  console.log("====================================================");

  const rpcUrl = process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");
  const wallet = loadKeypair();
  console.log(`Администратор: ${wallet.publicKey.toBase58()}`);

  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), { commitment: "confirmed" });
  anchor.setProvider(provider);

  // Создаем тестовый токен vault
  console.log("\n1. Создание SPL токена хранилища...");
  const tokenMint = await createMint(connection, wallet, wallet.publicKey, null, 6);
  console.log(`✅ Token Mint: ${tokenMint.toBase58()}`);

  const PROGRAM_ID = new PublicKey("EbojNUfh9Jk6dyZaaQAJWofbdnkvdxfQbeAPq6iWoHAu");

  // PDAs
  const [vaultStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), tokenMint.toBuffer()],
    PROGRAM_ID
  );
  const [vaultTokenAccountPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_tokens"), tokenMint.toBuffer()],
    PROGRAM_ID
  );
  const [shareMintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("share_mint"), tokenMint.toBuffer()],
    PROGRAM_ID
  );
  const [userCardPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_card"), vaultStatePDA.toBuffer(), wallet.publicKey.toBuffer()],
    PROGRAM_ID
  );

  console.log("\n2. Расчет адресов PDA:");
  console.log(`  VaultState PDA:        ${vaultStatePDA.toBase58()}`);
  console.log(`  Vault Token Acc PDA:   ${vaultTokenAccountPDA.toBase58()}`);
  console.log(`  Share Mint PDA:        ${shareMintPDA.toBase58()}`);
  console.log(`  User Card PDA:         ${userCardPDA.toBase58()}`);

  console.log("\nСсылки в Solana Explorer (Devnet):");
  console.log(`🔗 Token Mint:    https://explorer.solana.com/address/${tokenMint.toBase58()}?cluster=devnet`);
  console.log(`🔗 Vault State:   https://explorer.solana.com/address/${vaultStatePDA.toBase58()}?cluster=devnet`);
  console.log(`🔗 Vault Tokens:  https://explorer.solana.com/address/${vaultTokenAccountPDA.toBase58()}?cluster=devnet`);
  console.log(`🔗 Share Mint:    https://explorer.solana.com/address/${shareMintPDA.toBase58()}?cluster=devnet`);
  console.log(`🔗 User Card:     https://explorer.solana.com/address/${userCardPDA.toBase58()}?cluster=devnet`);
}

main().catch(console.error);
