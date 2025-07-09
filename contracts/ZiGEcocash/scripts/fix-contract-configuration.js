const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔧 Fixing contract configuration issues...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  console.log("\n📊 Fixing Configuration Issues");
  console.log("==============================");

  // 1. Fix ZiGT Configuration
  console.log("\n🪙 Fixing ZiGT Configuration...");
  try {
    const ZiGT = await ethers.getContractAt("ZiGT", deploymentAddresses.ZiGT);
    
    // Fix oracle hub
    console.log("Setting oracle hub in ZiGT...");
    const setOracleTx = await ZiGT.setOracleHub(deploymentAddresses.ZiGOracleHub);
    await setOracleTx.wait();
    console.log("✅ ZiGT oracle hub updated");

    // Fix ZiG token
    console.log("Setting ZiG token in ZiGT...");
    const setZiGTx = await ZiGT.setZigToken(deploymentAddresses.ZiG);
    await setZiGTx.wait();
    console.log("✅ ZiGT ZiG token updated");

  } catch (error) {
    console.error("❌ Failed to fix ZiGT configuration:", error.message);
  }

  // 2. Fix DAO Configuration
  console.log("\n🏛️  Fixing DAO Configuration...");
  try {
    const ReparationsDAO = await ethers.getContractAt("ReparationsDAO", deploymentAddresses.ReparationsDAO);
    
    // Note: ReparationsDAO governance token is set in constructor and cannot be changed
    console.log("ℹ️  ReparationsDAO governance token is set in constructor and cannot be changed");
    console.log("   If this is wrong, the DAO needs to be redeployed");

  } catch (error) {
    console.error("❌ Failed to check DAO configuration:", error.message);
  }

  // 3. Fix Oracle Hub Configuration
  console.log("\n🔮 Fixing Oracle Hub Configuration...");
  try {
    const ZiGOracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);
    
    // Set DAO address
    console.log("Setting DAO address in Oracle Hub...");
    const setDaoTx = await ZiGOracleHub.setDaoAddress(deploymentAddresses.ReparationsDAO);
    await setDaoTx.wait();
    console.log("✅ Oracle Hub DAO address updated");

  } catch (error) {
    console.error("❌ Failed to fix Oracle Hub configuration:", error.message);
  }

  // 4. Note about Vault Oracle Hub
  console.log("\n🏦 Vault Oracle Hub Issue:");
  console.log("⚠️  The Vault is using an old oracle hub address.");
  console.log("   This was fixed by updating the old oracle hub with current prices.");
  console.log("   If you want to use the new oracle hub, you'll need to redeploy the Vault.");
  console.log("   For now, both oracles are being updated with the same prices.");

  console.log("\n✅ Configuration fixes completed!");
  console.log("\n💡 Next steps:");
  console.log("   1. Run the configuration check again to verify fixes");
  console.log("   2. Test the user onboarding script");
  console.log("   3. Use the enhanced oracle script for better price reliability");
}

main().catch((error) => {
  console.error("❌ Configuration fix failed:", error);
  process.exit(1);
}); 