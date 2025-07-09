const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔧 Updating old Oracle Hub that Vault is using...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Get the old oracle hub that the Vault is using
  const Vault = await ethers.getContractAt("Vault", deploymentAddresses.Vault);
  const oldOracleHubAddress = await Vault.oracleHub();
  
  console.log("\n📊 Current State:");
  console.log("==================");
  console.log(`Vault: ${deploymentAddresses.Vault}`);
  console.log(`Vault's Oracle Hub: ${oldOracleHubAddress}`);
  console.log(`New Oracle Hub: ${deploymentAddresses.ZiGOracleHub}`);

  // Get the old oracle hub contract
  const OldOracleHub = await ethers.getContractAt("ZiGOracleHub", oldOracleHubAddress);

  console.log("\n🔧 Updating prices in old Oracle Hub...");
  console.log("=======================================");
  
  // Default prices to update
  const prices = {
    "BTCUSD": "108000",
    "ETHUSD": "2600", 
    "BNBUSD": "660",
    "XRPUSD": "2.3",
    "SOLUSD": "151",
    "XAUUSD": "3310",
    "XPTUSD": "1387",
    "XPDUSD": "1121",
    "XAGUSD": "36.9",
    "EURUSD": "1.17",
    "GBPUSD": "1.36",
    "USDZAR": "17.76",
    "USDJPY": "146.57",
    "USDCHF": "0.795",
    "USDCNH": "7.18"
  };

  // Asset categories
  const cryptoAssets = ["BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD"];
  const metalAssets = ["XAUUSD", "XPTUSD", "XPDUSD", "XAGUSD"];
  const forexAssets = ["EURUSD", "GBPUSD", "USDZAR", "USDJPY", "USDCHF", "USDCNH"];

  try {
    // First, authorize the deployer as an oracle
    console.log("🔑 Authorizing deployer as oracle...");
    const authTx = await OldOracleHub.addOracle(deployer.address);
    await authTx.wait();
    console.log("✅ Deployer authorized as oracle");

    // Update crypto prices
    console.log("\n📈 Updating crypto prices...");
    for (const asset of cryptoAssets) {
      if (prices[asset]) {
        const price = ethers.parseUnits(prices[asset], 18);
        const tx = await OldOracleHub.updateCryptoPrice(asset, price);
        await tx.wait();
        console.log(`✅ Updated ${asset} to $${prices[asset]}`);
      }
    }

    // Update metal prices
    console.log("\n🥇 Updating metal prices...");
    for (const asset of metalAssets) {
      if (prices[asset]) {
        const price = ethers.parseUnits(prices[asset], 18);
        const tx = await OldOracleHub.updateMetalPrice(asset, price);
        await tx.wait();
        console.log(`✅ Updated ${asset} to $${prices[asset]}`);
      }
    }

    // Update forex prices
    console.log("\n💱 Updating forex prices...");
    for (const asset of forexAssets) {
      if (prices[asset]) {
        const price = ethers.parseUnits(prices[asset], 18);
        const tx = await OldOracleHub.updateForexPrice(asset, price);
        await tx.wait();
        console.log(`✅ Updated ${asset} to $${prices[asset]}`);
      }
    }

    // Test if the Vault can now get prices
    console.log("\n🧪 Testing Vault price retrieval...");
    try {
      const totalValue = await Vault.getTotalCollateralValueForZiGT(deployer.address);
      console.log(`✅ Vault can now get total collateral value: ${ethers.formatUnits(totalValue, 18)}`);
      
      // Test ZiG price calculation
      const zigPrice = await OldOracleHub.calculateZiGPrice();
      console.log(`✅ ZiG price calculation works: $${ethers.formatUnits(zigPrice, 18)}`);
      
      console.log("\n🎉 Old Oracle Hub updated successfully!");
      console.log("You can now run the user onboarding script.");
      
    } catch (error) {
      console.log(`❌ Still having issues: ${error.message}`);
      console.log("You may need to check if all required assets are properly configured.");
    }

  } catch (error) {
    console.error("❌ Failed to update old oracle hub:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ Update failed:", error);
  process.exit(1);
}); 