const { ethers } = require("hardhat");

async function main() {
  // Addresses from deployment output
  const ZIG_STABLE = "0x66A08d5EB1298E14855F818DB3a7d5f8827117BC"; // From your deployment output
  const BAND_REGISTRY = "0xDA7a001b254CD22e46d3eAB04d937489c93174C3"; // From your deployment output
  
  // Example token addresses - replace with your actual token addresses
  const TOKENS = {
    "Digital Forward": "0x...",
    "Geopolitical Hedge": "0x...",
    "Afro-centric Trust": "0x...",
  };

  const [deployer] = await ethers.getSigners();
  console.log(`Configuring contracts with account: ${deployer.address}`);
  console.log(`Network: ${network.name} (${network.config.chainId})`);

  const zigStable = await ethers.getContractAt("ZiGTOptimized", ZIG_STABLE);
  
  // Set up initial parameters
  console.log("Configuring system parameters...");
  const tx1 = await zigStable.setFeePercentage(100); // 1%
  await tx1.wait();
  console.log("Set fee percentage to 1% (100 basis points)");
  
  const tx2 = await zigStable.setRebalanceCooldown(86400); // 1 day in seconds
  await tx2.wait();
  console.log("Set rebalance cooldown to 86400 seconds (1 day)");
  
  // Initialize prices
  console.log("Initializing prices...");
  const assets = ["XAUUSD", "BTCUSD", "ETHUSD", "USDZAR"];
  for (const asset of assets) {
    const assetKey = ethers.keccak256(ethers.toUtf8Bytes(asset));
    const tx = await zigStable.updatePrice(assetKey);
    await tx.wait();
    console.log(`Updated price for ${asset} (tx: ${tx.hash})`);
  }

  // Optional: Initialize tokens if needed
  /*
  console.log("Initializing tokens...");
  for (const [name, address] of Object.entries(TOKENS)) {
    const tx = await zigStable.initializeToken(name, address);
    await tx.wait();
    console.log(`Initialized token ${name} at ${address}`);
  }
  */

  console.log("\nSystem configuration complete!");
  console.log(`ZiG Stable address: ${ZIG_STABLE}`);
  console.log(`Band Registry address: ${BAND_REGISTRY}`);
  console.log(`Explorer URL: https://zkevm.polygonscan.com/address/${ZIG_STABLE}#code`);
}

main().catch((error) => {
  console.error("Configuration error:", error);
  process.exitCode = 1;
});