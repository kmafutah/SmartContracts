const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🔧 Fixing Vault Configuration...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ No deployment addresses found. Run deployment first.");
    return;
  }
  
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("📄 Loaded deployment addresses");

  // Get Vault contract instance
  const Vault = await ethers.getContractAt("Vault", deploymentAddresses.Vault);
  console.log("🔗 Connected to Vault:", deploymentAddresses.Vault);

  // Check if ZiG is already a supported token
  const isSupported = await Vault.isSupportedToken(deploymentAddresses.ZiG);
  console.log(`🔍 ZiG is supported token: ${isSupported}`);

  if (!isSupported) {
    console.log("🔧 Adding ZiG as supported token with 150% collateral ratio...");
    
    try {
      const tx = await Vault.addSupportedToken(deploymentAddresses.ZiG, 15000); // 150% = 15000 basis points
      await tx.wait();
      console.log("✅ Successfully added ZiG as supported token");
    } catch (error) {
      console.error("❌ Failed to add ZiG as supported token:", error.message);
      return;
    }
  } else {
    console.log("ℹ️ ZiG is already a supported token");
  }

  // Verify the configuration
  const isSupportedAfter = await Vault.isSupportedToken(deploymentAddresses.ZiG);
  const collateralRatio = await Vault.collateralRatio(deploymentAddresses.ZiG);
  const supportedTokensCount = await Vault.getSupportedTokensCount();
  
  console.log("\n📊 Vault Configuration Summary:");
  console.log("================================");
  console.log(`ZiG is supported: ${isSupportedAfter}`);
  console.log(`ZiG collateral ratio: ${collateralRatio} basis points (${Number(collateralRatio)/100}%)`);
  console.log(`Total supported tokens: ${supportedTokensCount}`);
  
  // List all supported tokens
  console.log("\n📋 Supported Tokens:");
  for (let i = 0; i < supportedTokensCount; i++) {
    const token = await Vault.supportedTokens(i);
    const ratio = await Vault.collateralRatio(token);
    console.log(`  ${token}: ${ratio} basis points (${Number(ratio)/100}%)`);
  }

  console.log("\n🎉 Vault configuration fixed successfully!");
  console.log("💡 You can now use ZiG as collateral for minting ZiGT");
}

main().catch((error) => {
  console.error("❌ Fix failed:", error);
  process.exit(1);
}); 