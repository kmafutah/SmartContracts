/*
Complete Test Suite for ZiGT Contracts
Using Mocha, Chai, and Hardhat
*/

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseUnits, parseEther,ZeroAddress } = require("ethers");
const { encodeBytes32String } = require("ethers");

// bonding-curve.test.js
describe("BondingCurve", function () {
  let Curve, owner;
  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const BondingCurve = await ethers.getContractFactory("contracts/ZiGT_github/ZiGBondingCurve.sol:ZiGBondingCurve");
    Curve = await BondingCurve.deploy();
    await Curve.waitForDeployment();
  });

  it("initial totalSupply is zero", async function () {
    expect(await Curve.totalSupply()).to.equal(0);
  });

  it("mints correct amount based on price curve", async function () {
    // assume price 1 NFT costs 1 ETH
    const minted = await Curve.connect(owner).mint(parseEther("1"), { value: parseEther("1") });
    // totalSupply should increase by 1
    expect(await Curve.totalSupply()).to.equal(1);
    // contract balance updated
    expect(await ethers.provider.getBalance(Curve.address)).to.equal(parseEther("1"));
  });

  it("reverts if sent ETH does not match cost", async function () {
    await expect(
      Curve.connect(owner).mint(parseEther("1"), { value: parseEther("0.5") })
    ).to.be.revertedWith("Incorrect payment");
  });
});

// gamefi-nfts.test.js
describe("ZiGGameFiToken", function () {
  let GameFi, owner, addr1;
  beforeEach(async () => {
    [owner, addr1] = await ethers.getSigners();
    const GameFiToken = await ethers.getContractFactory("contracts/ZiGT_github/ZiGGameFiToken.sol:ZiGGameFiToken");
    GameFi = await GameFiToken.deploy(parseEther("1000"));
    await GameFi.waitForDeployment();
  });

  it("owner receives initial supply", async function () {
    expect(await GameFi.balanceOf(owner.address)).to.equal(parseEther("1000"));
  });

  it("owner can call rewardMint", async function () {
    await GameFi.connect(owner).rewardMint(addr1.address, parseEther("100"));
    expect(await GameFi.balanceOf(addr1.address)).to.equal(parseEther("100"));
  });

  it("non-owner cannot call rewardMint", async function () {
    await expect(
      GameFi.connect(addr1).rewardMint(addr1.address, parseEther("10"))
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});

// governance-dao.test.js
describe("GovernanceDAO", function () {
  let DAO, governanceToken, owner, voter;
  beforeEach(async () => {
    [owner, voter] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("ERC20Mock");
    governanceToken = await Token.deploy("Gov", "GOV");
    const GovernanceDAO = await ethers.getContractFactory("GovernanceDAO");
    DAO = await GovernanceDAO.deploy(governanceToken.address);
    await governanceToken.mint(voter.address, 100);
  });

  it("allows proposal creation by token holders", async () => {
    await governanceToken.connect(voter).approve(DAO.address, 50);
    await expect(
      DAO.connect(voter).createProposal("Increase reward rate")
    ).to.emit(DAO, "ProposalCreated");
  });

  it("votes and executes proposal after quorum", async () => {
    await governanceToken.connect(voter).approve(DAO.address, 100);
    await DAO.connect(voter).createProposal("Test proposal");
    await DAO.connect(voter).vote(0, true);
    // fast-forward to execution block
    await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600]);
    await ethers.provider.send("evm_mine");
    await expect(DAO.executeProposal(0)).to.emit(DAO, "ProposalExecuted");
  });
});

// integration-crosschain.test.js
describe("ZiGCrossChain Integration", function () {
  let Bridge, MockEndpoint, bridge, endpoint;
  beforeEach(async () => {
    const Mock = await ethers.getContractFactory("MockEndpoint");
    endpoint = await Mock.deploy();
    await endpoint.deployed();
    const BridgeFactory = await ethers.getContractFactory("ZiGCrossChain");
    bridge = await BridgeFactory.deploy(endpoint.address);
    await bridge.deployed();
  });

  it("forwards message to endpoint", async () => {
    await expect(bridge.sendMessage("Hello", 1))
      .to.emit(endpoint, "MessageReceived").withArgs(bridge.address, "Hello", 1);
  });
});

// oracle-hub.test.js
// describe("ZiGOracleHub", function () {
//   let OracleHub, oracleMock, owner;
//   beforeEach(async () => {
//     [owner] = await ethers.getSigners();
//     const Hub = await ethers.getContractFactory("contracts/ZiGT_github/ZiGOracleHub.sol:ZiGOracleHub");
//     const Mock = await ethers.getContractFactory("CustomChainlinkOracle");
//     oracleMock = await Mock.deploy(8);
//     OracleHub = await Hub.deploy(owner.address);
//     await OracleHub.waitForDeployment();
//   });

  
//   it("sets and retrieves price data correctly", async function () {
//     await OracleHub.setOracle("TEST", oracleMock.address, 8, false, false);
//     await oracleMock.setPrice(parseUnits("50", 8));
//     const [rate, decimals] = await OracleHub.getRate("TEST");
//     expect(rate).to.equal(parseUnits("50", 8));
//     expect(decimals).to.equal(8);
//   });

//   it("reverts for unknown symbol", async () => {
//     await expect(OracleHub.getRate("FOO")).to.be.revertedWith("Oracle not found");
//   });
// });

describe("ZiGOracleHub", function () {
  let OracleHub, oracleMock, owner;
  const SYMBOL = encodeBytes32String("TEST");
  beforeEach(async () => {
    [owner] = await ethers.getSigners();
    const Hub = await ethers.getContractFactory("contracts/ZiGT_github/ZiGOracleHub.sol:ZiGOracleHub");
    const Mock = await ethers.getContractFactory("contracts/ZiGT_github/CustomChainlinkOracle.sol:CustomChainlinkOracle");
    oracleMock = await Mock.deploy(8);
    OracleHub = await Hub.deploy(owner.address);
    await OracleHub.waitForDeployment();
  });

  it("sets and retrieves price data correctly", async function () {
    await OracleHub.setOracle(SYMBOL, oracleMock.address, 8, false, false);
    await oracleMock.setPrice(parseUnits("50", 8));
    const [rate, decimals] = await OracleHub.getRate(SYMBOL);
    expect(rate).to.equal(parseUnits("50", 8));
    expect(decimals).to.equal(8);
  });

  it("reverts for unknown symbol", async () => {
    const UNKNOWN = encodeBytes32String("FOO");
    await expect(OracleHub.getRate(UNKNOWN)).to.be.revertedWith("Oracle not found");
  });
});
// soulid-identity.test.js
describe("ZiGSoulboundToken", function () {
  let SBT, owner, addr1;
  beforeEach(async () => {
    [owner, addr1] = await ethers.getSigners();
    const Soul = await ethers.getContractFactory("ZiGSoulboundToken");
    SBT = await Soul.deploy(owner.address);
    await SBT.waitForDeployment();
  });

  it("owner can mint SBT with data", async () => {
    await SBT.connect(owner).mint(addr1.address, "0x1234");
    expect(await SBT.ownerOf(1)).to.equal(addr1.address);
    expect(await SBT.tokenData(1)).to.equal("0x1234");
  });

  it("reverts if non-owner tries to mint", async () => {
    await expect(
      SBT.connect(addr1).mint(addr1.address, "0x1234")
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});

// vault-redistribution.test.js
describe("RedistributionVault", function () {
  let Vault, token, vault, owner, user1, user2;
  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("ERC20Mock");
    token = await Token.deploy("Mock", "MCK");
    await token.mint(owner.address, parseEther("1000"));
    const VaultFactory = await ethers.getContractFactory("RedistributionVault");
    vault = await VaultFactory.deploy(token.address, user1.address, user2.address, owner.address, 2500);
    await vault.deployed();
    await token.connect(owner).approve(vault.address, parseEther("500"));
  });

  it("deposits and allocates funds correctly", async function () {
    await vault.connect(owner).deposit(parseEther("500"));
    // 25% to user1, 75% to user2 (given fee parameters)
    expect(await token.balanceOf(user1.address)).to.equal(parseEther("125"));
    expect(await token.balanceOf(user2.address)).to.equal(parseEther("375"));
  });

  it("reverts if deposit without approval", async function () {
    await token.connect(owner).approve(vault.address, 0);
    await expect(vault.connect(owner).deposit(parseEther("100"))).to.be.reverted;
  });
});

// zigt-core.test.js
describe("ZiGT Core Token", function () {
  let Core, token, owner, recipient;
  beforeEach(async () => {
    [owner, recipient] = await ethers.getSigners();
    const CoreFactory = await ethers.getContractFactory("contracts/ZiGT_github/ZiGT.sol:ZiGT");
    token = await CoreFactory.deploy("CoreToken", "CTK", 18, parseUnits("1000", 18));
    await token.waitForDeployment();
  });

  it("deploys with correct metadata and supply", async () => {
    expect(await token.name()).to.equal("CoreToken");
    expect(await token.symbol()).to.equal("CTK");
    expect(await token.totalSupply()).to.equal(parseUnits("1000", 18));
  });

  it("transfers tokens between accounts", async () => {
    await token.transfer(recipient.address, parseEther("100"));
    expect(await token.balanceOf(recipient.address)).to.equal(parseEther("100"));
  });
});

// other.test.js
describe("Critical Edge Cases and Failing Scenarios", function () {
  let OracleHub, owner;
  beforeEach(async () => {
    [owner] = await ethers.getSigners();
    const Hub = await ethers.getContractFactory("contracts/ZiGT_github/ZiGOracleHub.sol:ZiGOracleHub");
    OracleHub = await Hub.deploy(owner.address);
    await OracleHub.waitForDeployment();
  });

  it("reverts when setting invalid oracle symbol", async () => {
    await expect(
      OracleHub.setOracle("", ZeroAddress, 0, false, false)
    ).to.be.revertedWith("Symbol required");
  });

  it("reverts when removing non-existent oracle", async () => {
    await expect(
      OracleHub.removeOracle("UNKNOWN")
    ).to.be.revertedWith("Oracle not found");
  });
});
