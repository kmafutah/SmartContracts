// scripts/updateOraclePrices.js
const { ethers } = require("hardhat");
const axios = require("axios");

async function main() {
  const xauOracleAddress = "INSERT_XAU_ORACLE_ADDRESS_HERE";
  const ethOracleAddress = "INSERT_ETH_ORACLE_ADDRESS_HERE";
  const xauOracle = await ethers.getContractAt("CustomChainlinkOracle", xauOracleAddress);
  const ethOracle = await ethers.getContractAt("CustomChainlinkOracle", ethOracleAddress);

  // Fetch XAUUSD and ETHUSD from CoinGecko
  const response = await axios.get(
    "https://api.coingecko.com/api/v3/simple/price?ids=gold,ethereum&vs_currencies=usd"
  );
  const xauPrice = Math.floor(response.data.gold.usd * 1e8); // 8 decimals
  const ethPrice = Math.floor(response.data.ethereum.usd * 1e8);

  // Update oracles
  const xauTx = await xauOracle.setPrice(xauPrice);
  const ethTx = await ethOracle.setPrice(ethPrice);
  await xauTx.wait();
  await ethTx.wait();
  console.log(`XAUUSD set to ${xauPrice / 1e8} USD`);
  console.log(`ETHUSD set to ${ethPrice / 1e8} USD`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});