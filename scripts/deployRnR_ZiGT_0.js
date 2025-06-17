const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");
require("dotenv").config();
const axios = require("axios");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
import { Contract } from "ethers";

// ======================
// Configuration
// ======================
const STRATEGIC_DIRECTION = {
  Famous8PlusZAR: 0,
  G20ReserveModel: 1,
  PanAfroEurasianModel: 2,
  ZiGMirrorModel: 3,
  ReparationsModel: 4
};


const TOKEN_SUPPLIES = {
  GOVERNANCE: ethers.parseEther("1000000"),
  MAIN_ZIGT: ethers.parseEther("10000000"),
  UTILITY: ethers.parseEther("100000000"),
  MEME: ethers.parseEther("1000000000"),
  RWA: ethers.parseEther("1000"),
  GAMEFI: ethers.parseEther("1000000")
};

const DEPLOYMENT_PARAMS = {
  MIN_REDISTRIBUTION_SHARE: 2500, // 25%
  GOVERNANCE_MINT_AMOUNT: ethers.parseEther("50000"),
  REBALANCE_INTERVAL: 90 * 24 * 60 * 60 // 90 days in seconds
};

// ======================
// Helper Function: Fetch Live Prices
// ======================
function toWei(val, decimals) {
  // val is a JS number or string; convert to BigInt integer
  const scaled = BigInt(Math.floor(Number(val) * 10 ** decimals));
  return scaled.toString();
}

// === 2. Safe address check helper ===
function requireAddress(name: string, address: string | undefined | null): string {
  if (!address || !ethers.utils.isAddress(address)) {
    throw new Error(`Invalid or missing address for ${name}: ${address}`);
  }
  return address;
}

let coingecko;
let fx;
async function fetchLivePrices() {
  try {
    console.log("\n📡 Fetching live prices from APIs...");
    
    coingecko = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'bitcoin,ethereum,binancecoin',
        vs_currencies: 'usd'
      }
    });

    fx = await axios.get('https://openexchangerates.org/api/latest.json', {
      params: {
        app_id: process.env.OPENEXG_APPID,
        symbols: 'ZAR,XOF,NGN,EGP,RUB,TRY,INR,AUD,EUR,GBP,CHF,JPY,NZD,CNY,CAD,XAU'
      }
    });

    // const gold = await axios.get('https://www.goldapi.io/api/XAU/USD', {
    //   headers: {
    //     'x-access-token': process.env.GOLD_API_KEY,
    //     'Content-Type': 'application/json'
    //   }
    // });

    return {
      BTCUSD: coingecko.data.bitcoin.usd,
      ETHUSD: coingecko.data.ethereum.usd,
      BNBUSD: coingecko.data.binancecoin.usd,
      XAUUSD: 1 / fx.data.rates.XAU,//gold.data.price,
      USDZAR: 1 / fx.data.rates.ZAR,
      USDXOF: 1 / fx.data.rates.XOF,
      USDNGN: 1 / fx.data.rates.NGN,
      USDEGP: 1 / fx.data.rates.EGP,
      USDRUB: 1 / fx.data.rates.RUB,
      USDTRY: 1 / fx.data.rates.TRY,
      USDINR: 1 / fx.data.rates.INR,
      AUDUSD: fx.data.rates.AUD,
      EURUSD: fx.data.rates.EUR,
      GBPUSD: fx.data.rates.GBP,
      USDCHF: fx.data.rates.CHF,
      USDJPY: fx.data.rates.JPY,
      NZDUSD: fx.data.rates.NZD,
      CNYUSD: 1 / fx.data.rates.CNY,
      CADUSD: 1 / fx.data.rates.CAD,
      USDUSD: 1 // Mock USD/USD price
    };
  } catch (error) {
    console.error("❌ Failed to fetch live prices:", error.message);
    throw error;
  }
}

// ======================
// Main Deployment Script
// ======================
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`\n🚀 Deploying with account: ${deployer.address}`);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "sFUEL");
  
  // Deployment tracker
  const deployedContracts = {};

  // ======================
  // Phase 1: Core Infrastructure
  // ======================
  console.log("\n🔨 Phase 1: Deploying Core Infrastructure...");

  // 1.1 Registries
  deployedContracts.FeedRegistry = await deployContract("FeedRegistry", [], false);
  deployedContracts.BandFeedRegistry = await deployContract("BandFeedRegistry", [deployer.address], true);
  
  // Deploy LiveBandFeed and set real prices
  console.log("\n📊 Deploying LiveBandFeed with real price data...");
  const LiveBandFeed = await ethers.getContractFactory('LiveBandFeed');
  const bandFeed = await LiveBandFeed.deploy();
  await bandFeed.waitForDeployment();
  const bandFeedAddress = await bandFeed.getAddress();
  console.log(`✅ LiveBandFeed deployed at: ${bandFeedAddress}`);
  deployedContracts.LiveBandFeed = bandFeedAddress;

  // Fetch live prices and set them
  const prices = await fetchLivePrices();
  const highPrecision = new ethers.Contract(
    bandFeedAddress,
    [
      "function setHighPrecisionPrice(string memory pair, uint256 price, uint8 decimals) external",
      "function setPrice(string memory pair, uint256 price) external",
    ],
    deployer
  );

for (const [pair, value] of Object.entries(prices)) {
  if (isNaN(value) || value === null || value === undefined) {
    console.warn(`⚠️ Skipping ${pair} due to invalid price: ${value}`);
    continue;
  }

  const numValue = parseFloat(value);

  if (['USDZAR', 'USDXOF', 'USDNGN', 'USDEGP', 'USDRUB', 'USDTRY', 'USDINR'].includes(pair)) {
    const scaled = BigInt(Math.round(numValue * 1e12)) * BigInt(1e12);
    await highPrecision.setHighPrecisionPrice(pair, scaled, 24);
    console.log(`🔬 Set ${pair} with 24-decimal precision: ${numValue}`);
  } else {
    await highPrecision.setPrice(pair, ethers.parseUnits(numValue.toString(), 18));
    console.log(`💱 Set ${pair} to ${numValue}`);
  }
}


  // Register feeds in BandFeedRegistry
  console.log("\n🔗 Registering feeds in BandFeedRegistry...");
  const bandFeedRegistry = await ethers.getContractAt("BandFeedRegistry", deployedContracts.BandFeedRegistry);
  const assetPairs = [
    "BTCUSD", "ETHUSD", "BNBUSD", "XAUUSD", "USDZAR", "USDXOF", "USDNGN",
    "USDEGP", "USDRUB", "USDTRY", "USDINR", "AUDUSD", "EURUSD", "GBPUSD",
    "USDCHF", "USDJPY", "NZDUSD", "CNYUSD", "CADUSD", "USDUSD"
  ];

  for (const pair of assetPairs) {
    const tx = await bandFeedRegistry.setFeedAddress(pair, bandFeedAddress);
    await tx.wait();
    console.log(`📦 Registered ${pair} feed with BandFeedRegistry`);
  }

  // 1.2 Governance
  deployedContracts.GovernanceToken = await deployContract(
    "ZiGGovernanceToken",
    [deployer.address, TOKEN_SUPPLIES.GOVERNANCE, deployer.address],
    true
  );

  // 1.3 Vault & Access Control
  deployedContracts.RedistributionVault = await deployContract(
    "RedistributionVault",
    [
      deployedContracts.GovernanceToken,
      deployer.address,
      deployer.address,
      deployer.address,
      DEPLOYMENT_PARAMS.MIN_REDISTRIBUTION_SHARE
    ],
    true
  );

  deployedContracts.AccessVerifier = await deployContract("AccessVerifier", [], true);
  deployedContracts.ReparationsDAO = await deployContract("ReparationsDAO", [], true);

  // 1.4 Oracles
  deployedContracts.OracleHub = await deployContract("ZiGOracleHub", [deployer.address], false);

  // Deploy CustomChainlinkOracle for each pair (SKALE-specific)
  console.log("\n🔗 Deploying CustomChainlinkOracles for SKALE...");
  const customOracles = {};
  const oraclePairs = [
    "XAUUSD", "BTCUSD", "ETHUSD", "AUDUSD", "USDZAR", "USDXOF", "USDNGN",
    "USDEGP", "USDRUB", "USDTRY", "USDINR", "EURUSD", "GBPUSD", "USDCHF",
    "USDJPY", "NZDUSD", "CNYUSD", "CADUSD", "USDUSD"
  ];

  const highPrecisionPairs = ['USDZAR', 'USDXOF', 'USDNGN', 'USDEGP', 'USDRUB', 'USDTRY', 'USDINR', 'CNYUSD', 'CADUSD'];

for (const pair of oraclePairs) {
  customOracles[pair] = await deployContract("CustomChainlinkOracle", [18], false);
  const oracle = await ethers.getContractAt("CustomChainlinkOracle", customOracles[pair]);

  const raw = prices[pair];

  if (raw === undefined || raw === null || isNaN(parseFloat(raw))) {
    console.warn(`⚠️ Skipping ${pair}: Invalid or missing price (${raw})`);
    continue;
  }

  const parsedValue = parseFloat(raw);
  let price;

  if (highPrecisionPairs.includes(pair)) {
    const scaled = BigInt(Math.round(parsedValue * 1e9)) * BigInt(1e9);
    price = scaled.toString();
  } else {
    price = ethers.parseUnits(parsedValue.toString(), 18).toString();
  }

  await oracle.setPrice(price);
  console.log(`✅ Set ${pair} price to ${parsedValue} in CustomChainlinkOracle`);
}


  console.log("\n🔗 Deploying MultiOracle for SKALE...");
  const MultiOracle = await ethers.getContractFactory("MultiOracle");
  const multiOracle = await MultiOracle.deploy();
  await multiOracle.waitForDeployment();
  const multiOracleAddress = await multiOracle.getAddress();
  console.log(`✅ MultiOracle deployed at: ${multiOracleAddress}`);
  deployedContracts.MultiOracle = multiOracleAddress;

  const pairs = {
        "BTCUSD": { price: coingecko.data.bitcoin.usd,decimal:18 },
        "ETHUSD": { price: coingecko.data.ethereum.usd,decimal:18 },
        "BNBUSD": { price: coingecko.data.binancecoin.usd,decimal:18 },
        "XAUUSD": { price: 1 / fx.data.rates.XAU,decimal:18 },
        "USDZAR": { price: 1 / fx.data.rates.ZAR,decimal:18 },
        "USDXOF": { price: 1 / fx.data.rates.XOF,decimal:18 },
        "USDNGN": { price: 1 / fx.data.rates.NGN,decimal:18 },
        "USDEGP": { price: 1 / fx.data.rates.EGP,decimal:18 },
        "USDRUB": { price: 1 / fx.data.rates.RUB,decimal:18 },
        "USDTRY": { price: 1 / fx.data.rates.TRY,decimal:18 },
        "USDINR": { price: 1 / fx.data.rates.INR,decimal:18 },
        "AUDUSD": { price: fx.data.rates.AUD,decimal:18 },
        "EURUSD": { price: fx.data.rates.EUR,decimal:18 },
        "GBPUSD": { price: fx.data.rates.GBP,decimal:18 },
        "USDCHF": { price: fx.data.rates.CHF,decimal:18 },
        "USDJPY": { price: fx.data.rates.JPY,decimal:18 },
        "NZDUSD": { price: fx.data.rates.NZD,decimal:18 },
        "CNYUSD": { price: 1 / fx.data.rates.CNY,decimal:18 },
        "CADUSD": { price: fx.data.rates.CAD,decimal:18 }, // Corrected to CADUSD
        "USDUSD": { price: 1 ,decimal:18 }
  };

  for (const [pair, config] of Object.entries(pairs)) {
    try {
      const priceWei = toWei(config.price, config.decimal);
      await multiOracle.setPrice(pair, priceWei, config.decimal);
      console.log(`✅ Set ${pair} price: ${config.price} (${config.decimal}d)`);
      
      const stored = await multiOracle.prices(ethers.keccak256(ethers.toUtf8Bytes(pair)));
      console.log(`   Verified: ${Number(stored) / 10**config.decimal}`);
    } catch (err) {
      console.error(`❌ Failed to set ${pair}: ${err.message}`);
    }
  }
  // Set oracles in ZiGOracleHub
  console.log("\n🔗 Setting up oracles in ZiGOracleHub...");
  const oracleHub = await ethers.getContractAt("ZiGOracleHub", deployedContracts.OracleHub);
  for (const pair of oraclePairs) {
    const oracleAddr = customOracles[pair];
    if (!oracleAddr) {
      console.warn(`⚠️ Skipping oracle setup for ${pair}, no custom feed deployed`);
      continue;
    }
     // ✅ Use safe check
  const target = requireAddress("Oracle target", config.oracleTarget);
   
    // decide isInverse based on whether pair starts with "USD"
    const isInverse = pair.startsWith("USD") && pair !== "USDUSD";
    await oracleHub.setOracle(pair, oracleAddr, 18, false, isInverse);
    console.log(`🔗 Oracle set for ${pair}: ${oracleAddr} (inverse=${isInverse})`);
  }
  await oracleHub.setOracle("XAUUSD", customOracles["XAUUSD"], 18, false, false); // Gold/USD
  await oracleHub.setOracle("BTCUSD", customOracles["BTCUSD"], 18, false, false); // BTC/USD
  await oracleHub.setOracle("ETHUSD", customOracles["ETHUSD"], 18, false, false); // ETH/USD
  await oracleHub.setOracle("AUDUSD", customOracles["AUDUSD"], 18, false, false); // AUD/USD
  await oracleHub.setOracle("USDZAR", customOracles["USDZAR"], 18, false, true); // USD/ZAR (inverse)
  await oracleHub.setOracle("EURUSD", customOracles["EURUSD"], 18, false, false); // EUR/USD
  await oracleHub.setOracle("GBPUSD", customOracles["GBPUSD"], 18, false, false); // GBP/USD
  await oracleHub.setOracle("USDCHF", customOracles["USDCHF"], 18, false, true); // USD/CHF (inverse)
  await oracleHub.setOracle("USDJPY", customOracles["USDJPY"], 18, false, true); // USD/JPY (inverse)
  await oracleHub.setOracle("BNBUSD", customOracles["BNBUSD"], 18, false, false); // BNB/USD
  await oracleHub.setOracle("USDNGN", customOracles["USDNGN"], 18, false, true); // NGN/USD (inverse)
  await oracleHub.setOracle("USDEGP", customOracles["USDEGP"], 18, false, true); // EGP/USD (inverse)
  await oracleHub.setOracle("USDRUB", customOracles["USDRUB"], 18, false, true); // RUB/USD (inverse)
  await oracleHub.setOracle("USDTRY", customOracles["USDTRY"], 18, false, true); // TRY/USD (inverse)
  await oracleHub.setOracle("USDINR", customOracles["USDINR"], 18, false, true); // INR/USD (inverse)
  await oracleHub.setOracle("USDXOF", customOracles["USDXOF"], 18, false, true); // USD/XOF (inverse)
  await oracleHub.setOracle("USDUSD", customOracles["USDUSD"], 18, false, false); // USD/USD (mock price = 1)
  await oracleHub.setOracle("NZDUSD", customOracles["NZDUSD"], 18, false, false); // NZD/USD
  await oracleHub.setOracle("CNYUSD", customOracles["CNYUSD"], 18, false, true); // CNY/USD (inverse)
  await oracleHub.setOracle("CADUSD", customOracles["CADUSD"], 18, false, true); // CAD/USD (inverse)
  console.log("✅ ZiGOracleHub oracles configured");

  if (!deployedContracts.RedistributionVault) {
  throw new Error("🛑 RedistributionVault not deployed or not registered");
}

// deployedContracts.EthicalGuardImpl = await deployContract(
//   "EthicalGuardImpl",
//   [deployedContracts.RedistributionVault],
//   true
// );

  // ======================
  // Phase 2: Main Tokens
  // ======================
  console.log("\n🪙 Phase 2: Deploying Main Tokens...");

  // 2.1 Main ZiGT Token
  deployedContracts.MainZiGT = await deployZiGTToken(
    "ZiG Reparations Token",
    "ZiG-R",
    STRATEGIC_DIRECTION.ReparationsModel,
    { metals: 6000, fiat: 3000, crypto: 1000 },
    deployedContracts.GovernanceToken,
    deployedContracts.BandFeedRegistry
  );

  deployedContracts.ZiGTToken = await deployContract(
    "ZiGTToken",
    [
      deployedContracts.MainZiGT,
      deployedContracts.FeedRegistry,
      "ZiG Token",
      "ZiGT",
      "1.0"
    ],
    true
  );

  // Strategic Variants
  console.log("\n🔄 Deploying Strategic Variants...");
  // 🔄 Deploying Strategic Variants...
  const strategies = [
    // Shona‐themed Stablecoins
    { name: "ZiG Rugare",      symbol: "ZiG-RG", strategy: STRATEGIC_DIRECTION.ZiGMirrorModel,      ratio: { metals: 5000, fiat: 4000, crypto: 1000 } },
    { name: "ZiG Kubatana",     symbol: "ZiG-KB", strategy: STRATEGIC_DIRECTION.Famous8PlusZAR,       ratio: { metals: 6000, fiat: 3000, crypto: 1000 } },

    // Pan-African Stablecoins
    { name: "ZiG Ubuntu",       symbol: "ZiG-UB", strategy: STRATEGIC_DIRECTION.PanAfroEurasianModel, ratio: { metals: 5000, fiat: 3000, crypto: 2000 } }, // Ubuntu Resilience
    { name: "ZiG Sankofa",      symbol: "ZiG-SF", strategy: STRATEGIC_DIRECTION.PanAfroEurasianModel, ratio: { metals: 4500, fiat: 2500, crypto: 3000 } }, // Sankofa Legacy

    // Pan-African Tokens
    { name: "ZiG Corridor",     symbol: "ZiG-PC", strategy: STRATEGIC_DIRECTION.PanAfroEurasianModel, ratio: { metals: 4000, fiat: 4000, crypto: 2000 } }, // Pan-African Corridor
    { name: "ZiG Mshale",       symbol: "ZiG-MG", strategy: STRATEGIC_DIRECTION.PanAfroEurasianModel, ratio: { metals: 3000, fiat: 2000, crypto: 5000 } }, // Mshale Growth
    { name: "ZiG Shujaa",       symbol: "ZiG-SH", strategy: STRATEGIC_DIRECTION.PanAfroEurasianModel, ratio: { metals: 3500, fiat: 4000, crypto: 2500 } }, // Shujaa Shield

    // Shona‐themed Tokens
    { name: "ZiG Chiedza",      symbol: "ZiG-CD", strategy: STRATEGIC_DIRECTION.Famous8PlusZAR,       ratio: { metals: 4000, fiat: 3000, crypto: 3000 } },
    { name: "ZiG Kukunda",      symbol: "ZiG-KU", strategy: STRATEGIC_DIRECTION.Famous8PlusZAR,       ratio: { metals: 5000, fiat: 2000, crypto: 3000 } },
    { name: "ZiG Kubudirira",   symbol: "ZiG-KD", strategy: STRATEGIC_DIRECTION.Famous8PlusZAR,       ratio: { metals: 5500, fiat: 2500, crypto: 2000 } },
  ];

  for (const { name, symbol, strategy, ratio } of strategies) {
    deployedContracts[symbol] = await deployZiGTToken(
      name,
      symbol,
      strategy,
      ratio,
      deployedContracts.GovernanceToken,
      deployedContracts.BandFeedRegistry
    );
  }


  for (const { name, symbol, strategy, ratio } of strategies) {
    deployedContracts[symbol] = await deployZiGTToken(name, symbol, strategy, ratio, deployedContracts.GovernanceToken, deployedContracts.BandFeedRegistry);
  }

  // 2.2 Reparations Model
  deployedContracts.ReparationsModel = await deployContract(
    "ReparationsModel",
    [
      deployedContracts.ZiGTToken,
      deployedContracts.ZiGTToken,
      deployedContracts.RedistributionVault,
      deployedContracts.AccessVerifier,
      deployedContracts.ReparationsDAO,
      deployedContracts.OracleHub
    ],
    true
  );

  // ======================
  // Phase 3: Governance
  // ======================
  console.log("\n🏛️ Phase 3: Deploying Governance...");
  deployedContracts.ZiGGovernance = await deployContract(
    "ZiGGovernance",
    [
      process.env.ROUTER_ADDRESS,
      "ZiG Governance",
      "ZGTGOV",
      "1.0"
    ],
    false
  );

  // ======================
  // Phase 4: Ecosystem Tokens
  // ======================
  console.log("\n💎 Phase 4: Deploying Ecosystem Tokens...");

  deployedContracts.ZiGUtilityToken = await deployContract(
    "ZiGUtilityToken",
    [TOKEN_SUPPLIES.UTILITY, deployer.address],
    false
  );

  deployedContracts.ZiGMemeToken = await deployContract(
    "ZiGMemeToken",
    [TOKEN_SUPPLIES.MEME],
    false
  );

  deployedContracts.ZiGNFT = await deployContract(
    "ZiGNFT",
    [deployer.address],
    false
  );

  deployedContracts.ZiGSoulboundToken = await deployContract(
    "ZiGSoulboundToken",
    [deployer.address],
    false
  );

  deployedContracts.ZiGGameFiToken = await deployContract(
    "ZiGGameFiToken",
    [TOKEN_SUPPLIES.GAMEFI],
    false
  );

  deployedContracts.ZiGRWAToken = await deployContract(
    "ZiGRWAToken",
    [TOKEN_SUPPLIES.RWA],
    false
  );

  deployedContracts.SoulReparationNFT = await deployContract(
    "SoulReparationNFT",
    [deployer.address],
    false
  );

  // ======================
  // Phase 5: Initialization
  // ======================
  console.log("\n⚙️ Phase 5: Initializing Contracts...");

  // 5.1 DAO Setup
  const dao = await ethers.getContractAt("ReparationsDAO", deployedContracts.ReparationsDAO);
  await dao.setTimelock(deployer.address);
  await dao.setAuthorized(deployer.address, true);

  // 5.2 Access Verifier
  const verifier = await ethers.getContractAt("AccessVerifier", deployedContracts.AccessVerifier);
  await verifier.setAfrican(deployer.address, true);
  await verifier.setDiaspora(deployer.address, true);

  // 5.3 Governance Tokens
  const govToken = await ethers.getContractAt("ZiGGovernanceToken", deployedContracts.GovernanceToken);
  await govToken.mint(deployer.address, DEPLOYMENT_PARAMS.GOVERNANCE_MINT_AMOUNT);

  console.log("✅ Initialization complete");

  // ======================
  // Save Deployment
  // ======================
  saveDeploymentInfo(deployedContracts, deployer.address);
  displayDeploymentSummary(deployedContracts);
}

// ======================
// Helper Functions
// ======================
async function deployContract(contractName, args = [], isUpgradeable = false) {
  console.log(`\n📦 Deploying ${contractName}...`);
  const Factory = await ethers.getContractFactory(contractName);
  
  let contract;
  if (isUpgradeable) {
    contract = await upgrades.deployProxy(Factory, args, { 
      kind: 'uups',
      timeout: 120000
    });
  } else {
    contract = await Factory.deploy(...args);
  }
  
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`✅ ${contractName} deployed to: ${address}`);
  
  if (network.name !== 'hardhat' && network.name !== 'localhost') {
    await verifyWithRetry(address, contractName, args, isUpgradeable);
  }
  
  return address;
}

async function verifyWithRetry(address, contractName, args, isUpgradeable, retries = 3) {
  if (network.name === 'hardhat') return;
  
  try {
    console.log(`🔍 Verifying ${contractName}...`);
    
    if (isUpgradeable) {
      const impl = await upgrades.erc1967.getImplementationAddress(address);
      await hre.run("verify:verify", { address: impl });
    } else {
      await hre.run("verify:verify", { address, constructorArguments: args });
    }
    
    console.log(`✅ Verified ${contractName}`);
  } catch (error) {
    if (retries > 0) {
      console.log(`⚠️ Retrying verification (${retries} left)...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      await verifyWithRetry(address, contractName, args, isUpgradeable, retries - 1);
    } else {
      console.warn(`❌ Failed to verify ${contractName}:`, error.message);
    }
  }
}

async function deployZiGTToken(name, symbol, strategy, ratio, governance, bandfeeder) {
  console.log(`\n📦 Deploying ZiGT Token: ${name} (${symbol})...`);

  const Factory = await ethers.getContractFactory("ZiGT");

  const initializerArgs = [
    process.env.ROUTER_ADDRESS,
    bandfeeder,
    governance,
    strategy,
    ratio
  ];

  const initializerSignature = "initialize(address,address,address,uint8,(uint256,uint256,uint256))";

  const zigt = await upgrades.deployProxy(Factory, initializerArgs, {
    kind: 'uups',
    timeout: 120000,
    initializer: initializerSignature 
  });

  await zigt.waitForDeployment();
  const address = await zigt.getAddress();
  console.log(`✅ ${symbol} deployed to: ${address}`);

  console.log(`🔁 Initializing price cache for ${symbol}...`);
  const token = await ethers.getContractAt("ZiGT", address);
  const assetKeys = [
    "BTCUSD", "ETHUSD", "BNBUSD", "XAUUSD", "USDZAR", "USDXOF", "USDNGN",
    "USDEGP", "USDRUB", "USDTRY", "USDINR", "AUDUSD", "EURUSD", "GBPUSD",
    "USDCHF", "USDJPY", "NZDUSD", "CNYUSD", "CADUSD", "USDUSD"
  ].map(k => ethers.keccak256(ethers.toUtf8Bytes(k)));
  
  await token.updateCachedPrices(assetKeys);  

  if (network.name !== 'hardhat' && network.name !== 'localhost') {
    await verifyWithRetry(address, name, initializerArgs, true);
  }
  return address;
}

function saveDeploymentInfo(contracts, deployer) {
  const deploymentInfo = {
    network: network.name,
    chainId: process.env.CHAIN_ID,
    deployer: deployer,
    timestamp: new Date().toISOString(),
    contracts: contracts
  };

  fs.mkdirSync("deployments", { recursive: true });
  const filename = `deployments/zigt_${network.name}_${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info saved to ${filename}`);
}

function displayDeploymentSummary(contracts) {
  console.log("\n🎉 ===== Deployment Summary =====");
  console.log(`🌐 Network: ${network.name}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log("\n📜 Contract Addresses:");
  
  for (const [name, address] of Object.entries(contracts)) {
    console.log(`- ${name.padEnd(25)}: ${address}`);
  }
  
  console.log("\n✅ Deployment completed successfully!");
}

// Execute
main().catch((error) => {
  console.error("\n❌ Deployment failed:", error);
  process.exit(1);
});