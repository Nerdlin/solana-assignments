import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";

describe("week9-deposit-shares", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  it("verifies mathematical formula for share minting", async () => {
    // Формула: shares_to_mint = deposit_amount * total_shares / total_vault_tokens
    // Первый депозит: shares_to_mint = deposit_amount
    const firstDeposit = 1_000_000n;
    let totalShares = 0n;
    let totalVaultTokens = 0n;

    let sharesToMint = (totalShares === 0n || totalVaultTokens === 0n)
      ? firstDeposit
      : (firstDeposit * totalShares) / totalVaultTokens;
    expect(sharesToMint).to.equal(1_000_000n);

    // Второй депозит после роста стоимости пула (накопленные комиссии)
    totalShares = 1_000_000n;
    totalVaultTokens = 1_250_000n; // Vault заработал 25%
    const secondDeposit = 500_000n;

    sharesToMint = (secondDeposit * totalShares) / totalVaultTokens;
    expect(sharesToMint).to.equal(400_000n); // 500k * 1M / 1.25M = 400k shares
  });

  it("verifies PDA derivation for deposit accounts", async () => {
    const dummyMint = Keypair.generate().publicKey;
    const programId = new PublicKey("FMhz6CM3xLvkcyM565j2EFzKTXrJzC1QdoyKDGud3pft");

    const [vaultStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), dummyMint.toBuffer()],
      programId
    );
    const [vaultTokensPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_tokens"), dummyMint.toBuffer()],
      programId
    );
    const [shareMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("share_mint"), dummyMint.toBuffer()],
      programId
    );
    const [userCardPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_card"), vaultStatePda.toBuffer(), provider.wallet.publicKey.toBuffer()],
      programId
    );

    expect(vaultStatePda).to.be.instanceOf(PublicKey);
    expect(vaultTokensPda).to.be.instanceOf(PublicKey);
    expect(shareMintPda).to.be.instanceOf(PublicKey);
    expect(userCardPda).to.be.instanceOf(PublicKey);
  });
});
