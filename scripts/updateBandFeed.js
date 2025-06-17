// scripts/updateBandFeed.js
const { ethers } = require('hardhat');
const axios = require('axios');

const BAND_FEED_ADDRESS = '0x2eF5ae783bDD005c2BcC368734c57963CE908505';

async function fetchLivePrices() {
  const coingecko = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
    params: {
      ids: 'bitcoin,ethereum',
      vs_currencies: 'usd'
    }
  });

  const fx = await axios.get('https://openexchangerates.org/api/latest.json', {
    params: {
      app_id: process.env.OPENEXG_APPID,
      symbols: 'ZAR,XOF'
    }
  });

  const gold = await axios.get('https://www.goldapi.io/api/XAU/USD', {
  headers: {
    'x-access-token': process.env.GOLD_API_KEY,
    'Content-Type': 'application/json'
  }
  });  

  return {
    BTCUSD: coingecko.data.bitcoin.usd,
    ETHUSD: coingecko.data.ethereum.usd,
    BTC: coingecko.data.bitcoin.usd,
    ETH: coingecko.data.ethereum.usd,
    USD: 1,
    XAUUSD: gold.data.price,
    XAU: gold.data.price,
    ZAR: 1 / fx.data.rates.ZAR,
    XOF: 1 / fx.data.rates.XOF
  };
}

async function main() {
  const prices = await fetchLivePrices();
  const [signer] = await ethers.getSigners();

  const bandFeed = new ethers.Contract(
    BAND_FEED_ADDRESS,
    [
      "function setHighPrecisionPrice(string memory pair, uint256 price, uint8 decimals) external",
      "function setPrice(string memory pair, uint256 price) external",
    ],
    signer
  );

  for (const [pair, value] of Object.entries(prices)) {
    if (['ZAR', 'XOF'].includes(pair)) {
      const scaled = BigInt(Math.floor(value * 1e24).toString());
      await bandFeed.setHighPrecisionPrice(pair, scaled, 24);
      console.log(`🔁 Updated ${pair} with 24-decimal precision`);
    } else {
      await bandFeed.setPrice(pair, ethers.parseUnits(value.toString(), 18));
      console.log(`🔁 Updated ${pair} to ${value}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
