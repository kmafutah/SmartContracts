const { ethers } = require("hardhat");

const AUTO_FIX = true; // Set to true to automatically fix missing oracle registrations

// =======================
// SETUP
// =======================
const oracleHubAddress = "0x76C5FE327c0baE388cb8A1627651e375a336de56"; // <-- Replace with your deployed ZiGOracleHub

const customOracles = {
  // Replace these with your actual deployed oracle addresses
  XAUUSD: "0x5FFf21C3A1faF9fF41212d73930F3D0E3A31c340",
  // Add other assets if needed
};

const bandFallbackOracle = "0xYour_LiveBandFeed_Address"; // <-- Replace

// Strategic tokens and their required asset dependencies
const strategicTokens = [
  {
    symbol: "ZiG-R",
    address: "0x53366809039cA832E5250FfE335B4B19e7ED16C6",
    requiredAssets: ["XAUUSD"],
  },
  {
    symbol: "ZiG-N",
    address: "0x7231F9C31E18091A72Ce4b113AcF94336109b0ad",
    requiredAssets: ["XAUUSD"],
  },
  {
    symbol: "ZiG-RG",
    address: "0x231c247f7Aa5c1490C8a69650EbF82b77bF9DD3e",
    requiredAssets: ["XAUUSD"],
  },
];

// Minimal ABI to read ZiGOracleHub
const oracleHubABI = [
  "function getOracle(string memory pair) external view returns (address oracle, address fallbackOracle, uint8 decimals, bool fallbackOnly, bool inverse)",
  "function setOracle(string memory pair, address oracle, address fallbackOracle, uint8 decimals, bool fallbackOnly, bool inverse) external",
];

// To check price
const oracleABI = [
  "function latestAnswer() external view returns (int256)",
];

// =======================
// MAIN SCRIPT
// =======================
async function main() {
  const [deployer] = await ethers.getSigners();
  const oracleHub = await ethers.getContractAt(oracleHubABI, oracleHubAddress, deployer);

  const results = [];

  for (const token of strategicTokens) {
    console.log(`\n🔍 Checking ${token.symbol}...`);

    for (const asset of token.requiredAssets) {
      try {
        const [oracleAddr, fallbackAddr, decimals] = await oracleHub.getOracle(asset);
        const oracle = await ethers.getContractAt(oracleABI, oracleAddr);
        const raw = await oracle.latestAnswer();
        const price = Number(raw) / 10 ** decimals;

        const status = price > 0 ? "✅ OK" : "⚠️ Zero Price";

        console.log(`   ${status} ${asset}: ${price} (${decimals}d) @ ${oracleAddr}`);
        results.push({ token: token.symbol, asset, oracle: oracleAddr, price, status });
      } catch (err) {
        const isMissing = err.message.includes("execution reverted") || err.message.includes("call exception");

        if (isMissing && AUTO_FIX && customOracles[asset]) {
          try {
            console.log(`   🔧 Auto-fixing ${asset} → Registering oracle in ZiGOracleHub`);
            const tx = await oracleHub.setOracle(
              asset,
              customOracles[asset],
              bandFallbackOracle,
              18,
              false,
              false
            );
            await tx.wait();
            console.log(`   ✅ Registered ${asset} oracle: ${customOracles[asset]}`);
            results.push({ token: token.symbol, asset, oracle: customOracles[asset], price: 0, status: "🛠️ Auto-Fixed" });
            continue;
          } catch (fixErr) {
            console.warn(`   ❌ Auto-fix failed for ${asset}:`, fixErr.message);
          }
        }

        console.warn(`   ❌ ${asset} missing or invalid: ${err.message}`);
        results.push({ token: token.symbol, asset, oracle: null, price: 0, status: "❌ Missing or reverted" });
      }
    }
  }

  // Final Summary
  console.log("\n📋 Linter Summary:");
  for (const r of results) {
    console.log(` - ${r.token} needs ${r.asset} → ${r.status}`);
  }
}

main().catch((err) => {
  console.error("❌ Linting failed:", err);
  process.exit(1);
});
