const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const yahooFinance = require("yahoo-finance");
const finnhub = require("finnhub");
require("dotenv").config();

// Initialize Finnhub client
const finnhubClient = new finnhub.DefaultApi();
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = process.env.FINNHUB_API;

// Map metal symbol to Yahoo Finance ticker
const YAHOO_METAL_TICKERS = {
  XAU: "GC=F", // Gold
  XAG: "SI=F", // Silver
  XPT: "PL=F", // Platinum
  XPD: "PA=F", // Palladium
};

// Map metal symbol to Finnhub ticker
const FINNHUB_METAL_TICKERS = {
  XAU: "OANDA:XAU_USD", // Gold
  XAG: "OANDA:XAG_USD", // Silver
  XPT: "OANDA:XPT_USD", // Platinum
  XPD: "OANDA:XPD_USD", // Palladium
};

async function fetchGoldApiPrice(symbol) {
  // symbol: "XAU", "XAG", "XPT", "XPD"
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
      
      // Fallback to MetalPrice API
      try {
        const metalPriceUrl = `https://api.metalpriceapi.com/v1/latest?api_key=${process.env.METAL_PRICE_API}&base=USD&currencies=EUR,XAU,XAG,XPT,XPD`;
        const metalResp = await axios.get(metalPriceUrl);
        const metalKey = `USD${symbol}`; // Convert XAU to USDXAU, etc.
        if (metalResp.data && metalResp.data.rates && metalResp.data.rates[metalKey]) {
          console.log(`ℹ️ Fallback: MetalPrice API price for ${symbol} is $${metalResp.data.rates[metalKey]}`);
          return metalResp.data.rates[metalKey];
        } else {
          throw new Error("No price from MetalPrice API for " + symbol);
        }
      } catch (e3) {
        console.warn(`⚠️ MetalPrice API also failed for ${symbol}: ${e3.message}`);
        
        // Final fallback to Finnhub
        try {
          const ticker = FINNHUB_METAL_TICKERS[symbol];
          if (!ticker) throw new Error("No Finnhub ticker for symbol " + symbol);
          
          return new Promise((resolve, reject) => {
            finnhubClient.quote(ticker, (error, data, response) => {
              if (error) {
                reject(error);
              } else if (data && data.c) {
                console.log(`ℹ️ Fallback: Finnhub price for ${symbol} is $${data.c}`);
                resolve(data.c);
              } else {
                reject(new Error("No price from Finnhub for " + symbol));
              }
            });
          });
        } catch (e4) {
          console.warn(`⚠️ All APIs failed for ${symbol}: GoldAPI, Yahoo, MetalPrice, and Finnhub`);
          return undefined;
        }
      }
    }
  }
}

async function fetchLivePrices() {
  // Fetches prices from CoinGecko and OpenExchangeRates
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
  console.log("🔄 Updating Oracle Prices...");

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

  // Update crypto prices
  for (const [symbol, price] of Object.entries(livePrices.crypto)) {
    if (isNaN(price) || price === null || price === undefined) {
      console.warn(`⚠️ Skipping ${symbol} due to invalid price: ${price}`);
      continue;
    }
    try {
      await (await oracleHub.updateCryptoPrice(symbol, ethers.parseUnits(price.toString(), 18))).wait();
      console.log(`✅ Updated crypto price: ${symbol} = $${price}`);
    } catch (e) {
      console.error(`❌ Failed to update ${symbol}:`, e.message);
    }
  }

  // Update metal prices
  for (const [symbol, price] of Object.entries(livePrices.metal)) {
    if (isNaN(price) || price === null || price === undefined) {
      console.warn(`⚠️ Skipping ${symbol} due to invalid price: ${price}`);
      continue;
    }
    try {
      await (await oracleHub.updateMetalPrice(symbol, ethers.parseUnits(price.toString(), 18))).wait();
      console.log(`✅ Updated metal price: ${symbol} = $${price}`);
    } catch (e) {
      console.error(`❌ Failed to update ${symbol}:`, e.message);
    }
  }

  // Update forex prices
  for (const [symbol, price] of Object.entries(livePrices.forex)) {
    if (isNaN(price) || price === null || price === undefined) {
      console.warn(`⚠️ Skipping ${symbol} due to invalid price: ${price}`);
      continue;
    }
    try {
      await (await oracleHub.updateForexPrice(symbol, ethers.parseUnits(price.toString(), 18))).wait();
      console.log(`✅ Updated forex price: ${symbol} = $${price}`);
    } catch (e) {
      console.error(`❌ Failed to update ${symbol}:`, e.message);
    }
  }

  console.log("\n🎉 All prices updated successfully!");
}

main().catch((error) => {
  console.error("❌ Oracle price update failed:", error);
  process.exit(1);
});
