const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Debugging Vault oracle call...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Get contract instances
  const Vault = await ethers.getContractAt("Vault", deploymentAddresses.Vault);
  const ZiGOracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);
  const ZiG = await ethers.getContractAt("ZiG", deploymentAddresses.ZiG);

  console.log("\n📊 Checking Vault state...");
  
  // Check what tokens the user has deposited
  const userCollateralForZiGT = await Vault.userCollateralForZiGT(deployer.address, deploymentAddresses.ZiG);
  console.log(`User ZiG collateral for ZiGT: ${ethers.formatUnits(userCollateralForZiGT, 18)} ZiG`);
  
  // Check if ZiG is supported
  const isSupported = await Vault.isSupportedToken(deploymentAddresses.ZiG);
  console.log(`ZiG is supported: ${isSupported}`);
  
  // Check the oracle hub that the Vault is using
  const oracleHubAddress = await Vault.oracleHub();
  console.log(`Vault oracle hub: ${oracleHubAddress}`);
  console.log(`Expected oracle hub: ${deploymentAddresses.ZiGOracleHub}`);
  
  if (oracleHubAddress.toLowerCase() !== deploymentAddresses.ZiGOracleHub.toLowerCase()) {
    console.log("❌ Vault is using a different oracle hub!");
    return;
  }

  console.log("\n🔍 Checking all required assets in oracle...");
  
  // Check all assets that the ZiG calculation needs
  const cryptoAssets = ["BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD"];
  const metalAssets = ["XAUUSD", "XPTUSD", "XPDUSD", "XAGUSD"];
  const forexAssets = ["EURUSD", "GBPUSD", "USDZAR", "USDJPY", "USDCHF", "USDCNH"];
  
  const allAssets = [...cryptoAssets, ...metalAssets, ...forexAssets];
  
  for (const asset of allAssets) {
    try {
      // Try to get price directly from oracle hub
      const price = await ZiGOracleHub.getPrice(asset);
      console.log(`✅ ${asset}: $${ethers.formatUnits(price, 18)}`);
    } catch (error) {
      console.log(`❌ ${asset}: ${error.message}`);
    }
  }

  console.log("\n🧪 Testing ZiG price calculation...");
  try {
    const zigPrice = await ZiGOracleHub.calculateZiGPrice();
    console.log(`✅ ZiG price: $${ethers.formatUnits(zigPrice, 18)}`);
  } catch (error) {
    console.log(`❌ ZiG price calculation failed: ${error.message}`);
  }

  console.log("\n🔍 Testing Vault's getTotalCollateralValueForZiGT step by step...");
  
  try {
    // This is the function that's failing
    const totalValue = await Vault.getTotalCollateralValueForZiGT(deployer.address);
    console.log(`✅ Vault getTotalCollateralValueForZiGT works: ${ethers.formatUnits(totalValue, 18)}`);
  } catch (error) {
    console.log(`❌ Vault getTotalCollateralValueForZiGT failed: ${error.message}`);
    
    // Let's try to trace what the Vault is doing
    console.log("\n🔍 Tracing Vault's internal calls...");
    
    // Check what tokens the user has
    const supportedTokensCount = await Vault.getSupportedTokensCount();
    console.log("Supported tokens count:", supportedTokensCount.toString());
    
    for (let i = 0; i < supportedTokensCount; i++) {
      try {
        const token = await Vault.supportedTokens(i);
        const balanceForZiGT = await Vault.userCollateralForZiGT(deployer.address, token);
        const balanceForZiG = await Vault.userCollateralForZiG(deployer.address, token);
        console.log(`Token ${token}:`);
        console.log(`  - Balance for ZiGT: ${ethers.formatUnits(balanceForZiGT, 18)}`);
        console.log(`  - Balance for ZiG: ${ethers.formatUnits(balanceForZiG, 18)}`);
        // Try to get price for this token
        try {
          const price = await ZiGOracleHub.getTokenPrice(token);
          console.log(`Token ${token} price: ${ethers.formatUnits(price, 18)}`);
        } catch (priceError) {
          console.log(`Token ${token} price error: ${priceError.message}`);
        }
      } catch (error) {
        console.log(`Error checking token ${token}: ${error.message}`);
      }
    }
  }
}

main().catch((error) => {
  console.error("❌ Debug failed:", error);
  process.exit(1);
}); 