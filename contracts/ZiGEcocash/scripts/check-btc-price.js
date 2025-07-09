const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Checking BTCUSD price...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Get contract instances
  const ZiGOracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);
  
  try {
    // Check BTCUSD price directly
    console.log("\n🔍 Checking BTCUSD price directly:");
    try {
      const btcPrice = await ZiGOracleHub.getPriceWithFallback("BTCUSD", "crypto");
      console.log("✅ BTCUSD price:", ethers.formatUnits(btcPrice, 18));
    } catch (error) {
      console.log("❌ BTCUSD price error:", error.message);
    }
    
    // Check crypto prices mapping
    console.log("\n🔍 Checking crypto prices mapping:");
    try {
      const btcData = await ZiGOracleHub.cryptoPrices("BTCUSD");
      console.log("BTCUSD data:", {
        price: ethers.formatUnits(btcData.price, 18),
        timestamp: btcData.timestamp.toString(),
        isValid: btcData.isValid
      });
    } catch (error) {
      console.log("❌ Error getting BTCUSD data:", error.message);
    }
    
    // Check if BTCUSD price is valid
    console.log("\n🔍 Checking if BTCUSD price is valid:");
    try {
      const isBtcValid = await ZiGOracleHub._isPriceValid("BTCUSD", "crypto");
      console.log("Is BTCUSD valid:", isBtcValid);
    } catch (error) {
      console.log("❌ Error checking BTCUSD validity:", error.message);
    }
    
    // Check all crypto prices
    console.log("\n🔍 Checking all crypto prices:");
    const cryptoAssets = ["BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD"];
    
    for (const asset of cryptoAssets) {
      try {
        const data = await ZiGOracleHub.cryptoPrices(asset);
        console.log(`${asset}:`, {
          price: ethers.formatUnits(data.price, 18),
          timestamp: data.timestamp.toString(),
          isValid: data.isValid
        });
      } catch (error) {
        console.log(`${asset}: ❌ Error -`, error.message);
      }
    }
    
    // Test calculateZiGPrice
    console.log("\n🔍 Testing calculateZiGPrice:");
    try {
      const zigPrice = await ZiGOracleHub.calculateZiGPrice();
      console.log("✅ ZiG calculated price:", ethers.formatUnits(zigPrice, 18));
    } catch (error) {
      console.log("❌ ZiG calculated price error:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Error checking BTCUSD:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ Check failed:", error);
  process.exit(1);
}); 