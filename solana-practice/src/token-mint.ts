import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  burn,
  getAccount,
} from "@solana/spl-token";
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

function getPayerKeypair(): Keypair {
  const privateKey = process.env.SECRET_KEY?.trim();
  if (privateKey) {
    try {
      const decoded = bs58.decode(privateKey);
      return Keypair.fromSecretKey(decoded);
    } catch (e) {
      console.warn("⚠️ Не удалось декодировать SECRET_KEY из base58, пробуем локальный ключ...");
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

const payer = getPayerKeypair();
console.log("👛 Payer:", payer.publicKey.toBase58());
console.log("🔑 Base58 Secret Key:", bs58.encode(payer.secretKey));

// ─── Адреса трёх получателей (одногруппников) ───
function getRecipients(): PublicKey[] {
  const envRecipients = [
    process.env.RECIPIENT_1?.trim(),
    process.env.RECIPIENT_2?.trim(),
    process.env.RECIPIENT_3?.trim(),
  ].filter((addr): addr is string => Boolean(addr && addr.length > 30));

  if (envRecipients.length === 3) {
    return envRecipients.map((addr) => new PublicKey(addr));
  }

  console.log("ℹ️ Переменные RECIPIENT_1..3 не заданы в .env. Генерируем 3 демонстрационных адреса получателей:");
  const testRecipients = [
    Keypair.generate().publicKey,
    Keypair.generate().publicKey,
    Keypair.generate().publicKey,
  ];
  testRecipients.forEach((pub, i) => console.log(`   Адрес ${i + 1}: ${pub.toBase58()}`));
  return testRecipients;
}

const RECIPIENTS: PublicKey[] = getRecipients();

const DECIMALS = 6;
const toRaw = (amount: number) => amount * 10 ** DECIMALS;

async function ensureFunds(pubkey: PublicKey, minSol: number = 0.05) {
  const lamports = await connection.getBalance(pubkey);
  const sol = lamports / LAMPORTS_PER_SOL;
  console.log(`\n💰 Баланс Payer: ${sol} SOL`);
  if (sol < minSol) {
    console.log(`⚠️ Баланс меньше ${minSol} SOL. Запрашиваем airdrop...`);
    try {
      const sig = await connection.requestAirdrop(pubkey, 1 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig);
      const newBalance = (await connection.getBalance(pubkey)) / LAMPORTS_PER_SOL;
      console.log(`✅ Airdrop успешен! Новый баланс: ${newBalance} SOL`);
    } catch (e: any) {
      console.warn(`⚠️ Не удалось выполнить airdrop автоматически (лимит Devnet).`);
      console.warn(`👉 Пожалуйста, пополните баланс ${pubkey.toBase58()} через https://faucet.solana.com/`);
    }
  }
}

async function main() {
  await ensureFunds(payer.publicKey, 0.05);

  // ─── 1. Создаём токен MYCOIN ───
  console.log("\n🪙 Creating MYCOIN token mint...");
  const mint = await createMint(
    connection,
    payer,           // кто платит за транзакцию
    payer.publicKey, // mint authority
    payer.publicKey, // freeze authority
    DECIMALS
  );
  console.log("✅ Mint address:", mint.toBase58());
  console.log(
    "🔗",
    `https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`
  );

  // ─── 2. Создаём ATA и минтим 10 000 токенов ───
  console.log("\n📦 Creating Associated Token Account (ATA)...");
  const payerATA = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );
  console.log("✅ ATA:", payerATA.address.toBase58());

  console.log("\n🏭 Minting 10,000 MYCOIN...");
  await mintTo(
    connection,
    payer,
    mint,
    payerATA.address,
    payer,
    toRaw(10_000)
  );
  console.log("✅ Minted 10,000 MYCOIN");

  // ─── 3. Раздаём трём одногруппникам по 100 токенов ───
  console.log("\n📤 Sending 100 MYCOIN to 3 recipients...");
  for (let i = 0; i < RECIPIENTS.length; i++) {
    const recipientATA = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      RECIPIENTS[i]
    );

    const sig = await transfer(
      connection,
      payer,
      payerATA.address,
      recipientATA.address,
      payer,
      toRaw(100)
    );

    console.log(`✅ Recipient ${i + 1}: ${RECIPIENTS[i].toBase58()}`);
    console.log(
      "🔗",
      `https://explorer.solana.com/tx/${sig}?cluster=devnet`
    );
  }

  // ─── 4. Сжигаем 50 токенов ───
  console.log("\n🔥 Burning 50 MYCOIN...");
  const burnSig = await burn(
    connection,
    payer,
    payerATA.address,
    mint,
    payer,
    toRaw(50)
  );
  console.log("✅ Burned 50 MYCOIN");
  console.log(
    "🔗",
    `https://explorer.solana.com/tx/${burnSig}?cluster=devnet`
  );

  // ─── 5. Финальный баланс ───
  const account = await getAccount(connection, payerATA.address);
  const balance = Number(account.amount) / 10 ** DECIMALS;
  console.log(`\n─────────────────────────────────────`);
  console.log(`💰 Final balance: ${balance} MYCOIN (ожидается 9650)`);
  console.log(
    "🔗 Token in Explorer:",
    `https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`
  );
  console.log(`─────────────────────────────────────`);
}

main().catch((err) => {
  console.error("❌ Ошибка при выполнении:", err);
  process.exit(1);
});
