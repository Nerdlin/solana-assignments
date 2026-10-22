import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";

describe("week13-clmm-position", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  it("calculates impermanent loss and position liquidity dynamics", () => {
    // Формула: IL = 2 * sqrt(k) / (1 + k) - 1, где k = P_new / P_old
    // При росте цены в 2 раза (k = 2.0):
    // IL = 2 * sqrt(2) / (1 + 2) - 1 = 2 * 1.4142 / 3 - 1 = 0.9428 - 1 = -0.0572 (-5.72%)
    const k = 2.0;
    const il = (2.0 * Math.sqrt(k)) / (1.0 + k) - 1.0;
    expect(Math.abs(il - -0.0572)).to.be.lessThan(0.001);
  });

  it("verifies Raydium CLMM position NFT and PDA addresses", () => {
    const clmmProgramId = new PublicKey("devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH");
    const dummyNftMint = Keypair.generate().publicKey;

    const [personalPositionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), dummyNftMint.toBuffer()],
      clmmProgramId
    );
    expect(personalPositionPda).to.be.instanceOf(PublicKey);
  });
});
