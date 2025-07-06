const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🔧 Setting up ZiG Oracle...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Get contract instances
  const ZiGOracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);
  const ZiG = await ethers.getContractAt("ZiG", deploymentAddresses.ZiG);

  console.log("\n📊 Current Oracle State:");
  console.log("=========================");

  // Check if ZiG has an oracle set
  try {
    const zigPrice = await ZiGOracleHub.getTokenPrice(deploymentAddresses.ZiG);
    console.log(`✅ ZiG Oracle is set. Price: $${ethers.formatUnits(zigPrice, 18)}`);
  } catch (error) {
    console.log(`❌ ZiG Oracle not set: ${error.message}`);
  }

  // Get the calculated ZiG price
  try {
    const calculatedPrice = await ZiGOracleHub.calculateZiGPrice();
    console.log(`💰 Calculated ZiG Price: $${ethers.formatUnits(calculatedPrice, 18)}`);
  } catch (error) {
    console.log(`❌ Could not calculate ZiG price: ${error.message}`);
  }

  console.log("\n🔧 Setting up ZiG Oracle...");
  
  // Create a simple oracle contract that returns the calculated ZiG price
  const ZiGOracle = await ethers.getContractFactory("ZiGOracle");
  const zigOracle = await ZiGOracle.deploy(deploymentAddresses.ZiGOracleHub);
  await zigOracle.waitForDeployment();
  
  console.log(`✅ Deployed ZiG Oracle: ${await zigOracle.getAddress()}`);

  // Set the oracle for ZiG token
  const setOracleTx = await ZiGOracleHub.setTokenOracle(deploymentAddresses.ZiG, await zigOracle.getAddress());
  await setOracleTx.wait();
  
  console.log("✅ Set ZiG Oracle in OracleHub");

  // Test the oracle
  try {
    const zigPrice = await ZiGOracleHub.getTokenPrice(deploymentAddresses.ZiG);
    console.log(`✅ ZiG Oracle working. Price: $${ethers.formatUnits(zigPrice, 18)}`);
  } catch (error) {
    console.log(`❌ ZiG Oracle test failed: ${error.message}`);
  }

  console.log("\n🎉 ZiG Oracle setup completed!");
}

main().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
}); 