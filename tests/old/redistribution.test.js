const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedistributionVault", function () {
  it("should redistribute tokens correctly", async function () {
    const vault = await ethers.getContractAt("RedistributionVault", "0xCA4aCCbBc9813052139832510a58f721274B3866");
    const recipients = await vault.getRecipients();
    expect(recipients.length).to.be.gt(0);
  });
});
