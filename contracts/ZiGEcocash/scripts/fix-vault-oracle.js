const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔧 Fixing Vault Oracle Hub Configuration...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  console.log("\n📊 Current Vault Configuration:");
  console.log("================================");
  console.log(`Current Vault: ${deploymentAddresses.Vault}`);
  console.log(`Correct Oracle Hub: ${deploymentAddresses.ZiGOracleHub}`);
  console.log(`ZiG Token: ${deploymentAddresses.ZiG}`);
  console.log(`ZiGT Token: ${deploymentAddresses.ZiGT}`);

  // Check current Vault oracle hub
  try {
    const currentVault = await ethers.getContractAt("Vault", deploymentAddresses.Vault);
    const currentOracleHub = await currentVault.oracleHub();
    console.log(`Current Vault oracle hub: ${currentOracleHub}`);
    
    if (currentOracleHub.toLowerCase() !== deploymentAddresses.ZiGOracleHub.toLowerCase()) {
      console.log("❌ Vault using wrong oracle hub - needs redeployment");
    } else {
      console.log("✅ Vault already using correct oracle hub");
      return;
    }
  } catch (error) {
    console.log("⚠️  Could not check current Vault:", error.message);
  }

  console.log("\n🚀 Redeploying Vault with correct oracle hub...");
  
  try {
    // Deploy new Vault with correct parameters
    const Vault = await ethers.getContractFactory("Vault");
    const newVault = await Vault.deploy(
      deploymentAddresses.ZiG, // ZiG token address
      deployer.address, // Treasury (using deployer for now)
      deployer.address, // FutureReserve (using deployer for now)
      deployer.address, // DiasporaFund (using deployer for now)
      deploymentAddresses.ZiG, // ZiG contract address
      deploymentAddresses.ZiGT, // ZiGT contract address
      deploymentAddresses.ZiGOracleHub, // Oracle Hub (correct address)
      ethers.ZeroAddress // PAXG (zero address for now)
    );
    await newVault.waitForDeployment();
    
    const newVaultAddress = await newVault.getAddress();
    console.log("✅ New Vault deployed to:", newVaultAddress);
    
    // Update the deployment addresses
    deploymentAddresses.Vault = newVaultAddress;
    
    // Save updated addresses
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentAddresses, null, 2));
    console.log("✅ Updated deployment addresses file");
    
    // Update ZiGT vault address
    console.log("\n🔗 Updating ZiGT vault address...");
    const ZiGT = await ethers.getContractAt("ZiGT", deploymentAddresses.ZiGT);
    const setVaultTx = await ZiGT.setVaultAddress(newVaultAddress);
    await setVaultTx.wait();
    console.log("✅ ZiGT vault address updated");
    
    // Add ZiG as supported token in new Vault
    console.log("\n🔗 Adding ZiG as supported token in new Vault...");
    try {
      const addTokenTx = await newVault.addSupportedToken(deploymentAddresses.ZiG, 15000); // 150% collateral ratio
      await addTokenTx.wait();
      console.log("✅ ZiG added as supported token in new Vault");
    } catch (error) {
      if (error.message.includes('Token already supported')) {
        console.log("✅ ZiG is already supported in new Vault");
      } else {
        console.log("⚠️  Failed to add ZiG as supported token:", error.message);
      }
    }
    
    console.log("\n🎉 Vault Oracle Hub Fix Complete!");
    console.log("=================================");
    console.log(`New Vault Address: ${newVaultAddress}`);
    console.log(`Oracle Hub: ${deploymentAddresses.ZiGOracleHub}`);
    console.log("✅ All contracts updated to use the new Vault");
    
  } catch (error) {
    console.error("❌ Failed to fix Vault oracle hub:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ Vault oracle fix failed:", error);
  process.exit(1);
}); 