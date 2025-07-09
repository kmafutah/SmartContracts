const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 Testing ZiG token decimals...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Get contract instances
  const ZiG = await ethers.getContractAt("ZiG", deploymentAddresses.ZiG);
  const Vault = await ethers.getContractAt("Vault", deploymentAddresses.Vault);
  
  try {
    // Test ZiG token decimals
    console.log("\n🔍 Testing ZiG token decimals:");
    try {
      const decimals = await ZiG.decimals();
      console.log("✅ ZiG decimals:", decimals.toString());
    } catch (error) {
      console.log("❌ ZiG decimals error:", error.message);
    }
    
    // Test ZiG token name and symbol
    console.log("\n🔍 Testing ZiG token metadata:");
    try {
      const name = await ZiG.name();
      const symbol = await ZiG.symbol();
      console.log("✅ ZiG name:", name);
      console.log("✅ ZiG symbol:", symbol);
    } catch (error) {
      console.log("❌ ZiG metadata error:", error.message);
    }
    
    // Test ZiG token balance
    console.log("\n🔍 Testing ZiG token balance:");
    try {
      const balance = await ZiG.balanceOf(deployer.address);
      console.log("✅ ZiG balance:", ethers.formatUnits(balance, 18));
    } catch (error) {
      console.log("❌ ZiG balance error:", error.message);
    }
    
    // Test the exact line that's failing in the Vault
    console.log("\n🔍 Testing the exact Vault calculation:");
    try {
      const supportedTokensCount = await Vault.getSupportedTokensCount();
      console.log("Supported tokens count:", supportedTokensCount.toString());
      
      for (let i = 0; i < supportedTokensCount; i++) {
        const token = await Vault.supportedTokens(i);
        console.log(`Token ${i}:`, token);
        
        const amount = await Vault.userCollateralForZiGT(deployer.address, token);
        console.log(`  Amount:`, ethers.formatUnits(amount, 18));
        
        if (amount > 0) {
          // Test each step individually
          console.log(`  Testing step 1: getTokenPrice`);
          const ZiGOracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);
          const price = await ZiGOracleHub.getTokenPrice(token);
          console.log(`    Price:`, ethers.formatUnits(price, 18));
          
          console.log(`  Testing step 2: decimals`);
          const decimals = await ZiG.decimals();
          console.log(`    Decimals:`, decimals.toString());
          
          console.log(`  Testing step 3: calculation`);
          const value = (amount * price) / (10n ** BigInt(decimals));
          console.log(`    Value:`, ethers.formatUnits(value, 18));
        }
      }
    } catch (error) {
      console.log("❌ Vault calculation error:", error.message);
    }
    
    // Test if the issue is with the IERC20Metadata interface
    console.log("\n🔍 Testing IERC20Metadata interface:");
    try {
      const IERC20Metadata = await ethers.getContractAt("IERC20Metadata", deploymentAddresses.ZiG);
      const decimals = await IERC20Metadata.decimals();
      console.log("✅ IERC20Metadata decimals:", decimals.toString());
    } catch (error) {
      console.log("❌ IERC20Metadata error:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Error testing ZiG decimals:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
}); 