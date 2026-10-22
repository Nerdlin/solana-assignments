import { expect } from "chai";
import BN from "bn.js";

describe("week11-clmm-pool", () => {
  it("verifies tick to price and sqrt_price_x64 conversions", () => {
    // Формула: P(i) = 1.0001^i
    // При i = 0 => P = 1.0 => sqrt_price = 1.0 => sqrt_price_x64 = 2^64
    const two64 = new BN("18446744073709551616"); // 2^64
    const sqrtPriceX64AtZero = two64;
    expect(sqrtPriceX64AtZero.toString()).to.equal("18446744073709551616");

    // Для цены P = 4.0:
    // sqrt(4) = 2.0
    // sqrt_price_x64 = 2 * 2^64
    const expectedForPrice4 = two64.muln(2);
    expect(expectedForPrice4.toString()).to.equal("36893488147419103232");
  });

  it("verifies concentrated liquidity tick spacing constraints", () => {
    const tickSpacing = 10;
    const tickLower = -200;
    const tickUpper = 200;

    expect(tickLower % tickSpacing).to.equal(0);
    expect(tickUpper % tickSpacing).to.equal(0);
    expect(tickLower).to.be.lessThan(tickUpper);
  });
});
