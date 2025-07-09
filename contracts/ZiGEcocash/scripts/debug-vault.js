const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Debugging Vault state...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Get contract instances
  const Vault = await ethers.getContractAt("Vault", deploymentAddresses.Vault);
  const ZiGOracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);
  const ZiG = await ethers.getContractAt("ZiG", deploymentAddresses.ZiG);
  
  console.log("\n📊 Vault State:");
  console.log("===============");
  console.log("Vault address:", deploymentAddresses.Vault);
  console.log("ZiG token address:", deploymentAddresses.ZiG);
  console.log("Oracle Hub address:", deploymentAddresses.ZiGOracleHub);
  
  try {
    // Check supported tokens
    const supportedTokensCount = await Vault.getSupportedTokensCount();
    console.log("\n🔍 Supported tokens count:", supportedTokensCount.toString());
    
    // Check if ZiG is supported
    const isZiGSupported = await Vault.isSupportedToken(deploymentAddresses.ZiG);
    console.log("Is ZiG supported:", isZiGSupported);
    
    // Check deployer's ZiG balance
    const deployerZiGBalance = await ZiG.balanceOf(deployer.address);
    console.log("Deployer ZiG balance:", ethers.formatUnits(deployerZiGBalance, 18));
    
    // Check deployer's collateral for ZiGT
    const deployerCollateral = await Vault.userCollateralForZiGT(deployer.address, deploymentAddresses.ZiG);
    console.log("Deployer ZiGT collateral:", ethers.formatUnits(deployerCollateral, 18));
    
    // Check ZiG token price
    console.log("\n🔍 ZiG Token Price Check:");
    try {
      const zigPrice = await ZiGOracleHub.getTokenPrice(deploymentAddresses.ZiG);
      console.log("✅ ZiG token price:", ethers.formatUnits(zigPrice, 18));
    } catch (error) {
      console.log("❌ ZiG token price error:", error.message);
    }
    
    // Check total collateral value for ZiGT
    console.log("\n🔍 Total Collateral Value for ZiGT:");
    try {
      const totalValue = await Vault.getTotalCollateralValueForZiGT(deployer.address);
      console.log("✅ Total collateral value:", ethers.formatUnits(totalValue, 18));
    } catch (error) {
      console.log("❌ Total collateral value error:", error.message);
    }
    
    // Check what happens when we try to get price for each supported token
    console.log("\n🔍 Checking prices for all supported tokens:");
    for (let i = 0; i < supportedTokensCount; i++) {
      try {
        const token = await Vault.supportedTokens(i);
        console.log(`Token ${i}:`, token);
        
        const isSupported = await Vault.isSupportedToken(token);
        console.log(`  Is supported:`, isSupported);
        
        if (isSupported) {
          try {
            const price = await ZiGOracleHub.getTokenPrice(token);
            console.log(`  Price:`, ethers.formatUnits(price, 18));
          } catch (priceError) {
            console.log(`  ❌ Price error:`, priceError.message);
          }
        }
      } catch (error) {
        console.log(`❌ Error checking token ${i}:`, error.message);
      }
    }
    
    // Check if we can call mintZiGT directly
    console.log("\n🔍 Testing mintZiGT call:");
    try {
      const amount = ethers.parseUnits("100", 18);
      const totalValue = await Vault.getTotalCollateralValueForZiGT(deployer.address);
      const requiredCollateral = (amount * 15000) / 10000; // 150% collateral ratio
      
      console.log("Amount to mint:", ethers.formatUnits(amount, 18));
      console.log("Total collateral value:", ethers.formatUnits(totalValue, 18));
      console.log("Required collateral:", ethers.formatUnits(requiredCollateral, 18));
      
      if (totalValue >= requiredCollateral) {
        console.log("✅ Sufficient collateral for minting");
      } else {
        console.log("❌ Insufficient collateral for minting");
      }
    } catch (error) {
      console.log("❌ Error testing mintZiGT:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Error debugging Vault:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ Debug failed:", error);
  process.exit(1);
}); 