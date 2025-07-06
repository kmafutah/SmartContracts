// scripts/initAll.js
const hre = require("hardhat");
const { ethers } = hre;
const { parseUnits, ZeroAddress } = require("ethers");
const fs = require("fs");
const path = require("path");


async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Initializing with deployer:", deployer.address);

  const deployment = JSON.parse(fs.readFileSync("deployments/zigt_polygon_zkevm_1750310958346.json"));
  const addresses = {
    zigt: deployment.contracts.MainZiGT,
    vault: deployment.contracts.RedistributionVault,
    accessVerifier: deployment.contracts.AccessVerifier,
    reparationsDAO: deployment.contracts.ReparationsDAO,
    feedRegistry: deployment.contracts.FeedRegistry,
    bandFeedRegistry: deployment.contracts.BandFeedRegistry,
    oracleHub: deployment.contracts.OracleHub,
    reparationsModel: deployment.contracts.ReparationsModel,
    zigtToken: deployment.contracts.ZiGTToken,
  };

  const ZiGT = await ethers.getContractAt("contracts/ZiGT_github/ZiGT.sol:ZiGT", addresses.zigt);
  const Vault = await ethers.getContractAt("contracts/ZiGT_github/RedistributionVault.sol:RedistributionVault", addresses.vault);
  const Verifier = await ethers.getContractAt("contracts/ZiGT_github/AccessVerifier.sol:AccessVerifier", addresses.accessVerifier);
  const Reparation = await ethers.getContractAt("contracts/ZiGT_github/ReparationsModel.sol:ReparationsModel", addresses.reparationsModel);

  const reserveModel = {
  metal: parseUnits("0.55", 18),
  fiat: parseUnits("0.25", 18),
  crypto: parseUnits("0.20", 18),
  };

  // --- FUNCTIONAL STATUS CHECK FOR ALL DEPLOYED CONTRACTS (DYNAMIC ABI) ---
  console.log("\n--- FUNCTIONAL STATUS CHECK FOR ALL DEPLOYED CONTRACTS (DYNAMIC ABI) ---");
  // Asset keys used in the ZiGT ecosystem
  const assetKeys = [
    "XAUUSD", "XPTUSD", "XPDUSD", "XAGUSD", // metals
    "BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD", // crypto
    "EURUSD", "GBPUSD", "USDZAR", "USDJPY", "USDCHF", "USDCNH", // forex
    "NGNUSD", "EGPUSD", "RUBUSD", "TRYUSD", "INRUSD" // others
  ];
  for (const [name, address] of Object.entries(deployment.contracts)) {
    if (!address || address === ethers.ZeroAddress) {
      console.warn(`${name} at ${address}: Invalid or missing address`);
      continue;
    }
    try {
      const artifactFile = findArtifact(name);
      if (!artifactFile) {
        console.warn(`${name} at ${address}: No artifact found`);
        continue;
      }
      const artifact = JSON.parse(fs.readFileSync(artifactFile));
      const abi = artifact.abi;
      const statusFn = findStatusFunction(abi);
      const contract = new ethers.Contract(address, abi, deployer);
      if (statusFn) {
        if (statusFn.name === "getPrice" && statusFn.argType) {
          for (const assetKey of assetKeys) {
            try {
              let result;
              if (statusFn.argType === "bytes32") {
                result = await contract.getPrice(ethers.encodeBytes32String(assetKey));
              } else if (statusFn.argType === "string") {
                result = await contract.getPrice(assetKey);
              } else {
                result = await contract.getPrice();
              }
              console.log(`${name} at ${address}: getPrice(${assetKey}) OK, result:`, result.toString());
            } catch (err) {
              console.warn(`${name} at ${address}: getPrice(${assetKey}) ERROR - ${err.message}`);
            }
          }
        } else if (statusFn.argType === "string") {
          // Other string-arg status functions
          for (const assetKey of assetKeys) {
            try {
              const result = await contract[statusFn.name](assetKey);
              console.log(`${name} at ${address}: ${statusFn.name}(${assetKey}) OK, result:`, result.toString());
            } catch (err) {
              console.warn(`${name} at ${address}: ${statusFn.name}(${assetKey}) ERROR - ${err.message}`);
            }
          }
        } else {
          // No-arg status/price functions
          try {
            const result = await contract[statusFn.name]();
            console.log(`${name} at ${address}: ${statusFn.name}() OK, result:`, result.toString());
          } catch (err) {
            console.warn(`${name} at ${address}: ${statusFn.name}() ERROR - ${err.message}`);
          }
        }
      } else {
        // fallback: just check code at address
        const code = await ethers.provider.getCode(address);
        if (code && code !== '0x') {
          console.log(`${name} at ${address}: Contract code exists (no status fn)`);
        } else {
          console.warn(`${name} at ${address}: No contract code found!`);
        }
      }
    } catch (err) {
      console.warn(`${name} at ${address}: ERROR - ${err.message}`);
    }
  }

  // --- Check if already initialized ---
  try {
    const currentGovernance = await ZiGT.governance();
    const currentTreasury = await ZiGT.treasury();
    const currentBandFeedRegistry = await ZiGT.bandFeedRegistry();
    console.log("Current governance:", currentGovernance);
    console.log("Current treasury:", currentTreasury);
    console.log("Current bandFeedRegistry:", currentBandFeedRegistry);
  } catch (err) {
    console.warn("Could not fetch ZiGT initialization status:", err.message);
  }

  // --- 1. Initialize ZiGT ---
  console.log("Initializing ZiGT...");
  try {
    await ZiGT.initialize(
      ZeroAddress,                      // Fee Router
      addresses.bandFeedRegistry,       // Band Feed Registry
      addresses.reparationsDAO,         // Governance
      deployer.address,                 // Treasury
      3,                                // selectedDirection (e.g., Afro-centric Trust)
      reserveModel                      // Ratio
    );
    console.log("ZiGT initialized.");
  } catch (err) {
    if (err && err.error && err.error.message) {
      console.error("Initialization reverted:", err.error.message);
    } else if (err && err.data && err.data.message) {
      console.error("Initialization reverted:", err.data.message);
    } else {
      console.error("Initialization reverted:", err);
    }
    throw err;
  }

  // --- 2. Initialize RedistributionVault ---
  console.log("Initializing RedistributionVault...");
  await Vault.initialize(
    addresses.zigtToken,
    deployer.address, // panAfricanTreasury
    deployer.address, // diasporaDevelopmentPool
    deployer.address, // historicalRestitutionFund
    2500              // 25% minimum redistribution share
  );
  console.log("Vault initialized.");

  // --- 3. Initialize AccessVerifier ---
  console.log("Initializing AccessVerifier...");
  await Verifier.initialize();
  console.log("AccessVerifier initialized.");

  // --- 4. Initialize ReparationsModel ---
  console.log("Initializing ReparationsModel...");
  await Reparation.initialize(
    addresses.zigtToken,
    addresses.zigtToken,
    addresses.vault,
    addresses.accessVerifier,
    addresses.reparationsDAO,
    addresses.oracleHub
  );
  console.log("ReparationsModel initialized.");

  // --- Check and initialize XAUUSD oracle if missing ---
  const oracleHub = await ethers.getContractAt("contracts/ZiGT_github/ZiGOracleHub.sol:ZiGOracleHub", addresses.oracleHub);
  let xauOracle;
  try {
    xauOracle = await oracleHub.getOracle("XAUUSD");
  } catch (e) {
    xauOracle = ZeroAddress;
  }
  if (!xauOracle || xauOracle === ZeroAddress) {
    console.log("XAUUSD oracle not configured. Please deploy and configure the XAUUSD oracle before initializing price caches.");
  } else {
    // Example: initialize price cache for all tokens that need it
    const tokensToInit = [addresses.zigt, /* add other token addresses as needed */];
    for (const tokenAddr of tokensToInit) {
      try {
        const token = await ethers.getContractAt("contracts/ZiGT_github/ZiGT.sol:ZiGT", tokenAddr);
        // Replace with actual cache init function if different
        await token.updateCachedPrices([ethers.encodeBytes32String("XAUUSD")]);
        console.log(`Initialized price cache for token at ${tokenAddr}`);
      } catch (err) {
        console.warn(`Failed to initialize price cache for token at ${tokenAddr}:`, err.message);
      }
    }
  }

  // --- STATUS CHECK FOR ALL DEPLOYED CONTRACTS ---
  console.log("\n--- STATUS CHECK FOR ALL DEPLOYED CONTRACTS ---");
  const contractChecks = [
    { name: "MainZiGT", address: deployment.contracts.MainZiGT },
    { name: "RedistributionVault", address: deployment.contracts.RedistributionVault },
    { name: "AccessVerifier", address: deployment.contracts.AccessVerifier },
    { name: "ReparationsDAO", address: deployment.contracts.ReparationsDAO },
    { name: "FeedRegistry", address: deployment.contracts.FeedRegistry },
    { name: "BandFeedRegistry", address: deployment.contracts.BandFeedRegistry },
    { name: "OracleHub", address: deployment.contracts.OracleHub },
    { name: "ReparationsModel", address: deployment.contracts.ReparationsModel },
    { name: "ZiGTToken", address: deployment.contracts.ZiGTToken },
    // Add more contracts as needed
  ];
  for (const { name, address } of contractChecks) {
    if (!address) {
      console.log(`${name}: No address found in deployment file.`);
      continue;
    }
    if (address && address !== ethers.ZeroAddress) {
      console.log(`${name} at ${address}: Address exists (deployed)`);
    } else {
      console.warn(`${name} at ${address}: Invalid address`);
    }
  }

  // --- TEST calculateZiGPrice() ON ORACLE HUB IF AVAILABLE ---
  try {
    const oracleHubAddress = addresses.oracleHub;
    if (oracleHubAddress && oracleHubAddress !== ethers.ZeroAddress) {
      const artifactFile = findArtifact('OracleHub');
      if (artifactFile) {
        const artifact = JSON.parse(fs.readFileSync(artifactFile));
        const abi = artifact.abi;
        const hasCalculateZiGPrice = abi.some(e => e.type === 'function' && e.name === 'calculateZiGPrice');
        if (hasCalculateZiGPrice) {
          const oracleHub = new ethers.Contract(oracleHubAddress, abi, deployer);
          try {
            const result = await oracleHub.calculateZiGPrice();
            console.log(`OracleHub at ${oracleHubAddress}: calculateZiGPrice() OK, result:`, result.toString());
          } catch (err) {
            console.warn(`OracleHub at ${oracleHubAddress}: calculateZiGPrice() ERROR - ${err.message}`);
          }
        } else {
          console.log(`OracleHub at ${oracleHubAddress}: calculateZiGPrice() not found in ABI.`);
        }
      } else {
        console.log(`OracleHub at ${oracleHubAddress}: No artifact found.`);
      }
    }
  } catch (err) {
    console.warn(`Error testing calculateZiGPrice on OracleHub: ${err.message}`);
  }
}

// Helper: Find artifact file for a contract name (improved fuzzy match)
function findArtifact(contractName) {
  const artifactDir = path.join(__dirname, "../artifacts/contracts");
  const walk = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(walk(filePath));
      } else if (file.endsWith(".json")) {
        results.push(filePath);
      }
    });
    return results;
  };
  const all = walk(artifactDir);
  // Try exact match (case-insensitive)
  for (const f of all) {
    if (path.basename(f).toLowerCase() === contractName.toLowerCase() + ".json") return f;
  }
  // Try partial match (case-insensitive, ignoring dashes/underscores)
  const norm = (s) => s.replace(/[-_]/g, '').toLowerCase();
  for (const f of all) {
    if (norm(path.basename(f, ".json")).includes(norm(contractName))) return f;
  }
  // Try mapping common deployment names to artifact names
  const mapping = {
    'MainZiGT': 'ZiGT',
    'SubZiGT': 'ZiGT',
    'ZiGTToken': 'ZiGTToken',
    'FeedRegistry': 'FeedRegistry',
    'BandFeedRegistry': 'BandFeedRegistry',
    'OracleHub': 'ZiGOracleHub',
    'MultiOracle': 'MultiOracle',
    'RedistributionVault': 'RedistributionVault',
    'AccessVerifier': 'AccessVerifier',
    'ReparationsDAO': 'ReparationsDAO',
    'ReparationsModel': 'ReparationsModel',
    // Map all ZiG-* tokens to ZiGT
  };
  if (contractName.startsWith('ZiG-')) {
    for (const f of all) {
      if (path.basename(f, ".json").toLowerCase() === 'ZiGT'.toLowerCase()) return f;
    }
  }
  if (mapping[contractName]) {
    for (const f of all) {
      if (path.basename(f, ".json").toLowerCase() === mapping[contractName].toLowerCase()) return f;
    }
  }
  // Fallback: first artifact
  return all[0];
}

// Helper: Find callable price/status function in ABI (improved)
function findStatusFunction(abi) {
  // Try to find getPrice(bytes32) or getPrice(string)
  for (const entry of abi) {
    if (entry.type === "function" && entry.name === "getPrice") {
      if (entry.inputs && entry.inputs.length === 1 && (entry.inputs[0].type === "bytes32" || entry.inputs[0].type === "string")) {
        return { name: entry.name, argType: entry.inputs[0].type };
      }
    }
  }
  // Try other common price/status functions
  const candidates = [
    { name: "getCurrentRate", argType: "string" },
    { name: "getRateForString", argType: "string" },
    { name: "latestAnswer", argType: null },
    { name: "price", argType: null },
    { name: "totalSupply", argType: null },
    { name: "getAllPrices", argType: null }
  ];
  for (const cand of candidates) {
    const entry = abi.find((x) => x.type === "function" && x.name === cand.name);
    if (entry) return cand;
  }
  return null;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
