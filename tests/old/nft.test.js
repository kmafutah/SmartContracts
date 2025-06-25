const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFT System", function () {
  it("should fetch SoulReparationNFT metadata", async function () {
    const nft = await ethers.getContractAt("SoulReparationNFT", "0x4D4aED6E1b5c4fce60a3006E4C8C3b3Cccf56755");
    const uri = await nft.tokenURI(0);
    expect(uri).to.be.a("string");
  });
});
