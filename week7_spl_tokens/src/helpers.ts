import { Connection, Keypair, LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const WALLET_PATH = path.join(__dirname, "../wallet.json");

/**
 * Получение подключения к кластеру Devnet
 */
export function getDevnetConnection(): Connection {
  return new Connection(clusterApiUrl("devnet"), "confirmed");
}

/**
 * Загрузка или создание постоянного кошелька для тестов
 */
export function getOrCreateWallet(): Keypair {
  if (fs.existsSync(WALLET_PATH)) {
    const raw = JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8"));
    return Keypair.fromSecretKey(new Uint8Array(raw));
  }
  const keypair = Keypair.generate();
  fs.writeFileSync(WALLET_PATH, JSON.stringify(Array.from(keypair.secretKey)));
  return keypair;
}

/**
 * Запрос тестовых SOL с подтверждением
 */
export async function ensureAirdrop(connection: Connection, keypair: Keypair, solAmount: number = 1) {
  const balance = await connection.getBalance(keypair.publicKey);
  console.log(`Текущий баланс кошелька: ${balance / LAMPORTS_PER_SOL} SOL`);

  if (balance < 0.2 * LAMPORTS_PER_SOL) {
    console.log(`Запрашиваем ${solAmount} SOL из крана Devnet...`);
    try {
      const sig = await connection.requestAirdrop(keypair.publicKey, solAmount * LAMPORTS_PER_SOL);
      const bh = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature: sig, ...bh });
      console.log(` Airdrop успешно получен!`);
    } catch (err: any) {
      console.log(`⚠️ Не удалось получить Airdrop через RPC (rate limit).`);
      console.log(`   Пожалуйста, пополните адрес ${keypair.publicKey.toBase58()} через https://faucet.solana.com`);
    }
  }
}

/**
 * Генерация удобной ссылки в Solana Explorer для Devnet
 */
export function explorerUrl(id: string, type: "tx" | "address"): string {
  return `https://explorer.solana.com/${type}/${id}?cluster=devnet`;
}
