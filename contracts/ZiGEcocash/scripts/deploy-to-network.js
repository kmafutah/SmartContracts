const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const networkName = process.env.HARDHAT_NETWORK || "localhost";
  console.log(`🚀 Deploying ZiG Ecosystem to ${networkName.toUpperCase()}...`);
  console.log("=" .repeat(50));
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Check if we have enough balance for deployment
  const balance = await ethers.provider.getBalance(deployer.address);
  if (balance < ethers.parseEther("0.01")) {
    console.log("⚠️  Warning: Low balance. Some networks may require more ETH for gas.");
  }

  const deploymentAddresses = {};

  try {
    console.log("\n📦 Phase 1: Deploying Core Economic Infrastructure...");
    console.log("-".repeat(50));

    // 1. Deploy Oracle Hub
    console.log("🔮 Deploying ZiGOracleHub...");
    const ZiGOracleHub = await ethers.getContractFactory("ZiGOracleHub");
    const oracleHub = await ZiGOracleHub.deploy();
    await oracleHub.waitForDeployment();
    deploymentAddresses.ZiGOracleHub = await oracleHub.getAddress();
    console.log("✅ ZiGOracleHub deployed to:", deploymentAddresses.ZiGOracleHub);

    // 2. Deploy ZiG Token
    console.log("🪙 Deploying ZiG Token...");
    const ZiG = await ethers.getContractFactory("ZiG");
    const zig = await ZiG.deploy();
    await zig.waitForDeployment();
    deploymentAddresses.ZiG = await zig.getAddress();
    console.log("✅ ZiG Token deployed to:", deploymentAddresses.ZiG);

    // 3. Deploy ZiGT Token
    console.log("🪙 Deploying ZiGT Token...");
    const ZiGT = await ethers.getContractFactory("ZiGT");
    const zigt = await ZiGT.deploy(deploymentAddresses.ZiG, deploymentAddresses.ZiGOracleHub);
    await zigt.waitForDeployment();
    deploymentAddresses.ZiGT = await zigt.getAddress();
    console.log("✅ ZiGT Token deployed to:", deploymentAddresses.ZiGT);

    // 4. Deploy Vault
    console.log("🏦 Deploying Vault...");
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(
      deploymentAddresses.ZiG, // ZiG token address
      deployer.address, // Treasury
      deployer.address, // FutureReserve
      deployer.address, // DiasporaFund
      deploymentAddresses.ZiG, // ZiG contract address
      deploymentAddresses.ZiGT, // ZiGT contract address
      deploymentAddresses.ZiGOracleHub, // Oracle Hub
      ethers.ZeroAddress // PAXG (zero for now)
    );
    await vault.waitForDeployment();
    deploymentAddresses.Vault = await vault.getAddress();
    console.log("✅ Vault deployed to:", deploymentAddresses.Vault);

    // 5. Deploy ZiGWallet
    console.log("👛 Deploying ZiGWallet...");
    const ZiGWallet = await ethers.getContractFactory("ZiGWallet");
    const wallet = await ZiGWallet.deploy();
    await wallet.waitForDeployment();
    deploymentAddresses.ZiGWallet = await wallet.getAddress();
    console.log("✅ ZiGWallet deployed to:", deploymentAddresses.ZiGWallet);

    console.log("\n📦 Phase 2: Deploying Identity & Governance...");
    console.log("-".repeat(50));

    // 6. Deploy Soulbound Token
    console.log("🆔 Deploying ZiGSoulboundToken...");
    const ZiGSoulboundToken = await ethers.getContractFactory("ZiGSoulboundToken");
    const soulbound = await ZiGSoulboundToken.deploy();
    await soulbound.waitForDeployment();
    deploymentAddresses.ZiGSoulboundToken = await soulbound.getAddress();
    console.log("✅ ZiGSoulboundToken deployed to:", deploymentAddresses.ZiGSoulboundToken);

    // 7. Deploy AccessVerifier
    console.log("🔐 Deploying AccessVerifier...");
    const AccessVerifier = await ethers.getContractFactory("AccessVerifier");
    const accessVerifier = await AccessVerifier.deploy();
    await accessVerifier.waitForDeployment();
    deploymentAddresses.AccessVerifier = await accessVerifier.getAddress();
    console.log("✅ AccessVerifier deployed to:", deploymentAddresses.AccessVerifier);

    // 8. Deploy EthicalGuard
    console.log("🛡️  Deploying EthicalGuard...");
    const EthicalGuard = await ethers.getContractFactory("EthicalGuard");
    const ethicalGuard = await EthicalGuard.deploy(deploymentAddresses.AccessVerifier);
    await ethicalGuard.waitForDeployment();
    deploymentAddresses.EthicalGuard = await ethicalGuard.getAddress();
    console.log("✅ EthicalGuard deployed to:", deploymentAddresses.EthicalGuard);

    // 9. Deploy Governance Token
    console.log("🗳️  Deploying ZiGGovernanceToken...");
    const ZiGGovernanceToken = await ethers.getContractFactory("ZiGGovernanceToken");
    const governanceToken = await ZiGGovernanceToken.deploy();
    await governanceToken.waitForDeployment();
    deploymentAddresses.ZiGGovernanceToken = await governanceToken.getAddress();
    console.log("✅ ZiGGovernanceToken deployed to:", deploymentAddresses.ZiGGovernanceToken);

    // 10. Deploy ReparationsDAO
    console.log("🏛️  Deploying ReparationsDAO...");
    const ReparationsDAO = await ethers.getContractFactory("ReparationsDAO");
    const dao = await ReparationsDAO.deploy(
      deployer.address, // initialOwner
      deploymentAddresses.ZiGGovernanceToken, // governanceToken
      deploymentAddresses.EthicalGuard, // ethicalGuard
      ethers.ZeroAddress, // reparationNFT (will be set later)
      ethers.ZeroAddress // utilityToken (will be set later)
    );
    await dao.waitForDeployment();
    deploymentAddresses.ReparationsDAO = await dao.getAddress();
    console.log("✅ ReparationsDAO deployed to:", deploymentAddresses.ReparationsDAO);

    console.log("\n📦 Phase 3: Deploying Cultural & Utility Layer...");
    console.log("-".repeat(50));

    // 11. Deploy SoulReparationNFT
    console.log("🎨 Deploying SoulReparationNFT...");
    const SoulReparationNFT = await ethers.getContractFactory("SoulReparationNFT");
    const soulNFT = await SoulReparationNFT.deploy();
    await soulNFT.waitForDeployment();
    deploymentAddresses.SoulReparationNFT = await soulNFT.getAddress();
    console.log("✅ SoulReparationNFT deployed to:", deploymentAddresses.SoulReparationNFT);

    // 12. Deploy ZiGNFT
    console.log("🎨 Deploying ZiGNFT...");
    const ZiGNFT = await ethers.getContractFactory("ZiGNFT");
    const zigNFT = await ZiGNFT.deploy();
    await zigNFT.waitForDeployment();
    deploymentAddresses.ZiGNFT = await zigNFT.getAddress();
    console.log("✅ ZiGNFT deployed to:", deploymentAddresses.ZiGNFT);

    // 13. Deploy ZiGUtilityToken
    console.log("🔧 Deploying ZiGUtilityToken...");
    const ZiGUtilityToken = await ethers.getContractFactory("ZiGUtilityToken");
    const utilityToken = await ZiGUtilityToken.deploy();
    await utilityToken.waitForDeployment();
    deploymentAddresses.ZiGUtilityToken = await utilityToken.getAddress();
    console.log("✅ ZiGUtilityToken deployed to:", deploymentAddresses.ZiGUtilityToken);

    // 14. Deploy ZiGRWAToken
    console.log("🏠 Deploying ZiGRWAToken...");
    const ZiGRWAToken = await ethers.getContractFactory("ZiGRWAToken");
    const rwaToken = await ZiGRWAToken.deploy();
    await rwaToken.waitForDeployment();
    deploymentAddresses.ZiGRWAToken = await rwaToken.getAddress();
    console.log("✅ ZiGRWAToken deployed to:", deploymentAddresses.ZiGRWAToken);

    // 15. Deploy ZiGMemeToken
    console.log("😄 Deploying ZiGMemeToken...");
    const ZiGMemeToken = await ethers.getContractFactory("ZiGMemeToken");
    const memeToken = await ZiGMemeToken.deploy();
    await memeToken.waitForDeployment();
    deploymentAddresses.ZiGMemeToken = await memeToken.getAddress();
    console.log("✅ ZiGMemeToken deployed to:", deploymentAddresses.ZiGMemeToken);

    console.log("\n📦 Phase 4: Deploying GameFi Expansion...");
    console.log("-".repeat(50));

    // 16. Deploy ZiGGameFiToken
    console.log("🎮 Deploying ZiGGameFiToken...");
    const ZiGGameFiToken = await ethers.getContractFactory("ZiGGameFiToken");
    const gameFiToken = await ZiGGameFiToken.deploy();
    await gameFiToken.waitForDeployment();
    deploymentAddresses.ZiGGameFiToken = await gameFiToken.getAddress();
    console.log("✅ ZiGGameFiToken deployed to:", deploymentAddresses.ZiGGameFiToken);

    // 17. Deploy ZiGBondingCurve
    console.log("📈 Deploying ZiGBondingCurve...");
    const ZiGBondingCurve = await ethers.getContractFactory("ZiGBondingCurve");
    const bondingCurve = await ZiGBondingCurve.deploy();
    await bondingCurve.waitForDeployment();
    deploymentAddresses.ZiGBondingCurve = await bondingCurve.getAddress();
    console.log("✅ ZiGBondingCurve deployed to:", deploymentAddresses.ZiGBondingCurve);

    // 18. Deploy RegionalStablecoins
    console.log("🌍 Deploying RegionalStablecoins...");
    const RegionalStablecoins = await ethers.getContractFactory("RegionalStablecoins");
    const regionalStablecoins = await RegionalStablecoins.deploy();
    await regionalStablecoins.waitForDeployment();
    deploymentAddresses.RegionalStablecoins = await regionalStablecoins.getAddress();
    console.log("✅ RegionalStablecoins deployed to:", deploymentAddresses.RegionalStablecoins);

    console.log("\n🔗 Phase 5: Setting up Contract Relationships...");
    console.log("-".repeat(50));

    // Set up contract relationships
    console.log("🔗 Setting up contract relationships...");
    
    // Update ZiGT vault address
    const setVaultTx = await zigt.setVaultAddress(deploymentAddresses.Vault);
    await setVaultTx.wait();
    console.log("✅ ZiGT vault address set");

    // Add ZiG as supported token in Vault
    const addTokenTx = await vault.addSupportedToken(deploymentAddresses.ZiG, 15000); // 150% collateral ratio
    await addTokenTx.wait();
    console.log("✅ ZiG added as supported token in Vault");

    // Update DAO with correct addresses
    const updateDAOTx = await dao.updateReparationNFT(deploymentAddresses.SoulReparationNFT);
    await updateDAOTx.wait();
    const updateUtilityTx = await dao.updateUtilityToken(deploymentAddresses.ZiGUtilityToken);
    await updateUtilityTx.wait();
    console.log("✅ DAO addresses updated");

    // Set up Oracle Hub DAO address
    const setDaoTx = await oracleHub.setDaoAddress(deploymentAddresses.ReparationsDAO);
    await setDaoTx.wait();
    console.log("✅ Oracle Hub DAO address set");

    // Set up Governance Token DAO address
    const setDaoInGovTx = await governanceToken.setReparationsDAO(deploymentAddresses.ReparationsDAO);
    await setDaoInGovTx.wait();
    console.log("✅ Governance Token DAO address set");

    // Set up SoulReparationNFT DAO address
    const setDaoInNFTTx = await soulNFT.setReparationsDAO(deploymentAddresses.ReparationsDAO);
    await setDaoInNFTTx.wait();
    console.log("✅ SoulReparationNFT DAO address set");

    // Save deployment addresses
    const deploymentPath = path.join(__dirname, `../deployment-addresses-${networkName}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentAddresses, null, 2));
    console.log(`✅ Deployment addresses saved to: deployment-addresses-${networkName}.json`);

    console.log("\n🎉 Deployment Complete!");
    console.log("=" .repeat(50));
    console.log(`Network: ${networkName.toUpperCase()}`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Total Contracts Deployed: ${Object.keys(deploymentAddresses).length}`);
    console.log("\n📋 Next Steps:");
    console.log("1. Update oracle prices: python3 update_oracle.py");
    console.log("2. Check configuration: npx hardhat run scripts/check-contract-configuration.js --network " + networkName);
    console.log("3. Test user onboarding: npx hardhat run scripts/user-onboarding.js --network " + networkName);

  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Deployment script failed:", error);
  process.exit(1);
}); 