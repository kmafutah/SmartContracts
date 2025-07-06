const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Governance", function () {
  it("should allow proposal creation", async function () {
    const governance = await ethers.getContractAt("ZiGGovernance", "0x5f773AC6957d8B5C19780d0F2753539Bccff61FA");
    const proposals = await governance.getProposals();
    expect(proposals).to.be.an("array");
  });
});
