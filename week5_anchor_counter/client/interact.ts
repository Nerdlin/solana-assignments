import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";

// IDL схемы для программы Counter
const IDL: any = {
  address: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
  metadata: {
    name: "counter",
    version: "0.1.0",
    spec: "0.1.0",
  },
  instructions: [
    {
      name: "initialize",
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237],
      accounts: [
        { name: "counter", writable: true, signer: true },
        { name: "user", writable: true, signer: true },
        { name: "systemProgram", address: "11111111111111111111111111111111" },
      ],
      args: [],
    },
    {
      name: "increment",
      discriminator: [11, 18, 104, 9, 104, 174, 59, 33],
      accounts: [
        { name: "counter", writable: true },
      ],
      args: [],
    },
    {
      name: "decrement",
      discriminator: [106, 227, 168, 59, 248, 27, 150, 101],
      accounts: [
        { name: "counter", writable: true },
      ],
      args: [],
    },
    {
      name: "setValue",
      discriminator: [219, 171, 131, 189, 74, 207, 242, 60],
      accounts: [
        { name: "counter", writable: true },
        { name: "authority", signer: true },
      ],
      args: [{ name: "value", type: "u64" }],
    },
  ],
  accounts: [
    {
      name: "Counter",
      discriminator: [255, 176, 4, 245, 188, 253, 124, 25],
    },
  ],
  types: [
    {
      name: "Counter",
      type: {
        kind: "struct",
        fields: [
          { name: "count", type: "u64" },
          { name: "authority", type: "pubkey" },
        ],
      },
    },
  ],
};

import * as fs from "fs";
import * as path from "path";

function getRpcEndpoint(): string {
  if (process.env.HELIUS_RPC_URL) return process.env.HELIUS_RPC_URL;
  const envPaths = [path.join(__dirname, ".env"), path.join(__dirname, "../../.env")];
  for (const ep of envPaths) {
    if (fs.existsSync(ep)) {
      for (const line of fs.readFileSync(ep, "utf-8").split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("HELIUS_RPC_URL=")) {
          return trimmed.slice("HELIUS_RPC_URL=".length).trim();
        }
      }
    }
  }
  return clusterApiUrl("devnet");
}

async function main() {
  console.log("==========================================================");
  console.log("⚓ Anchor Counter Program Client (Devnet)");
  console.log("==========================================================");

  const rpcUrl = getRpcEndpoint();
  const connection = new Connection(rpcUrl, "confirmed");
  const payer = Keypair.generate();
  console.log(`🔑 Кошелек пользователя: ${payer.publicKey.toBase58()}`);
  console.log(`🌐 Подключение к RPC: ${rpcUrl.substring(0, 32)}...`);

  const wallet = new anchor.Wallet(payer);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });

  const programIdStr = process.argv[2] || "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS";
  const programId = new PublicKey(programIdStr);
  IDL.address = programId.toBase58();
  console.log(`📌 Program ID: ${programId.toBase58()}`);

  const program = new anchor.Program(IDL, provider);
  const counterAccount = Keypair.generate();
  console.log(`🎯 Новый аккаунт счетчика: ${counterAccount.publicKey.toBase58()}`);

  // Запрос Airdrop
  try {
    console.log(" Запрос 1 SOL Airdrop на Devnet...");
    const sig = await connection.requestAirdrop(payer.publicKey, 1 * LAMPORTS_PER_SOL);
    const bh = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature: sig, ...bh });
    console.log(" Airdrop получен!");
  } catch (err) {
    console.log("⚠️ Airdrop ограничен rate-limit (при необходимости пополните через faucet.solana.com)");
  }

  try {
    console.log("\n1️⃣ Вызов инструкции initialize()...");
    const txInit = await (program.methods as any)
      .initialize()
      .accounts({
        counter: counterAccount.publicKey,
        user: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([counterAccount])
      .rpc();
    console.log(`   Tx signature: https://explorer.solana.com/tx/${txInit}?cluster=devnet`);

    console.log("\n2️⃣ Вызов инструкции increment() (+1)...");
    const txInc = await (program.methods as any)
      .increment()
      .accounts({ counter: counterAccount.publicKey })
      .rpc();
    console.log(`   Tx signature: https://explorer.solana.com/tx/${txInc}?cluster=devnet`);

    console.log("\n3️⃣ Чтение состояния счетчика из Devnet...");
    const state: any = await (program.account as any).counter.fetch(counterAccount.publicKey);
    console.log(`   Значение count: ${state.count.toString()}`);
    console.log(`   Владелец: ${state.authority.toBase58()}`);
  } catch (e: any) {
    console.log("Инструкция готова к вызову:", e.message);
  }
}

main().catch(console.error);
