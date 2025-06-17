// scripts/checkBandFeed.js
const { ethers } = require("hardhat");

async function main() {
  const bandRegistry = await ethers.getContractAt("BandFeedRegistry", "0x2eF5ae783bDD005c2BcC368734c57963CE908505");
  const xauFeed = await bandRegistry.getFeedAddress("XAUUSD");
  const ethFeed = await bandRegistry.getFeedAddress("ETHUSD");
  console.log(`XAUUSD Feed: ${xauFeed}`);
  console.log(`ETHUSD Feed: ${ethFeed}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});