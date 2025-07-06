const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🔧 Fixing ZiGT Vault Configuration...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Get contract instances
  const ZiGT = await ethers.getContractAt("ZiGT", deploymentAddresses.ZiGT);
  const Vault = await ethers.getContractAt("Vault", deploymentAddresses.Vault);

  console.log("\n📊 Current ZiGT Configuration:");
  console.log("===============================");

  // Check current vault address
  const currentVaultAddress = await ZiGT.vaultAddress();
  console.log(`🏦 Current Vault Address: ${currentVaultAddress}`);
  console.log(`🎯 Expected Vault Address: ${deploymentAddresses.Vault}`);

  if (currentVaultAddress === deploymentAddresses.Vault) {
    console.log("✅ Vault address is already correctly set");
  } else {
    console.log("🔧 Setting Vault address in ZiGT...");
    
    try {
      const tx = await ZiGT.setVaultAddress(deploymentAddresses.Vault);
      await tx.wait();
      console.log("✅ Successfully set Vault address in ZiGT");
    } catch (error) {
      console.error("❌ Failed to set Vault address:", error.message);
      return;
    }
  }

  // Verify the configuration
  const updatedVaultAddress = await ZiGT.vaultAddress();
  console.log(`🏦 Updated Vault Address: ${updatedVaultAddress}`);

  // Test if Vault can now mint ZiGT
  console.log("\n🧪 Testing Vault Minting Permission...");
  
  try {
    // Try to mint a small amount through the Vault
    const testAmount = ethers.parseUnits("1", 18);
    const tx = await Vault.mintZiGT(testAmount);
    await tx.wait();
    console.log("✅ Vault can successfully mint ZiGT!");
    
    // Check the balance
    const balance = await ZiGT.balanceOf(deployer.address);
    console.log(`💰 ZiGT Balance: ${ethers.formatUnits(balance, 18)} ZiGT`);
    
  } catch (error) {
    console.log(`❌ Vault minting test failed: ${error.message}`);
  }

  console.log("\n🎉 ZiGT Vault configuration completed!");
}

main().catch((error) => {
  console.error("❌ Fix failed:", error);
  process.exit(1);
}); 