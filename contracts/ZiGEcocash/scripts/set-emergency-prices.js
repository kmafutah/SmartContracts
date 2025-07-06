const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const yahooFinance = require("yahoo-finance");
require("dotenv").config();

// Map metal symbol to Yahoo Finance ticker
const YAHOO_METAL_TICKERS = {
  XAU: "GC=F", // Gold
  XAG: "SI=F", // Silver
  XPT: "PL=F", // Platinum
  XPD: "PA=F", // Palladium
};

async function fetchGoldApiPrice(symbol) {
  const url = `https://www.goldapi.io/api/${symbol}/USD`;
  try {
    const resp = await axios.get(url, {
      headers: {
        'x-access-token': process.env.GOLD_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return resp.data.price; // USD per ounce
  } catch (err) {
    console.warn(`⚠️ GoldAPI failed for ${symbol}: ${err.message}`);
    // Fallback to Yahoo Finance
    try {
      const ticker = YAHOO_METAL_TICKERS[symbol];
      if (!ticker) throw new Error("No Yahoo ticker for symbol " + symbol);
      const quote = await yahooFinance.quote({ symbol: ticker, modules: ["price"] });
      if (quote && quote.price && quote.price.regularMarketPrice) {
        console.log(`ℹ️ Fallback: Yahoo Finance price for ${symbol} is $${quote.price.regularMarketPrice}`);
        return quote.price.regularMarketPrice;
      } else {
        throw new Error("No price from Yahoo Finance for " + symbol);
      }
    } catch (e2) {
      console.warn(`⚠️ Yahoo Finance also failed for ${symbol}: ${e2.message}`);
      return undefined;
    }
  }
}

async function fetchLivePrices() {
  try {
    console.log("\n📡 Fetching live prices from APIs...");
    const coingecko = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'bitcoin,ethereum,binancecoin,ripple,solana',
        vs_currencies: 'usd',
      },
    });
    const fx = await axios.get('https://openexchangerates.org/api/latest.json', {
      params: {
        app_id: process.env.OPENEXG_APPID,
        symbols: 'ZAR,EUR,GBP,CHF,JPY,CNH',
      },
    });
    // Metals from GoldAPI.io, fallback to Yahoo Finance
    const metals = {};
    for (const symbol of ["XAU", "XAG", "XPT", "XPD"]) {
      try {
        metals[`${symbol}USD`] = await fetchGoldApiPrice(symbol);
      } catch (e) {
        console.warn(`⚠️ Could not fetch ${symbol} price:`, e.message);
      }
    }
    return {
      crypto: {
        BTCUSD: coingecko.data.bitcoin.usd,
        ETHUSD: coingecko.data.ethereum.usd,
        BNBUSD: coingecko.data.binancecoin.usd,
        XRPUSD: coingecko.data.ripple.usd,
        SOLUSD: coingecko.data.solana.usd,
      },
      metal: metals,
      forex: {
        EURUSD: 1 / fx.data.rates.EUR,
        GBPUSD: 1 / fx.data.rates.GBP,
        USDZAR: fx.data.rates.ZAR,
        USDJPY: fx.data.rates.JPY,
        USDCHF: fx.data.rates.CHF,
        USDCNH: fx.data.rates.CNH,
      }
    };
  } catch (error) {
    console.error("❌ Failed to fetch live prices:", error.message);
    throw error;
  }
}

async function main() {
  console.log("🚨 Setting Emergency Prices for One-Time Reset...");

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ No deployment addresses found. Run deployment first.");
    return;
  }
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Connect to the oracle hub
  const oracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);

  // Fetch live prices
  const livePrices = await fetchLivePrices();

  // Set emergency prices for crypto
  for (const [symbol, price] of Object.entries(livePrices.crypto)) {
    if (isNaN(price) || price === null || price === undefined) {
      console.warn(`⚠️ Skipping ${symbol} due to invalid price: ${price}`);
      continue;
    }
    try {
      await (await oracleHub.setEmergencyPrice(symbol, ethers.parseUnits(price.toString(), 18))).wait();
      console.log(`🚨 Set emergency crypto price: ${symbol} = $${price}`);
    } catch (e) {
      console.error(`❌ Failed to set emergency price for ${symbol}:`, e.message);
    }
  }

  // Set emergency prices for metals
  for (const [symbol, price] of Object.entries(livePrices.metal)) {
    if (isNaN(price) || price === null || price === undefined) {
      console.warn(`⚠️ Skipping ${symbol} due to invalid price: ${price}`);
      continue;
    }
    try {
      await (await oracleHub.setEmergencyPrice(symbol, ethers.parseUnits(price.toString(), 18))).wait();
      console.log(`🚨 Set emergency metal price: ${symbol} = $${price}`);
    } catch (e) {
      console.error(`❌ Failed to set emergency price for ${symbol}:`, e.message);
    }
  }

  // Set emergency prices for forex
  for (const [symbol, price] of Object.entries(livePrices.forex)) {
    if (isNaN(price) || price === null || price === undefined) {
      console.warn(`⚠️ Skipping ${symbol} due to invalid price: ${price}`);
      continue;
    }
    try {
      await (await oracleHub.setEmergencyPrice(symbol, ethers.parseUnits(price.toString(), 18))).wait();
      console.log(`🚨 Set emergency forex price: ${symbol} = $${price}`);
    } catch (e) {
      console.error(`❌ Failed to set emergency price for ${symbol}:`, e.message);
    }
  }

  console.log("\n✅ Emergency prices set. You can now update normal prices without deviation errors.");
}

main().catch((error) => {
  console.error("❌ Emergency price setting failed:", error);
  process.exit(1);
}); 