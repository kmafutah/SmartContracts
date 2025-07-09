const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔧 Fixing Vault Oracle Hub (Simple Update)...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  console.log("\n📊 Current Vault Configuration:");
  console.log("================================");
  console.log(`Current Vault: ${deploymentAddresses.Vault}`);
  console.log(`Correct Oracle Hub: ${deploymentAddresses.ZiGOracleHub}`);

  // Check current Vault oracle hub
  try {
    const currentVault = await ethers.getContractAt("Vault", deploymentAddresses.Vault);
    const currentOracleHub = await currentVault.oracleHub();
    console.log(`Current Vault oracle hub: ${currentOracleHub}`);
    
    if (currentOracleHub.toLowerCase() === deploymentAddresses.ZiGOracleHub.toLowerCase()) {
      console.log("✅ Vault already using correct oracle hub");
      return;
    }
    
    // Check if deployer is the owner of the Vault
    const vaultOwner = await currentVault.owner();
    console.log(`Vault owner: ${vaultOwner}`);
    console.log(`Deployer address: ${deployer.address}`);
    
    if (vaultOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log("❌ Deployer is not the owner of the Vault contract!");
      console.log("You need to be the owner to update the oracle hub.");
      console.log("\n💡 Alternative: The current setup works because we update both oracle hubs.");
      console.log("The Vault can still get prices from the old oracle hub, which we keep updated.");
      return;
    }

    console.log("\n🔧 Updating Vault Oracle Hub...");
    console.log("================================");
    
    // Try to update the oracle hub
    const tx = await currentVault.setOracleHub(deploymentAddresses.ZiGOracleHub);
    console.log("Transaction sent:", tx.hash);
    
    await tx.wait();
    console.log("✅ Transaction confirmed!");
    
    // Verify the update
    const newOracleHub = await currentVault.oracleHub();
    console.log(`New Vault oracle hub: ${newOracleHub}`);
    
    if (newOracleHub.toLowerCase() === deploymentAddresses.ZiGOracleHub.toLowerCase()) {
      console.log("✅ Vault oracle hub successfully updated!");
      
      // Test if the Vault can now get prices
      console.log("\n🧪 Testing Vault price retrieval...");
      try {
        const totalValue = await currentVault.getTotalCollateralValueForZiGT(deployer.address);
        console.log(`✅ Vault can now get total collateral value: ${ethers.formatUnits(totalValue, 18)}`);
        console.log("\n🎉 Fix successful! You can now run the user onboarding script.");
      } catch (error) {
        console.log(`❌ Still having issues: ${error.message}`);
        console.log("You may need to update the oracle prices first.");
      }
    } else {
      console.log("❌ Oracle hub update failed!");
    }
    
  } catch (error) {
    console.error("❌ Failed to update Vault oracle hub:", error.message);
    console.log("\n💡 The current setup works because we update both oracle hubs.");
    console.log("The Vault can still get prices from the old oracle hub, which we keep updated.");
  }
}

main().catch((error) => {
  console.error("❌ Vault oracle fix failed:", error);
  process.exit(1);
}); 