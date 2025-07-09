const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 Testing SimpleZiGOracle...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Get contract instances
  const ZiGOracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);
  
  try {
    // Test ZiG price calculation directly
    console.log("\n🔍 Testing ZiG price calculation directly:");
    try {
      const zigPrice = await ZiGOracleHub.calculateZiGPrice();
      console.log("✅ ZiG calculated price:", ethers.formatUnits(zigPrice, 18));
    } catch (error) {
      console.log("❌ ZiG calculated price error:", error.message);
    }
    
    // Test getting ZiG token price through oracle hub
    console.log("\n🔍 Testing ZiG token price through oracle hub:");
    try {
      const zigTokenPrice = await ZiGOracleHub.getTokenPrice(deploymentAddresses.ZiG);
      console.log("✅ ZiG token price:", ethers.formatUnits(zigTokenPrice, 18));
    } catch (error) {
      console.log("❌ ZiG token price error:", error.message);
    }
    
    // Test calling the SimpleZiGOracle directly
    console.log("\n🔍 Testing SimpleZiGOracle directly:");
    try {
      // We need to find the SimpleZiGOracle address
      const simpleOracleAddress = await ZiGOracleHub.tokenOracles(deploymentAddresses.ZiG);
      console.log("SimpleZiGOracle address:", simpleOracleAddress);
      
      if (simpleOracleAddress !== ethers.ZeroAddress) {
        const SimpleZiGOracle = await ethers.getContractAt("SimpleZiGOracle", simpleOracleAddress);
        
        // Test calling getPrice directly
        const directPrice = await SimpleZiGOracle.getPrice(deploymentAddresses.ZiG);
        console.log("✅ Direct SimpleZiGOracle price:", ethers.formatUnits(directPrice, 18));
      } else {
        console.log("❌ No SimpleZiGOracle found");
      }
    } catch (error) {
      console.log("❌ SimpleZiGOracle test error:", error.message);
    }
    
    // Test with a different token address to see if the issue is specific to ZiG
    console.log("\n🔍 Testing with a different token address:");
    try {
      const fakeTokenAddress = "0x1234567890123456789012345678901234567890";
      const SimpleZiGOracle = await ethers.getContractAt("SimpleZiGOracle", await ZiGOracleHub.tokenOracles(deploymentAddresses.ZiG));
      const fakePrice = await SimpleZiGOracle.getPrice(fakeTokenAddress);
      console.log("✅ Fake token price:", ethers.formatUnits(fakePrice, 18));
    } catch (error) {
      console.log("❌ Fake token test error:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Error testing SimpleZiGOracle:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
}); 