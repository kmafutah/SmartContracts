// Updated Test for ZiGOracleHub and ZiGT Token (proxy fix)

const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

const pathOracleHub = "contracts/ZiGT_github/ZiGOracleHub.sol:ZiGOracleHub";
const pathCustomOracle = "contracts/ZiGT_github/CustomChainlinkOracle.sol:CustomChainlinkOracle";
const pathZiGT = "contracts/ZiGT_github/ZiGT.sol:ZiGT";

describe("ZiGOracleHub", function () {
  let oracleHub;
  let deployer;

  beforeEach(async function () {
    [deployer] = await ethers.getSigners();
    const OracleHubFactory = await ethers.getContractFactory(pathOracleHub);
    oracleHub = await OracleHubFactory.connect(deployer).deploy(deployer.address);
  });

  it("should register an oracle", async function () {
    const MockOracleFactory = await ethers.getContractFactory(pathCustomOracle);
    const mockOracle = await MockOracleFactory.deploy(8);
    await mockOracle.waitForDeployment();

    await oracleHub.setOracle("ZIGUSD", mockOracle.address, 8, false, false);
    const [rate, decimals] = await oracleHub.getRate("ZIGUSD");
    expect(decimals).to.equal(8);
  });
});

describe("ZiGT Token", function () {
  let zigt;
  let deployer, user;

  beforeEach(async function () {
    [deployer, user] = await ethers.getSigners();
    const ZiGTFactory = await ethers.getContractFactory(pathZiGT);
    zigt = await upgrades.deployProxy(ZiGTFactory, [
      deployer.address,         // zigt
      deployer.address,         // feedRegistry
      "ZiGT Stable",            // name
      "ZiGT",                   // symbol
      "v1"                      // version
    ]);
  });

  it("should have correct name and symbol", async function () {
    expect(await zigt.name()).to.equal("ZiGT Stable");
    expect(await zigt.symbol()).to.equal("ZiGT");
    expect(await zigt.decimals()).to.equal(18);
  });

  it("should allow minting and transfers", async function () {
    await zigt.setZiGT(deployer.address); // grant minter rights to deployer
    await zigt.mint(user.address, ethers.utils.parseEther("100"));
    expect(await zigt.balanceOf(user.address)).to.equal(ethers.utils.parseEther("100"));

    await zigt.connect(user).transfer(deployer.address, ethers.utils.parseEther("50"));
    expect(await zigt.balanceOf(deployer.address)).to.equal(ethers.utils.parseEther("50"));
  });
});
