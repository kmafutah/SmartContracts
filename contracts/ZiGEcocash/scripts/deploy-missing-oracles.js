const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

async function fetchLivePrices() {
  try {
    console.log("\n📡 Fetching live prices from APIs...");
    const coingecko = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'bitcoin,ethereum,binancecoin',
        vs_currencies: 'usd',
      },
    });
    const fx = await axios.get('https://openexchangerates.org/api/latest.json', {
      params: {
        app_id: process.env.OPENEXG_APPID,
        symbols: 'ZAR,EUR,GBP,CHF,JPY,XAU',
      },
    });
    return {
      BTCUSD: coingecko.data.bitcoin.usd,
      ETHUSD: coingecko.data.ethereum.usd,
      BNBUSD: coingecko.data.binancecoin.usd,
      XAUUSD: 1 / fx.data.rates.XAU,
      USDZAR: fx.data.rates.ZAR,
      EURUSD: fx.data.rates.EUR,
      GBPUSD: fx.data.rates.GBP,
      USDCHF: fx.data.rates.CHF,
      USDJPY: fx.data.rates.JPY,
    };
  } catch (error) {
    console.error("❌ Failed to fetch live prices:", error.message);
    throw error;
  }
}

async function main() {
  console.log("🔧 Deploying Missing Oracle Contracts...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Load existing deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ No deployment addresses found. Run deployment first.");
    return;
  }
  
  const existingAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("📄 Loaded existing deployment addresses");

  const newAddresses = {};

  try {
    // 1. Deploy FeedRegistry
    console.log("\n📦 Deploying FeedRegistry...");
    const FeedRegistry = await ethers.getContractFactory("FeedRegistry");
    const feedRegistry = await FeedRegistry.deploy();
    await feedRegistry.waitForDeployment();
    newAddresses.FeedRegistry = await feedRegistry.getAddress();
    console.log("✅ FeedRegistry deployed to:", newAddresses.FeedRegistry);

    // 2. Deploy BandFeedRegistry
    console.log("\n📦 Deploying BandFeedRegistry...");
    const BandFeedRegistry = await ethers.getContractFactory("BandFeedRegistry");
    const bandFeedRegistry = await BandFeedRegistry.deploy();
    await bandFeedRegistry.waitForDeployment();
    await bandFeedRegistry.initialize(deployer.address);
    newAddresses.BandFeedRegistry = await bandFeedRegistry.getAddress();
    console.log("✅ BandFeedRegistry deployed to:", newAddresses.BandFeedRegistry);

    // 3. Deploy LiveBandFeed with real-time prices
    console.log("\n📦 Deploying LiveBandFeed...");
    const LiveBandFeed = await ethers.getContractFactory("LiveBandFeed");
    const liveBandFeed = await LiveBandFeed.deploy();
    await liveBandFeed.waitForDeployment();
    newAddresses.LiveBandFeed = await liveBandFeed.getAddress();
    console.log("✅ LiveBandFeed deployed to:", newAddresses.LiveBandFeed);

    // Fetch live prices
    const livePrices = await fetchLivePrices();
    console.log("🔧 Setting real-time prices in LiveBandFeed...");
    for (const [pair, price] of Object.entries(livePrices)) {
      if (isNaN(price) || price === null || price === undefined) {
        console.warn(`⚠️ Skipping ${pair} due to invalid price: ${price}`);
        continue;
      }
      await (await liveBandFeed.setPrice(pair, ethers.parseUnits(price.toString(), 18))).wait();
      console.log(`✅ Set ${pair} price to $${price}`);
    }

    // 4. Deploy CustomChainlinkOracle contracts for each price pair (using live prices)
    console.log("\n📦 Deploying CustomChainlinkOracle contracts...");
    const oraclePairs = Object.keys(livePrices);
    const customOracles = {};

    for (const pair of oraclePairs) {
      const CustomChainlinkOracle = await ethers.getContractFactory("CustomChainlinkOracle");
      const oracle = await CustomChainlinkOracle.deploy(18); // 18 decimals
      await oracle.waitForDeployment();
      customOracles[pair] = await oracle.getAddress();
      // Set the price in the oracle
      const price = livePrices[pair] || "1000"; // fallback
      await (await oracle.setPrice(ethers.parseUnits(price.toString(), 18))).wait();
      console.log(`✅ Deployed ${pair} oracle at ${customOracles[pair]} with price $${price}`);
    }

    // 5. Deploy MultiOracle (using live prices)
    console.log("\n📦 Deploying MultiOracle...");
    const MultiOracle = await ethers.getContractFactory("MultiOracle");
    const multiOracle = await MultiOracle.deploy();
    await multiOracle.waitForDeployment();
    newAddresses.MultiOracle = await multiOracle.getAddress();
    console.log("✅ MultiOracle deployed to:", newAddresses.MultiOracle);

    // Set prices in MultiOracle
    for (const [pair, price] of Object.entries(livePrices)) {
      await (await multiOracle.setPrice(pair, ethers.parseUnits(price.toString(), 18), 18)).wait();
      console.log(`✅ Set ${pair} in MultiOracle to $${price}`);
    }

    // 6. Configure ZiGOracleHub with the new oracles
    console.log("\n🔧 Configuring ZiGOracleHub with new oracles...");
    const oracleHub = await ethers.getContractAt("ZiGOracleHub", existingAddresses.ZiGOracleHub);

    // First, authorize the deployer as an oracle
    await (await oracleHub.addOracle(deployer.address)).wait();
    console.log("✅ Authorized deployer as oracle");

    // Set up the token oracles for ZiG and ZiGT
    await (await oracleHub.setTokenOracle(existingAddresses.ZiG, customOracles["XAUUSD"])).wait();
    await (await oracleHub.setTokenOracle(existingAddresses.ZiGT, customOracles["USDZAR"])).wait();
    console.log("✅ Set token oracles for ZiG and ZiGT");

    // Set up chainlink feeds
    for (const [pair, oracleAddress] of Object.entries(customOracles)) {
      await (await oracleHub.setChainlinkFeed(pair, oracleAddress)).wait();
      console.log(`✅ Set chainlink feed for ${pair}`);
    }

    // 7. Update Vault to recognize ZiG as supported collateral
    console.log("\n🔧 Configuring Vault...");
    const vault = await ethers.getContractAt("Vault", existingAddresses.Vault);
    
    try {
      await (await vault.addSupportedToken(existingAddresses.ZiG, 15000)).wait(); // 150% collateral ratio
      console.log("✅ Added ZiG as supported collateral in Vault");
    } catch (e) {
      if (e.message.includes('Token already supported')) {
        console.log("✅ ZiG is already supported collateral");
      } else {
        throw e;
      }
    }

    // 8. Save the new addresses
    const updatedAddresses = { ...existingAddresses, ...newAddresses };
    const updatedPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
    fs.writeFileSync(updatedPath, JSON.stringify(updatedAddresses, null, 2));
    console.log("📄 Updated deployment addresses saved");

    console.log("\n🎉 Oracle deployment completed successfully!");
    console.log("\n📋 New Contract Addresses:");
    for (const [name, address] of Object.entries(newAddresses)) {
      console.log(`- ${name}: ${address}`);
    }

  } catch (error) {
    console.error("❌ Oracle deployment failed:", error);
    throw error;
  }
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});