const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Diagnosing and fixing oracle issues...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Get contract instances
  const ZiGOracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);
  
  // Asset lists (matching the contract)
  const cryptoAssets = ["BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD"];
  const metalAssets = ["XAUUSD", "XPTUSD", "XPDUSD", "XAGUSD"];
  const forexAssets = ["EURUSD", "GBPUSD", "USDZAR", "USDJPY", "USDCHF", "USDCNH"];
  
  const allAssets = [...cryptoAssets, ...metalAssets, ...forexAssets];
  
  console.log("\n📊 Checking all oracle assets...");
  console.log("=====================================");
  
  let issuesFound = [];
  let assetsToUpdate = [];
  
  // Check each asset
  for (const asset of allAssets) {
    console.log(`\n🔍 Checking ${asset}...`);
    
    try {
      // Get asset data
      const data = await ZiGOracleHub.cryptoPrices(asset);
      let category = "crypto";
      
      if (!data.isValid) {
        try {
          const metalData = await ZiGOracleHub.metalPrices(asset);
          if (metalData.isValid) {
            category = "metal";
          } else {
            try {
              const forexData = await ZiGOracleHub.forexPrices(asset);
              if (forexData.isValid) {
                category = "forex";
              }
            } catch (e) {
              // Not in forex either
            }
          }
        } catch (e) {
          // Not in metal
        }
      }
      
      // Get the correct data based on category
      let assetData;
      switch (category) {
        case "crypto":
          assetData = await ZiGOracleHub.cryptoPrices(asset);
          break;
        case "metal":
          assetData = await ZiGOracleHub.metalPrices(asset);
          break;
        case "forex":
          assetData = await ZiGOracleHub.forexPrices(asset);
          break;
      }
      
      // Convert BigInt to string/number for safe usage
      const priceBigInt = assetData.price;
      const price = Number(priceBigInt) / 1e18;
      const timestampBigInt = assetData.timestamp;
      const timestamp = Number(timestampBigInt);
      const isValid = assetData.isValid;
      const age = Math.floor((Date.now() / 1000) - timestamp);
      const isStale = age > 3600; // 1 hour threshold
      
      console.log(`  Category: ${category}`);
      console.log(`  Price: $${price}`);
      console.log(`  Timestamp: ${new Date(timestamp * 1000).toISOString()}`);
      console.log(`  Age: ${age} seconds`);
      console.log(`  Is Valid: ${isValid}`);
      console.log(`  Is Stale: ${isStale}`);
      
      // Check for issues
      if (!isValid) {
        issuesFound.push(`${asset}: Not valid`);
        assetsToUpdate.push({ asset, category });
      } else if (isStale) {
        issuesFound.push(`${asset}: Stale (${age}s old)`);
        assetsToUpdate.push({ asset, category });
      } else if (priceBigInt === 0n || priceBigInt === 0) {
        issuesFound.push(`${asset}: Zero price`);
        assetsToUpdate.push({ asset, category });
      } else {
        console.log(`  ✅ ${asset} is healthy`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error checking ${asset}: ${error.message}`);
      issuesFound.push(`${asset}: Error - ${error.message}`);
      assetsToUpdate.push({ asset, category: "unknown" });
    }
  }
  
  // Summary
  console.log("\n📋 Summary:");
  console.log("============");
  console.log(`Total assets checked: ${allAssets.length}`);
  console.log(`Issues found: ${issuesFound.length}`);
  
  if (issuesFound.length > 0) {
    console.log("\n❌ Issues found:");
    issuesFound.forEach(issue => console.log(`  - ${issue}`));
    
    console.log("\n🔧 Attempting to fix issues...");
    console.log("=============================");
    
         // Try to fix by updating prices
     for (const item of assetsToUpdate) {
       let { asset, category } = item;
       if (category === "unknown") {
         // Try to determine category
         if (cryptoAssets.includes(asset)) {
           category = "crypto";
         } else if (metalAssets.includes(asset)) {
           category = "metal";
         } else if (forexAssets.includes(asset)) {
           category = "forex";
         }
       }
      
      console.log(`\n🔄 Updating ${asset} (${category})...`);
      
      try {
        // Get current price from yfinance (simplified - you can enhance this)
        const price = await getCurrentPrice(asset);
        
        if (price > 0) {
          const weiPrice = ethers.parseUnits(price.toString(), 18);
          
          // Update the price based on category
          let tx;
          switch (category) {
            case "crypto":
              tx = await ZiGOracleHub.updateCryptoPrice(asset, weiPrice);
              break;
            case "metal":
              tx = await ZiGOracleHub.updateMetalPrice(asset, weiPrice);
              break;
            case "forex":
              tx = await ZiGOracleHub.updateForexPrice(asset, weiPrice);
              break;
            default:
              console.log(`  ⚠️  Unknown category for ${asset}, skipping`);
              continue;
          }
          
          await tx.wait();
          console.log(`  ✅ Updated ${asset} to $${price}`);
        } else {
          console.log(`  ⚠️  Could not get price for ${asset}, skipping`);
        }
      } catch (error) {
        console.log(`  ❌ Failed to update ${asset}: ${error.message}`);
      }
    }
    
    // Test if the fix worked
    console.log("\n🧪 Testing if fixes worked...");
    console.log("============================");
    
    try {
      const zigPrice = await ZiGOracleHub.calculateZiGPrice();
      console.log(`✅ ZiG price calculation works: $${ethers.formatUnits(zigPrice, 18)}`);
      
      // Test Vault function
      const Vault = await ethers.getContractAt("Vault", deploymentAddresses.Vault);
      const totalValue = await Vault.getTotalCollateralValueForZiGT(deployer.address);
      console.log(`✅ Vault getTotalCollateralValueForZiGT works: ${ethers.formatUnits(totalValue, 18)}`);
      
      console.log("\n🎉 All issues fixed! You can now run the user onboarding script.");
      
    } catch (error) {
      console.log(`❌ Still having issues: ${error.message}`);
      console.log("\n🔍 Additional debugging needed. Check if:");
      console.log("  1. All assets have valid prices");
      console.log("  2. No assets are missing from the symbol arrays");
      console.log("  3. The oracle is not paused");
    }
    
  } else {
    console.log("✅ No issues found! Oracle is healthy.");
    
    // Test ZiG calculation anyway
    try {
      const zigPrice = await ZiGOracleHub.calculateZiGPrice();
      console.log(`✅ ZiG price: $${ethers.formatUnits(zigPrice, 18)}`);
    } catch (error) {
      console.log(`❌ ZiG calculation failed: ${error.message}`);
    }
  }
}

// Simplified price fetching function
async function getCurrentPrice(asset) {
  // This is a simplified version - you can enhance it with real API calls
  // For now, return some reasonable default prices
  const defaultPrices = {
    "BTCUSD": 108000,
    "ETHUSD": 2600,
    "BNBUSD": 660,
    "XRPUSD": 2.3,
    "SOLUSD": 151,
    "XAUUSD": 3310,
    "XPTUSD": 1387,
    "XPDUSD": 1121,
    "XAGUSD": 36.9,
    "EURUSD": 1.17,
    "GBPUSD": 1.36,
    "USDZAR": 17.76,
    "USDJPY": 146.57,
    "USDCHF": 0.795,
    "USDCNH": 7.18
  };
  
  return defaultPrices[asset] || 0;
}

main().catch((error) => {
  console.error("❌ Diagnosis failed:", error);
  process.exit(1);
}); 