const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const yahooFinance = require("yahoo-finance");
const finnhub = require("finnhub");
require("dotenv").config();

const CRYPTO_ASSETS = ["BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD"];
const METAL_ASSETS = ["XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD"];
const FOREX_ASSETS = ["EURUSD", "GBPUSD", "USDZAR", "USDJPY", "USDCHF", "USDCNH"];

const YAHOO_METAL_TICKERS = {
  XAU: "GC=F",
  XAG: "SI=F",
  XPT: "PL=F",
  XPD: "PA=F",
};

// Map metal symbol to Finnhub ticker
const FINNHUB_METAL_TICKERS = {
  XAU: "OANDA:XAU_USD", // Gold
  XAG: "OANDA:XAG_USD", // Silver
  XPT: "OANDA:XPT_USD", // Platinum
  XPD: "OANDA:XPD_USD", // Palladium
};

// Initialize Finnhub client
const finnhubClient = new finnhub.DefaultApi();
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = process.env.FINNHUB_API;

async function fetchGoldApiPrice(symbol) {
  const url = `https://www.goldapi.io/api/${symbol}/USD`;
  try {
    const resp = await axios.get(url, {
      headers: {
        'x-access-token': process.env.GOLD_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return resp.data.price;
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

async function updateInSteps(asset, current, target, updateFn, assetType, getCurrentPriceFn) {
  const maxDeviation = 0.05; // 5% (reduced from 10% to be more conservative)
  let cur = current;
  let step = 0;
  
  while (Math.abs(target - cur) / cur > maxDeviation) {
    const direction = target > cur ? 1 : -1;
    const next = cur * (1 + direction * maxDeviation);
    const nextRounded = Number(next.toFixed(10));
    
    console.log(`Step ${++step}: Updating ${asset} (${assetType}) from $${cur} to $${nextRounded} (deviation: ${((Math.abs(target - cur) / cur) * 100).toFixed(2)}%)`);
    
    try {
      await updateFn(asset, nextRounded);
      // Read the actual price from the blockchain after update
      cur = await getCurrentPriceFn(asset);
      console.log(`✅ Step ${step} complete. New on-chain price: $${cur}`);
    } catch (error) {
      console.error(`❌ Step ${step} failed:`, error.message);
      throw error;
    }
    
    // Wait a bit to avoid nonce/race issues
    await new Promise(res => setTimeout(res, 2000));
  }
  
  // Final update to target
  console.log(`Final step: Updating ${asset} (${assetType}) from $${cur} to $${target}`);
  await updateFn(asset, target);
  console.log(`✅ Final: Updated ${asset} (${assetType}) to $${target}`);
}

async function main() {
  console.log("🔄 Incremental Oracle Price Update...");

  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ No deployment addresses found. Run deployment first.");
    return;
  }
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const oracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);
  const fmt = (v) => Number(ethers.formatUnits(v, 18));

  const livePrices = await fetchLivePrices();

  // Helper to update price on-chain
  const updateCrypto = async (asset, price) => {
    await (await oracleHub.updateCryptoPrice(asset, ethers.parseUnits(price.toString(), 18))).wait();
  };
  const updateMetal = async (asset, price) => {
    await (await oracleHub.updateMetalPrice(asset, ethers.parseUnits(price.toString(), 18))).wait();
  };
  const updateForex = async (asset, price) => {
    await (await oracleHub.updateForexPrice(asset, ethers.parseUnits(price.toString(), 18))).wait();
  };

  // Helper to get current price from blockchain
  const getCryptoPrice = async (asset) => {
    const data = await oracleHub.cryptoPrices(asset);
    return fmt(data.price);
  };
  const getMetalPrice = async (asset) => {
    const data = await oracleHub.metalPrices(asset);
    return fmt(data.price);
  };
  const getForexPrice = async (asset) => {
    const data = await oracleHub.forexPrices(asset);
    return fmt(data.price);
  };

  // Crypto
  for (const asset of CRYPTO_ASSETS) {
    const live = livePrices.crypto[asset];
    if (isNaN(live) || live === null || live === undefined) continue;
    const data = await oracleHub.cryptoPrices(asset);
    const cur = fmt(data.price);
    if (cur === 0) {
      await updateCrypto(asset, live);
      console.log(`Set ${asset} (crypto) to $${live} (was 0)`);
      continue;
    }
    if (Math.abs(live - cur) / cur > 0.10) {
      console.log(`Incremental update needed for ${asset} (crypto): on-chain $${cur} -> live $${live}`);
      await updateInSteps(asset, cur, live, updateCrypto, "crypto", getCryptoPrice);
    } else {
      await updateCrypto(asset, live);
      console.log(`Updated ${asset} (crypto) to $${live}`);
    }
  }

  // Metals
  for (const asset of METAL_ASSETS) {
    const live = livePrices.metal[asset];
    if (isNaN(live) || live === null || live === undefined) continue;
    const data = await oracleHub.metalPrices(asset);
    const cur = fmt(data.price);
    if (cur === 0) {
      await updateMetal(asset, live);
      console.log(`Set ${asset} (metal) to $${live} (was 0)`);
      continue;
    }
    if (Math.abs(live - cur) / cur > 0.10) {
      console.log(`Incremental update needed for ${asset} (metal): on-chain $${cur} -> live $${live}`);
      await updateInSteps(asset, cur, live, updateMetal, "metal", getMetalPrice);
    } else {
      await updateMetal(asset, live);
      console.log(`Updated ${asset} (metal) to $${live}`);
    }
  }

  // Forex
  for (const asset of FOREX_ASSETS) {
    const live = livePrices.forex[asset];
    if (isNaN(live) || live === null || live === undefined) continue;
    const data = await oracleHub.forexPrices(asset);
    const cur = fmt(data.price);
    if (cur === 0) {
      await updateForex(asset, live);
      console.log(`Set ${asset} (forex) to $${live} (was 0)`);
      continue;
    }
    if (Math.abs(live - cur) / cur > 0.10) {
      console.log(`Incremental update needed for ${asset} (forex): on-chain $${cur} -> live $${live}`);
      await updateInSteps(asset, cur, live, updateForex, "forex", getForexPrice);
    } else {
      await updateForex(asset, live);
      console.log(`Updated ${asset} (forex) to $${live}`);
    }
  }

  console.log("\n✅ Incremental price updates complete.");
}

main().catch((error) => {
  console.error("❌ Incremental price update failed:", error);
  process.exit(1);
}); 