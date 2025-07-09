const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 Testing ZiG token price...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Get contract instances
  const ZiGOracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);
  
  try {
    // Test getting ZiG token price
    console.log("🔍 Testing ZiG token price...");
    const zigPrice = await ZiGOracleHub.getTokenPrice(deploymentAddresses.ZiG);
    console.log("✅ ZiG token price:", ethers.formatUnits(zigPrice, 18));
    
    // Test calculated ZiG price
    console.log("🔍 Testing calculated ZiG price...");
    const calculatedPrice = await ZiGOracleHub.calculateZiGPrice();
    console.log("✅ Calculated ZiG price:", ethers.formatUnits(calculatedPrice, 18));
    
    console.log("🎉 ZiG price is working correctly!");
    
  } catch (error) {
    console.error("❌ Error testing ZiG price:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
}); 