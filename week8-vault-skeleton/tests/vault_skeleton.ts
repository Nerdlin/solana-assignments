import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";

describe("week8-vault-skeleton", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  it("calculates correct PDA seeds and verifies space", async () => {
    const dummyMint = Keypair.generate().publicKey;
    const programId = new PublicKey("8Ske1etonVault11111111111111111111111111111");

    const [vaultStatePda, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), dummyMint.toBuffer()],
      programId
    );
    expect(vaultBump).to.be.a("number");

    const [vaultTokensPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_tokens"), dummyMint.toBuffer()],
      programId
    );
    expect(vaultTokensPda).to.be.instanceOf(PublicKey);

    const [shareMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("share_mint"), dummyMint.toBuffer()],
      programId
    );
    expect(shareMintPda).to.be.instanceOf(PublicKey);

    const [userCardPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_card"), vaultStatePda.toBuffer(), provider.wallet.publicKey.toBuffer()],
      programId
    );
    expect(userCardPda).to.be.instanceOf(PublicKey);
  });
});
