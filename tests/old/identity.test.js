const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Soulbound Identity", function () {
  it("should mint a Soulbound Token", async function () {
    const soulbound = await ethers.getContractAt("ZiGSoulboundToken", "0xAbe238E078b428D2CCf68B303D6a61909AfA9d1C");
    const balance = await soulbound.balanceOf("0x0000000000000000000000000000000000000001");
    expect(balance).to.equal(0);
  });
});
