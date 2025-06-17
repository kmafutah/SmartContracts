// scripts/updateBandRegistry.js
const { ethers } = require("hardhat");

async function main() {
  const bandRegistry = await ethers.getContractAt("BandFeedRegistry", "0x3F8D6D3B73febC2925e39e7C4A9F8fC4E0C98d26");
  const proxyAddress = "INSERT_PROXY_ADDRESS_HERE";
  await bandRegistry.setFeedAddress("XAUUSD", proxyAddress);
  await bandRegistry.setFeedAddress("ETHUSD", proxyAddress);
  console.log(`Updated BandFeedRegistry with XAUUSD and ETHUSD feeds`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});