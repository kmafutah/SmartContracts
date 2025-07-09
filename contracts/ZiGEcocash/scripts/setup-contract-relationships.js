const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const networkName = process.env.HARDHAT_NETWORK || "localhost";
  console.log(`🔗 Setting up Contract Relationships on ${networkName.toUpperCase()}...`);
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, `../deployment-addresses-${networkName}.json`);
  if (!fs.existsSync(deploymentPath)) {
    console.error(`❌ Deployment addresses file not found: ${deploymentPath}`);
    console.log("Please run the deployment script first.");
    process.exit(1);
  }

  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("📄 Loaded deployment addresses");

  try {
    console.log("\n🔗 Setting up Contract Relationships...");
    console.log("-".repeat(50));

    // 1. Set ZiGT vault address
    console.log("🏦 Setting ZiGT vault address...");
    const ZiGT = await ethers.getContractAt("ZiGT", deploymentAddresses.ZiGT);
    const setVaultTx = await ZiGT.setVaultAddress(deploymentAddresses.Vault);
    await setVaultTx.wait();
    console.log("✅ ZiGT vault address set");

    // 2. Add ZiG as supported token in Vault
    console.log("🪙 Adding ZiG as supported token in Vault...");
    const Vault = await ethers.getContractAt("Vault", deploymentAddresses.Vault);
    const addTokenTx = await Vault.addSupportedToken(deploymentAddresses.ZiG, 15000); // 150% collateral ratio
    await addTokenTx.wait();
    console.log("✅ ZiG added as supported token in Vault");

    // 3. Update DAO with correct addresses
    console.log("🏛️  Updating DAO addresses...");
    const ReparationsDAO = await ethers.getContractAt("ReparationsDAO", deploymentAddresses.ReparationsDAO);
    const updateDAOTx = await ReparationsDAO.updateReparationNFT(deploymentAddresses.SoulReparationNFT);
    await updateDAOTx.wait();
    const updateUtilityTx = await ReparationsDAO.updateUtilityToken(deploymentAddresses.ZiGUtilityToken);
    await updateUtilityTx.wait();
    console.log("✅ DAO addresses updated");

    // 4. Set up Oracle Hub DAO address
    console.log("🔮 Setting Oracle Hub DAO address...");
    const ZiGOracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);
    const setDaoTx = await ZiGOracleHub.setDaoAddress(deploymentAddresses.ReparationsDAO);
    await setDaoTx.wait();
    console.log("✅ Oracle Hub DAO address set");

    // 5. Set up Governance Token DAO address
    console.log("🗳️  Setting Governance Token DAO address...");
    const ZiGGovernanceToken = await ethers.getContractAt("ZiGGovernanceToken", deploymentAddresses.ZiGGovernanceToken);
    const setDaoInGovTx = await ZiGGovernanceToken.setReparationsDAO(deploymentAddresses.ReparationsDAO);
    await setDaoInGovTx.wait();
    console.log("✅ Governance Token DAO address set");

    // 6. Set up SoulReparationNFT DAO address
    console.log("🎨 Setting SoulReparationNFT DAO address...");
    const SoulReparationNFT = await ethers.getContractAt("SoulReparationNFT", deploymentAddresses.SoulReparationNFT);
    const setDaoInNFTTx = await SoulReparationNFT.setReparationsDAO(deploymentAddresses.ReparationsDAO);
    await setDaoInNFTTx.wait();
    console.log("✅ SoulReparationNFT DAO address set");

    // 7. Set up RegionalStablecoins
    console.log("🌍 Setting up RegionalStablecoins...");
    const RegionalStablecoins = await ethers.getContractAt("RegionalStablecoins", deploymentAddresses.RegionalStablecoins);
    
    // Add African regions
    const regions = [
      { name: "North African Stablecoin", symbol: "NAS", weights: [40, 30, 30] },
      { name: "West African Stablecoin", symbol: "WAS", weights: [35, 30, 35] },
      { name: "Central African Stablecoin", symbol: "CAS", weights: [30, 35, 35] },
      { name: "East African Stablecoin", symbol: "EAS", weights: [35, 25, 40] },
      { name: "Southern African Stablecoin", symbol: "SAS", weights: [35, 30, 35] },
      { name: "African Union Stablecoin", symbol: "AUS", weights: [40, 25, 35] }
    ];

    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];
      const addRegionTx = await RegionalStablecoins.addRegionalStablecoin(
        region.name,
        region.symbol,
        ethers.parseUnits("1000", 18), // initial supply
        region.weights[0], // crypto weight
        region.weights[1], // metal weight
        region.weights[2]  // fiat weight
      );
      await addRegionTx.wait();
      console.log(`✅ Added region: ${region.name} (${region.symbol})`);
    }

    console.log("\n🎉 Contract Relationships Setup Complete!");
    console.log("=" .repeat(50));
    console.log("✅ All contracts are now properly connected");
    console.log("✅ Regional stablecoins configured");
    console.log("✅ DAO governance system ready");
    console.log("✅ Vault collateral system active");
    console.log("\n📋 Next Steps:");
    console.log("1. Update oracle prices: python3 update_oracle.py");
    console.log("2. Check configuration: npx hardhat run scripts/check-contract-configuration.js --network " + networkName);
    console.log("3. Test user onboarding: npx hardhat run scripts/user-onboarding.js --network " + networkName);

  } catch (error) {
    console.error("❌ Contract relationship setup failed:", error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Setup script failed:", error);
  process.exit(1);
}); 