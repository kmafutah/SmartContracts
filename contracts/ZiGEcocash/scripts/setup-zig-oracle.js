const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🔧 Setting up ZiG token oracle...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ No deployment addresses found. Run deployment first.");
    return;
  }
  
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("📄 Loaded deployment addresses");

  // Get contract instances
  const ZiGOracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);
  
  console.log("ZiG Oracle Hub address:", deploymentAddresses.ZiGOracleHub);
  console.log("ZiG token address:", deploymentAddresses.ZiG);

  try {
    // Check if ZiG token already has an oracle set
    const currentOracle = await ZiGOracleHub.tokenOracles(deploymentAddresses.ZiG);
    console.log("Current ZiG oracle:", currentOracle);
    
    if (currentOracle === ethers.ZeroAddress) {
      console.log("❌ No oracle set for ZiG token. Need to deploy or set up an oracle.");
      console.log("The Vault needs the ZiG token to have a price oracle to calculate collateral values.");
      console.log("This is why the 'No valid price for BTCUSD' error occurs - it's actually looking for ZiG price.");
      
      // For now, let's try a different approach - use the ZiG price calculation directly
      console.log("\n🔍 Checking if we can use the ZiG price calculation directly...");
      
      try {
        const zigPrice = await ZiGOracleHub.calculateZiGPrice();
        console.log("✅ ZiG calculated price:", ethers.formatUnits(zigPrice, 18));
        
        // Let's create a simple oracle that returns the calculated ZiG price
        console.log("\n🔧 Creating a simple ZiG price oracle...");
        
        // Deploy a simple oracle that returns the calculated ZiG price
        const SimpleZiGOracle = await ethers.getContractFactory("SimpleZiGOracle");
        const simpleOracle = await SimpleZiGOracle.deploy(deploymentAddresses.ZiGOracleHub);
        await simpleOracle.waitForDeployment();
        
        console.log("✅ Simple ZiG Oracle deployed to:", await simpleOracle.getAddress());
        
        // Set the oracle for the ZiG token
        console.log("🔧 Setting ZiG token oracle...");
        const setOracleTx = await ZiGOracleHub.setTokenOracle(deploymentAddresses.ZiG, await simpleOracle.getAddress());
        await setOracleTx.wait();
        console.log("✅ ZiG token oracle set successfully!");
        
      } catch (error) {
        console.error("❌ Failed to set up ZiG oracle:", error.message);
      }
    } else {
      console.log("✅ ZiG token already has an oracle set");
    }
    
  } catch (error) {
    console.error("❌ Error checking ZiG oracle setup:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
}); 