// scripts/deployBandFeed.js
const { ethers, run } = require('hardhat');
const axios = require('axios');

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

  const LiveBandFeed = await ethers.getContractFactory('LiveBandFeed');
  const bandFeed = await LiveBandFeed.deploy();
  await bandFeed.waitForDeployment();
  const bandFeedAddress = await bandFeed.getAddress();

  console.log(`✅ LiveBandFeed deployed at: ${bandFeedAddress}`);

  const highPrecision = new ethers.Contract(
    bandFeedAddress,
    [
      "function setHighPrecisionPrice(string memory pair, uint256 price, uint8 decimals) external",
      "function setPrice(string memory pair, uint256 price) external",
    ],
    signer
  );

  for (const [pair, value] of Object.entries(prices)) {
    if (['ZAR', 'XOF'].includes(pair)) {
      const scaled = BigInt(Math.round(parseFloat(value) * 1e12)) * BigInt(1e12);
      await highPrecision.setHighPrecisionPrice(pair, scaled, 24);
      console.log(`🔬 Set ${pair} with 24-decimal precision`);
    } else {
      await highPrecision.setPrice(pair, ethers.parseUnits(value.toString(), 18));
      console.log(`💱 Set ${pair} to ${value}`);
    }
  }

  // Register in BandFeedRegistry
  const registry = new ethers.Contract(
    '0xfD9e4c97Bc38b56d4b87203087e7450E4D01236D',
    ['function setFeedAddress(string memory assetPair, address feedAddress) external'],
    signer
  );

  for (const pair of ['BTCUSD', 'ETHUSD', 'XAUUSD', 'ZAR', 'XOF']) {
    const tx = await registry.setFeedAddress(pair, bandFeedAddress);
    await tx.wait();
    console.log(`📦 Registered ${pair} feed with BandFeedRegistry`);
  }

  // Verify the contract
  console.log("🔍 Verifying contract...");
  await run("verify:verify", {
    address: bandFeedAddress,
    constructorArguments: [],
  });
  console.log("✅ Contract verified");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
