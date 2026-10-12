import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  PublicKey,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import * as dotenv from "dotenv";
import bs58 from "bs58";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Загрузка переменных окружения
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "1b50e66f-c639-4adc-95b7-c9ada545289b";
const RPC_ENDPOINT =
  process.env.HELIUS_RPC_URL ||
  (HELIUS_API_KEY
    ? `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
    : "https://api.devnet.solana.com");

console.log(`🌐 Подключение к Solana Devnet (Helius RPC): ${RPC_ENDPOINT.slice(0, 45)}...`);
const connection = new Connection(RPC_ENDPOINT, "confirmed");

function getSenderKeypair(): Keypair {
  const privateKey = process.env.SECRET_KEY?.trim();
  if (privateKey) {
    try {
      const decoded = bs58.decode(privateKey);
      return Keypair.fromSecretKey(decoded);
    } catch (e) {
      console.warn("⚠️ Не удалось декодировать SECRET_KEY из base58, используем локальный ключ...");
    }
  }

  // Fallback 1: Solana CLI default keypair (~/.config/solana/id.json)
  const defaultSolanaKeyPath = path.join(os.homedir(), ".config", "solana", "id.json");
  if (fs.existsSync(defaultSolanaKeyPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(defaultSolanaKeyPath, "utf-8"));
      return Keypair.fromSecretKey(new Uint8Array(raw));
    } catch (e) {}
  }

  // Fallback 2: wallet.json в корне модуля
  const localWalletPath = path.join(__dirname, "../wallet.json");
  if (fs.existsSync(localWalletPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(localWalletPath, "utf-8"));
      return Keypair.fromSecretKey(new Uint8Array(raw));
    } catch (e) {}
  }

  // Fallback 3: генерация нового
  const generated = Keypair.generate();
  fs.writeFileSync(localWalletPath, JSON.stringify(Array.from(generated.secretKey)));
  return generated;
}

const sender = getSenderKeypair();
console.log("📬 Sender:", sender.publicKey.toBase58());
console.log("🔑 Base58 Secret Key:", bs58.encode(sender.secretKey));

async function getBalance(pubkey: PublicKey): Promise<number> {
  const lamports = await connection.getBalance(pubkey);
  return lamports / LAMPORTS_PER_SOL;
}

async function airdrop(keypair: Keypair, sol: number): Promise<void> {
  console.log(`\n💧 Airdrop ${sol} SOL...`);
  try {
    const sig = await connection.requestAirdrop(
      keypair.publicKey,
      sol * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(sig);
    const balance = await getBalance(keypair.publicKey);
    console.log(`✅ Done! Balance: ${balance} SOL`);
  } catch (error: any) {
    console.warn(`⚠️ Не удалось запросить airdrop: ${error?.message || error}`);
    console.warn(`👉 Для пополнения Devnet SOL перейдите на: https://faucet.solana.com/`);
  }
}

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

function createMemoInstruction(message: string): TransactionInstruction {
  return new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(message, "utf-8"),
  });
}

async function sendWithMemo(
  sender: Keypair,
  recipient: PublicKey,
  solAmount: number,
  memo: string
): Promise<void> {
  console.log(`\n🚀 Sending ${solAmount} SOL to ${recipient.toBase58()}`);
  console.log(`📝 Memo: "${memo}"`);

  const transaction = new Transaction();

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: recipient,
      lamports: Math.round(solAmount * LAMPORTS_PER_SOL),
    })
  );

  transaction.add(createMemoInstruction(memo));

  const signature = await sendAndConfirmTransaction(connection, transaction, [
    sender,
  ]);

  const txInfo = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  const slot = txInfo?.slot ?? "unknown";

  console.log("\n─────────────────────────────────────");
  console.log("✅ Transaction confirmed!");
  console.log("📋 Signature:", signature);
  console.log("🔢 Slot:     ", slot);
  console.log(
    "🔗 Explorer: ",
    `https://explorer.solana.com/tx/${signature}?cluster=devnet`
  );
  console.log("─────────────────────────────────────");
}

async function main() {
  const recipient = Keypair.generate();
  console.log("📭 Recipient:", recipient.publicKey.toBase58());

  let balanceBefore = await getBalance(sender.publicKey);
  console.log(`\n💰 Balance before: ${balanceBefore} SOL`);

  if (balanceBefore < 0.015) {
    console.log("⚠️ Баланс меньше 0.015 SOL, запрашиваем airdrop...");
    await airdrop(sender, 1);
    balanceBefore = await getBalance(sender.publicKey);
  }

  if (balanceBefore < 0.012) {
    console.error("❌ Недостаточно средств для отправки 0.01 SOL + комиссия.");
    console.error(`   Пожалуйста, пополните адрес ${sender.publicKey.toBase58()} через https://faucet.solana.com/`);
    process.exit(1);
  }

  await sendWithMemo(sender, recipient.publicKey, 0.01, "Hello Solana");

  const balanceAfter = await getBalance(sender.publicKey);
  console.log(`💰 Balance after:  ${balanceAfter} SOL`);
}

main().catch(console.error);
