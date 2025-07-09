const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔧 Redeploying Vault with correct Oracle Hub...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  console.log("\n📊 Current State:");
  console.log("==================");
  console.log(`Current Vault: ${deploymentAddresses.Vault}`);
  console.log(`Correct Oracle Hub: ${deploymentAddresses.ZiGOracleHub}`);

  // Get contract instances for constructor parameters
  const ZiG = await ethers.getContractAt("ZiG", deploymentAddresses.ZiG);
  const ZiGT = await ethers.getContractAt("ZiGT", deploymentAddresses.ZiGT);

  console.log("\n🔧 Deploying new Vault...");
  console.log("========================");
  
  try {
    // Deploy new Vault with correct oracle hub
    const Vault = await ethers.getContractFactory("Vault");
    const newVault = await Vault.deploy(
      deploymentAddresses.ZiG,           // _zigToken
      deploymentAddresses.Treasury,       // _treasury
      deploymentAddresses.FutureReserve,  // _futureReserve
      deploymentAddresses.DiasporaFund,   // _diasporaFund
      deploymentAddresses.ZiG,            // _zigAddress
      deploymentAddresses.ZiGT,           // _zigtAddress
      deploymentAddresses.ZiGOracleHub,   // _oracleHubAddress (CORRECT ONE!)
      deploymentAddresses.PAXG            // _paxgAddress
    );
    
    await newVault.waitForDeployment();
    const newVaultAddress = await newVault.getAddress();
    
    console.log("✅ New Vault deployed:", newVaultAddress);
    
    // Verify the oracle hub is correct
    const oracleHubAddress = await newVault.oracleHub();
    console.log(`New Vault oracle hub: ${oracleHubAddress}`);
    
    if (oracleHubAddress.toLowerCase() === deploymentAddresses.ZiGOracleHub.toLowerCase()) {
      console.log("✅ New Vault is using the correct oracle hub!");
      
      // Update ZiGT to use the new Vault
      console.log("\n🔧 Updating ZiGT to use new Vault...");
      const setVaultTx = await ZiGT.setVaultAddress(newVaultAddress);
      await setVaultTx.wait();
      console.log("✅ ZiGT updated to use new Vault");
      
      // Add ZiG as supported token in new Vault
      console.log("\n🔧 Adding ZiG as supported token in new Vault...");
      const addTokenTx = await newVault.addSupportedToken(deploymentAddresses.ZiG, 15000); // 150% collateral ratio
      await addTokenTx.wait();
      console.log("✅ Added ZiG as supported token in new Vault");
      
      // Test the new Vault
      console.log("\n🧪 Testing new Vault...");
      try {
        const totalValue = await newVault.getTotalCollateralValueForZiGT(deployer.address);
        console.log(`✅ New Vault can get total collateral value: ${ethers.formatUnits(totalValue, 18)}`);
        console.log("\n🎉 New Vault is working correctly!");
      } catch (error) {
        console.log(`❌ New Vault still having issues: ${error.message}`);
      }
      
      // Update deployment addresses
      const updatedAddresses = { ...deploymentAddresses, Vault: newVaultAddress };
      fs.writeFileSync(deploymentPath, JSON.stringify(updatedAddresses, null, 2));
      console.log("\n📄 Updated deployment addresses file");
      
      console.log("\n🎉 Vault redeployment complete!");
      console.log("You can now run the user onboarding script with the new Vault.");
      
    } else {
      console.log("❌ New Vault is still using wrong oracle hub!");
    }
    
  } catch (error) {
    console.error("❌ Failed to redeploy Vault:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ Redeployment failed:", error);
  process.exit(1);
}); 