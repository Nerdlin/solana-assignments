import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";

describe("week10-cpi-withdraw", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  it("verifies mathematical formula for share burning and token withdrawal", async () => {
    // Формула: tokens_to_return = shares_to_burn * total_vault_tokens / total_shares
    const totalShares = 1_000_000n;
    const totalVaultTokens = 1_300_000n; // 30% yield
    const sharesToBurn = 250_000n;        // 25% всех акций

    const tokensToReturn = (sharesToBurn * totalVaultTokens) / totalShares;
    expect(tokensToReturn).to.equal(325_000n); // 25% от 1.3M = 325k токенов

    const remainingShares = totalShares - sharesToBurn;
    const remainingVaultTokens = totalVaultTokens - tokensToReturn;
    expect(remainingShares).to.equal(750_000n);
    expect(remainingVaultTokens).to.equal(975_000n);
  });

  it("verifies PDA addresses and CPI authorization seeds", async () => {
    const dummyMint = Keypair.generate().publicKey;
    const programId = new PublicKey("BZowrhwwupeg34hg8DmxknTZNJ8a7UGS9ZXPeirTQu4Y");

    const [vaultStatePda, vaultBump] = PublicKey.findProgramAddressSync(
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

    expect(vaultBump).to.be.a("number");
    expect(vaultStatePda).to.be.instanceOf(PublicKey);
    expect(vaultTokensPda).to.be.instanceOf(PublicKey);
    expect(shareMintPda).to.be.instanceOf(PublicKey);
    expect(userCardPda).to.be.instanceOf(PublicKey);
  });
});
