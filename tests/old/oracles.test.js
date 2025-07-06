const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Oracle System", function () {
  it("should return valid price from MultiOracle", async function () {
    const multiOracle = await ethers.getContractAt("MultiOracle", "0xEA41ADD3B34584eb7f21af42C06Ae65db984b4B6");
    const price = await multiOracle.getLatestPrice("USD", "XAU");
    expect(price).to.be.gt(0);
  });
});
