const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting Simple ZiGEcocash deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Store deployment addresses
  const deploymentAddresses = {};

  try {
    // Phase 1: Core Economic Infrastructure (without circular dependencies)
    console.log("\n📊 Phase 1: Deploying Core Economic Infrastructure");
    
    // Deploy ZiGOracleHub first
    console.log("Deploying ZiGOracleHub...");
    const ZiGOracleHub = await ethers.getContractFactory("ZiGOracleHub");
    const oracleHub = await ZiGOracleHub.deploy(deployer.address);
    await oracleHub.waitForDeployment();
    deploymentAddresses.ZiGOracleHub = await oracleHub.getAddress();
    console.log("✅ ZiGOracleHub deployed to:", deploymentAddresses.ZiGOracleHub);

    // Deploy ZiG (governance token)
    console.log("Deploying ZiG...");
    const ZiG = await ethers.getContractFactory("ZiG");
    const zig = await ZiG.deploy(0); // initialGoldBacking set to 0 for now
    await zig.waitForDeployment();
    deploymentAddresses.ZiG = await zig.getAddress();
    console.log("✅ ZiG deployed to:", deploymentAddresses.ZiG);

    // Deploy ZiGSoulboundToken
    console.log("Deploying ZiGSoulboundToken...");
    const ZiGSoulboundToken = await ethers.getContractFactory("ZiGSoulboundToken");
    const soulboundToken = await ZiGSoulboundToken.deploy();
    await soulboundToken.waitForDeployment();
    deploymentAddresses.ZiGSoulboundToken = await soulboundToken.getAddress();
    console.log("✅ ZiGSoulboundToken deployed to:", deploymentAddresses.ZiGSoulboundToken);

    // Deploy AccessVerifier (using fully qualified name)
    console.log("Deploying AccessVerifier...");
    const AccessVerifier = await ethers.getContractFactory("contracts/governance_identity_soulbound_statehood/AccessVerifier.sol:AccessVerifier");
    const accessVerifier = await AccessVerifier.deploy(deploymentAddresses.ZiGSoulboundToken);
    await accessVerifier.waitForDeployment();
    deploymentAddresses.AccessVerifier = await accessVerifier.getAddress();
    console.log("✅ AccessVerifier deployed to:", deploymentAddresses.AccessVerifier);

    // Deploy EthicalGuard
    console.log("Deploying EthicalGuard...");
    const EthicalGuard = await ethers.getContractFactory("EthicalGuard");
    const ethicalGuard = await EthicalGuard.deploy(
      deployer.address, // initialOwner
      deploymentAddresses.AccessVerifier // accessVerifier
    );
    await ethicalGuard.waitForDeployment();
    deploymentAddresses.EthicalGuard = await ethicalGuard.getAddress();
    console.log("✅ EthicalGuard deployed to:", deploymentAddresses.EthicalGuard);

    // Deploy ZiGGovernanceToken
    console.log("Deploying ZiGGovernanceToken...");
    const ZiGGovernanceToken = await ethers.getContractFactory("ZiGGovernanceToken");
    const governanceToken = await ZiGGovernanceToken.deploy(
      ethers.parseUnits("1000000", 18) // maxSupply
    );
    await governanceToken.waitForDeployment();
    deploymentAddresses.ZiGGovernanceToken = await governanceToken.getAddress();
    console.log("✅ ZiGGovernanceToken deployed to:", deploymentAddresses.ZiGGovernanceToken);

    // Deploy SoulReparationNFT (with temporary DAO address to break circular dependency)
    console.log("Deploying SoulReparationNFT...");
    const SoulReparationNFT = await ethers.getContractFactory("SoulReparationNFT");
    const soulReparationNFT = await SoulReparationNFT.deploy(
      deployer.address // temporary DAO address (will be updated later)
    );
    await soulReparationNFT.waitForDeployment();
    deploymentAddresses.SoulReparationNFT = await soulReparationNFT.getAddress();
    console.log("✅ SoulReparationNFT deployed to:", deploymentAddresses.SoulReparationNFT);

    // Deploy ReparationsDAO
    console.log("Deploying ReparationsDAO...");
    const ReparationsDAO = await ethers.getContractFactory("ReparationsDAO");
    const reparationsDAO = await ReparationsDAO.deploy(
      deployer.address, // initialOwner
      deploymentAddresses.ZiGGovernanceToken, // governanceToken
      deploymentAddresses.EthicalGuard, // ethicalGuard
      deploymentAddresses.SoulReparationNFT // reparationNFT
    );
    await reparationsDAO.waitForDeployment();
    deploymentAddresses.ReparationsDAO = await reparationsDAO.getAddress();
    console.log("✅ ReparationsDAO deployed to:", deploymentAddresses.ReparationsDAO);

    // Update SoulReparationNFT with the real DAO address
    console.log("Updating SoulReparationNFT DAO reference...");
    const updateTx = await soulReparationNFT.setReparationsDAO(deploymentAddresses.ReparationsDAO);
    await updateTx.wait();
    console.log("✅ SoulReparationNFT DAO reference updated");

    // Deploy ZiGNFT
    console.log("Deploying ZiGNFT...");
    const ZiGNFT = await ethers.getContractFactory("ZiGNFT");
    const zigNFT = await ZiGNFT.deploy();
    await zigNFT.waitForDeployment();
    deploymentAddresses.ZiGNFT = await zigNFT.getAddress();
    console.log("✅ ZiGNFT deployed to:", deploymentAddresses.ZiGNFT);

    // Deploy ZiGRWAToken
    console.log("Deploying ZiGRWAToken...");
    const ZiGRWAToken = await ethers.getContractFactory("ZiGRWAToken");
    const rwaToken = await ZiGRWAToken.deploy();
    await rwaToken.waitForDeployment();
    deploymentAddresses.ZiGRWAToken = await rwaToken.getAddress();
    console.log("✅ ZiGRWAToken deployed to:", deploymentAddresses.ZiGRWAToken);

    // Deploy ZiGUtilityToken
    console.log("Deploying ZiGUtilityToken...");
    const ZiGUtilityToken = await ethers.getContractFactory("ZiGUtilityToken");
    const utilityToken = await ZiGUtilityToken.deploy();
    await utilityToken.waitForDeployment();
    deploymentAddresses.ZiGUtilityToken = await utilityToken.getAddress();
    console.log("✅ ZiGUtilityToken deployed to:", deploymentAddresses.ZiGUtilityToken);

    // Deploy ZiGMemeToken
    console.log("Deploying ZiGMemeToken...");
    const ZiGMemeToken = await ethers.getContractFactory("ZiGMemeToken");
    const memeToken = await ZiGMemeToken.deploy();
    await memeToken.waitForDeployment();
    deploymentAddresses.ZiGMemeToken = await memeToken.getAddress();
    console.log("✅ ZiGMemeToken deployed to:", deploymentAddresses.ZiGMemeToken);

    // Deploy ZiGGameFiToken
    console.log("Deploying ZiGGameFiToken...");
    const ZiGGameFiToken = await ethers.getContractFactory("ZiGGameFiToken");
    const gameFiToken = await ZiGGameFiToken.deploy();
    await gameFiToken.waitForDeployment();
    deploymentAddresses.ZiGGameFiToken = await gameFiToken.getAddress();
    console.log("✅ ZiGGameFiToken deployed to:", deploymentAddresses.ZiGGameFiToken);

    // Deploy ZiGBondingCurve
    console.log("Deploying ZiGBondingCurve...");
    const ZiGBondingCurve = await ethers.getContractFactory("ZiGBondingCurve");
    const bondingCurve = await ZiGBondingCurve.deploy();
    await bondingCurve.waitForDeployment();
    deploymentAddresses.ZiGBondingCurve = await bondingCurve.getAddress();
    console.log("✅ ZiGBondingCurve deployed to:", deploymentAddresses.ZiGBondingCurve);

    // Deploy ZiGWallet
    console.log("Deploying ZiGWallet...");
    const ZiGWallet = await ethers.getContractFactory("ZiGWallet");
    const zigWallet = await ZiGWallet.deploy(deployer.address);
    await zigWallet.waitForDeployment();
    deploymentAddresses.ZiGWallet = await zigWallet.getAddress();
    console.log("✅ ZiGWallet deployed to:", deploymentAddresses.ZiGWallet);

    // Save deployment addresses
    const deploymentPath = path.join(__dirname, "../deployment-addresses.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentAddresses, null, 2));
    
    console.log("\n🎉 Simple deployment completed successfully!");
    console.log("📄 Deployment addresses saved to: deployment-addresses.json");
    
    console.log("\n📋 Deployment Summary:");
    console.log("========================");
    Object.entries(deploymentAddresses).forEach(([contract, address]) => {
      console.log(`${contract}: ${address}`);
    });

    console.log("\n⚠️  Note: ZiGT and Vault contracts were skipped due to circular dependency.");
    console.log("   These can be deployed separately once the dependency issue is resolved.");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 