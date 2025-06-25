const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const CRYPTO_ASSETS = ["BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD"];
const METAL_ASSETS = ["XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD"];
const FOREX_ASSETS = ["EURUSD", "GBPUSD", "USDZAR", "USDJPY", "USDCHF", "USDCNH"];

async function main() {
  console.log("🔍 Viewing On-Chain Oracle Prices...");

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ No deployment addresses found. Run deployment first.");
    return;
  }
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Connect to the oracle hub
  const oracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);

  // Helper to format price
  const fmt = (v) => ethers.formatUnits(v, 18);

  // Print crypto prices
  console.log("\n=== Crypto Prices ===");
  for (const asset of CRYPTO_ASSETS) {
    const data = await oracleHub.cryptoPrices(asset);
    console.log(`${asset}: $${fmt(data.price)} | Timestamp: ${data.timestamp} | Valid: ${data.isValid}`);
  }

  // Print metal prices
  console.log("\n=== Metal Prices ===");
  for (const asset of METAL_ASSETS) {
    const data = await oracleHub.metalPrices(asset);
    console.log(`${asset}: $${fmt(data.price)} | Timestamp: ${data.timestamp} | Valid: ${data.isValid}`);
  }

  // Print forex prices
  console.log("\n=== Forex Prices ===");
  for (const asset of FOREX_ASSETS) {
    const data = await oracleHub.forexPrices(asset);
    console.log(`${asset}: $${fmt(data.price)} | Timestamp: ${data.timestamp} | Valid: ${data.isValid}`);
  }

  console.log("\n✅ Done.");
}

main().catch((error) => {
  console.error("❌ Failed to view on-chain prices:", error);
  process.exit(1);
}); 