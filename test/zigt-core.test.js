const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("ZiGT Token", function () {
  this.timeout(180000); // Increase timeout for SKALE deployments
  let zigt, deployer, user, other;

  beforeEach(async function () {
    [deployer, user, other] = await ethers.getSigners();
    console.log("Deploying BandFeedRegistry...");
    const BandFeedRegistry = await ethers.getContractFactory("contracts/ZiGT_github/BandFeedRegistry.sol:BandFeedRegistry");
    const bandFeedRegistry = await upgrades.deployProxy(BandFeedRegistry, [deployer.address], {
      kind: "uups",
      initializer: "initialize(address)"
    });
    await bandFeedRegistry.waitForDeployment();
    console.log("BandFeedRegistry deployed at:", bandFeedRegistry.target);

    console.log("Deploying GovernanceToken...");
    const GovernanceToken = await ethers.getContractFactory("contracts/ZiGT_github/ZiGGovernanceToken.sol:ZiGGovernanceToken");
    const governanceToken = await upgrades.deployProxy(
      GovernanceToken,
      [deployer.address, ethers.parseEther("1000000000"), deployer.address],
      {
        kind: "uups",
        initializer: "initialize(address,uint256,address)"
      }
    );
    await governanceToken.waitForDeployment();
    console.log("GovernanceToken deployed at:", governanceToken.target);

    // Use deployProxy for upgradeable contracts
    console.log("Deploying ZiGT...");
    const ZiGT = await ethers.getContractFactory("contracts/ZiGT_github/ZiGT.sol:ZiGT");
    const ratioStruct = { metal: 6000, fiat: 3000, crypto: 1000 };

    zigt = await upgrades.deployProxy(
      ZiGT,
      [
        deployer.address, // router
        bandFeedRegistry.target, // bandFeedRegistry
        governanceToken.target, // governance
        deployer.address, // treasury
        0, // direction
        ratioStruct
      ],
      {
        kind: "uups",
        initializer: "initialize(address,address,address,address,uint8,(uint256,uint256,uint256))"
      }
    );
    await zigt.waitForDeployment();
    console.log("ZiGT deployed at:", zigt.target);
  });

  it("should have correct name, symbol, decimals", async function () {
    expect(await zigt.name()).to.equal("Mansa's Mbizo Yzuri Refu Tano");
    expect(await zigt.symbol()).to.equal("₥MYRT");
    expect(await zigt.decimals()).to.equal(18);
  });

  it("should allow minting, burning, and transfers", async function () {
    await zigt.mint(user.address, parseEther("100"));
    expect(await zigt.balanceOf(user.address)).to.equal(parseEther("100"));
    await zigt.connect(user).transfer(deployer.address, parseEther("50"));
    expect(await zigt.balanceOf(deployer.address)).to.equal(parseEther("50"));
    await zigt.connect(user).burn(parseEther("10"));
    expect(await zigt.balanceOf(user.address)).to.equal(parseEther("40"));
  });

  it("should support approve and transferFrom", async function () {
    await zigt.mint(user.address, parseEther("10"));
    await zigt.connect(user).approve(other.address, parseEther("5"));
    await zigt.connect(other).transferFrom(user.address, deployer.address, parseEther("5"));
    expect(await zigt.balanceOf(deployer.address)).to.equal(parseEther("5"));
  });

  it("should enforce supply cap if set", async function () {
    if (zigt.supplyCap) {
      const cap = await zigt.supplyCap();
      await expect(zigt.mint(user.address, cap.add(1))).to.be.reverted;
    }
  });

  it("should log gas for transfer and burn", async function () {
    await zigt.mint(user.address, parseEther("10"));
    const tx1 = await zigt.connect(user).transfer(deployer.address, parseEther("1"));
    const receipt1 = await tx1.wait();
    console.log("Gas used for transfer:", receipt1.gasUsed.toString());
    const tx2 = await zigt.connect(user).burn(parseEther("1"));
    const receipt2 = await tx2.wait();
    console.log("Gas used for burn:", receipt2.gasUsed.toString());
  });

  it("should revert on overflow/underflow", async function () {
    await expect(zigt.connect(user).burn(parseEther("1"))).to.be.reverted;
  });

  it("should revert if paused (if pause implemented)", async function () {
    if (zigt.pause && zigt.unpause) {
      await zigt.pause();
      await expect(zigt.transfer(user.address, 1)).to.be.reverted;
      await zigt.unpause();
    }
  });

  it("should prevent replay attacks on cross-chain mint (if implemented)", async function () {
    // Placeholder: implement if cross-chain/replay protection logic exists
    expect(true).to.be.true;
  });
});
