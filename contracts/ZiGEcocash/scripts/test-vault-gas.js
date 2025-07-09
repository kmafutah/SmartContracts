const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 Testing Vault with explicit gas settings...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Get contract instances
  const Vault = await ethers.getContractAt("Vault", deploymentAddresses.Vault);
  const ZiGOracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);
  
  try {
    // Test with explicit gas limit
    console.log("\n🔍 Testing getTotalCollateralValueForZiGT with explicit gas:");
    try {
      const totalValue = await Vault.getTotalCollateralValueForZiGT(deployer.address, { gasLimit: 1000000 });
      console.log("✅ Total collateral value:", ethers.formatUnits(totalValue, 18));
    } catch (error) {
      console.log("❌ Error with explicit gas:", error.message);
    }
    
    // Test the individual components
    console.log("\n🔍 Testing individual components:");
    
    // Check supported tokens
    const supportedTokensCount = await Vault.getSupportedTokensCount();
    console.log("Supported tokens count:", supportedTokensCount.toString());
    
    for (let i = 0; i < supportedTokensCount; i++) {
      try {
        const token = await Vault.supportedTokens(i);
        console.log(`Token ${i}:`, token);
        
        const amount = await Vault.userCollateralForZiGT(deployer.address, token);
        console.log(`  Collateral amount:`, ethers.formatUnits(amount, 18));
        
        if (amount > 0) {
          try {
            const price = await ZiGOracleHub.getTokenPrice(token, { gasLimit: 500000 });
            console.log(`  Token price:`, ethers.formatUnits(price, 18));
            
            // Calculate value manually
            const decimals = 18; // Assuming all tokens have 18 decimals
            const value = (amount * price) / (10n ** BigInt(decimals));
            console.log(`  Calculated value:`, ethers.formatUnits(value, 18));
            
          } catch (priceError) {
            console.log(`  ❌ Price error:`, priceError.message);
          }
        }
      } catch (error) {
        console.log(`❌ Error checking token ${i}:`, error.message);
      }
    }
    
    // Try to call the function step by step
    console.log("\n🔍 Testing step by step:");
    try {
      let totalValue = 0n;
      
      for (let i = 0; i < supportedTokensCount; i++) {
        const token = await Vault.supportedTokens(i);
        const amount = await Vault.userCollateralForZiGT(deployer.address, token);
        
        if (amount > 0) {
          console.log(`Processing token ${i}:`, token);
          console.log(`  Amount:`, ethers.formatUnits(amount, 18));
          
          const price = await ZiGOracleHub.getTokenPrice(token);
          console.log(`  Price:`, ethers.formatUnits(price, 18));
          
          const decimals = 18;
          const value = (amount * price) / (10n ** BigInt(decimals));
          console.log(`  Value:`, ethers.formatUnits(value, 18));
          
          totalValue += value;
        }
      }
      
      console.log("✅ Manual total value:", ethers.formatUnits(totalValue, 18));
      
    } catch (error) {
      console.log("❌ Step by step error:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Error testing Vault:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
}); 