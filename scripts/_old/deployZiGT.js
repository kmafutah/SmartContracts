const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  const [deployer] = await ethers.getSigners();

  console.log(`🔐 Deploying ZiGT system on ${network} as ${deployer.address}`);
  const deploymentsDir = path.join(__dirname, `../deployments`);
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);

  // --- 1. FeedRegistry ---
  console.log("📦 Deploying FeedRegistry...");
  const FeedRegistry = await ethers.getContractFactory("FeedRegistry");
  const feedRegistry = await upgrades.deployProxy(FeedRegistry, [], {
    initializer: false,
    kind: "uups"
  });
  await feedRegistry.waitForDeployment();
  const feedRegistryAddress = await feedRegistry.getAddress();
  console.log("✅ FeedRegistry:", feedRegistryAddress);

  // --- 2. ZiGTToken ---
  console.log("📦 Deploying ZiGTToken...");
  const ZiGTToken = await ethers.getContractFactory("ZiGTToken");
  const zigtToken = await upgrades.deployProxy(ZiGTToken, [
    ethers.ZeroAddress, // ZiGT core will set this later
    feedRegistryAddress,
    "ZiGT Token", "ZiGT", "1"
  ], {
    initializer: "initialize",
    kind: "uups"
  });
  await zigtToken.waitForDeployment();
  const zigtTokenAddress = await zigtToken.getAddress();
  console.log("✅ ZiGTToken:", zigtTokenAddress);

  // --- 3. RedistributionVault ---
  console.log("📦 Deploying RedistributionVault...");
  const RedistributionVault = await ethers.getContractFactory("RedistributionVault");
  const redistributionVault = await upgrades.deployProxy(RedistributionVault, [
    zigtTokenAddress,
    deployer.address, deployer.address, deployer.address, // treasury, diaspora, restitution
    2500 // 25% min redistribution share
  ], {
    initializer: "initialize",
    kind: "uups"
  });
  await redistributionVault.waitForDeployment();
  const vaultAddress = await redistributionVault.getAddress();
  console.log("✅ RedistributionVault:", vaultAddress);

  // --- 4. ZiGGovernanceToken ---
  console.log("📦 Deploying ZiGGovernanceToken...");
  const GovernanceToken = await ethers.getContractFactory("ZiGGovernanceToken");
  const govToken = await upgrades.deployProxy(GovernanceToken, [
    deployer.address,
    ethers.parseUnits("1000000", 18),
    deployer.address
  ], {
    initializer: "initialize",
    kind: "uups"
  });
  await govToken.waitForDeployment();
  const govTokenAddress = await govToken.getAddress();
  console.log("✅ ZiGGovernanceToken:", govTokenAddress);

  // --- 5. ZiGGovernance (chainlink-ccip receiver) ---
  console.log("📦 Deploying ZiGGovernance...");
  const Governance = await ethers.getContractFactory("ZiGGovernance");
  const gov = await Governance.deploy(
    deployer.address,
    "ZiGT Governance", "ZGT-GOV", "1"
  );
  await gov.waitForDeployment();
  const govAddress = await gov.getAddress();
  console.log("✅ ZiGGovernance:", govAddress);

  // --- 6. ZiGT core contract ---
  console.log("📦 Deploying ZiGT core...");
  const ZiGT = await ethers.getContractFactory("ZiGT");
  const zigtCore = await upgrades.deployProxy(ZiGT, [
    deployer.address, // CCIP router (can be zero for now)
    govAddress,
    deployer.address,
    4, // StrategicDirection.ZiGMirrorModel
    { metals: 3600, fiat: 3200, crypto: 3200 } // ReserveRatio
  ], {
    initializer: "initialize",
    kind: "uups"
  });
  await zigtCore.waitForDeployment();
  const zigtCoreAddress = await zigtCore.getAddress();
  console.log("✅ ZiGT core:", zigtCoreAddress);

  // --- Link ZiGTToken to core ---
  console.log("🔗 Linking ZiGTToken to core...");
  await (await zigtToken.setZiGT(zigtCoreAddress)).wait();

  // --- Save and verify ---
  const info = {
    network,
    timestamp: new Date().toISOString(),
    FeedRegistry: feedRegistryAddress,
    ZiGTToken: zigtTokenAddress,
    RedistributionVault: vaultAddress,
    ZiGGovernanceToken: govTokenAddress,
    ZiGGovernance: govAddress,
    ZiGT: zigtCoreAddress,
  };
  fs.writeFileSync(path.join(deploymentsDir, `deployment-ZiGT-${network}.json`), JSON.stringify(info, null, 2));

  console.log("✅ Deployment complete!");
}

main().catch((err) => {
  console.error("❌ Deployment error:", err);
  process.exit(1);
});
