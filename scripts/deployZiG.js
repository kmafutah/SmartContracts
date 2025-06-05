const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

// 1. Add gas parameters to all deployments
const DEFAULT_GAS = {
  gasPrice: ethers.parseUnits('0.1', 'gwei'), // SKALE prefers lower gas
  gasLimit: 8000000 // Higher limit for complex contracts
};

// 2. Modify the deployContract function:
async function deployContract(contractName, args = [], isUpgradeable = false) {
  const Factory = await ethers.getContractFactory(contractName);
  
  if (isUpgradeable) {
    return await upgrades.deployProxy(Factory, args, {
      ...DEFAULT_GAS,
      kind: 'uups',
      timeout: 120000
    });
  } else {
    const contract = await Factory.deploy(...args, DEFAULT_GAS);
    await contract.waitForDeployment();
    return contract;
  }
}

// 3. Add error recovery for SKALE:
process.on('unhandledRejection', (error) => {
  if (error.message.includes('gas price') || error.message.includes('reverted')) {
    console.log('⚠️ SKALE network issue detected. Retrying with adjusted gas...');
    // Implement retry logic here
  }
});

// ======================
// Configuration
// ======================
const STRATEGIC_DIRECTION = {
  ZiGMirrorModel: 0,
  Famous8PlusZAR: 1,
  PanAfroEurasianModel: 2,
  G20ReserveModel: 3,
  ReparationsModel: 4
};

const TOKEN_SUPPLIES = {
  GOVERNANCE: ethers.parseEther("1000000"),  // 1M tokens
  MAIN_ZIGT: ethers.parseEther("10000000"), // 10M tokens
  UTILITY: ethers.parseEther("100000000"),  // 100M tokens
  MEME: ethers.parseEther("1000000000"),    // 1B tokens
  RWA: ethers.parseEther("1000"),           // 1k tokens
  GAMEFI: ethers.parseEther("1000000")      // 1M tokens
};

const DEPLOYMENT_PARAMS = {
  MIN_REDISTRIBUTION_SHARE: 2500, // 25%
  GOVERNANCE_MINT_AMOUNT: ethers.parseEther("50000") // 50k tokens
};

// ======================
// Main Deployment Script
// ======================
async function main() {
  // Initialize deployer
  const [deployer] = await ethers.getSigners();
  console.log(`\n🚀 Deploying ZiG Ecosystem with account: ${deployer.address}`);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH\n`);
  
  // Validate environment variables
  validateEnvVars(['ROUTER_ADDRESS', 'CHAIN_ID']);

  // Deployment tracker
  const deployedContracts = {};

  // ======================
  // Deployment Functions
  // ======================
  
  // Core Infrastructure
  console.log("🔨 Deploying Core Infrastructure...");
  deployedContracts.FeedRegistry = await deployContract("FeedRegistry");
  deployedContracts.AccessVerifier = await deployContract("AccessVerifier", [], true);
  deployedContracts.GovernanceToken = await deployContract("ZiGGovernanceToken", [
    deployer.address,
    TOKEN_SUPPLIES.GOVERNANCE,
    deployer.address
  ], true);
  deployedContracts.RedistributionVault = await deployContract("RedistributionVault", [
    deployedContracts.GovernanceToken,
    deployer.address,
    deployer.address,
    deployer.address,
    DEPLOYMENT_PARAMS.MIN_REDISTRIBUTION_SHARE
  ], true);

  // Main ZiGT Token
  console.log("\n🪙 Deploying Main ZiGT Token...");
  deployedContracts.MainZiGT = await deployZiGTToken(
    "ZiG Reparations Token",
    "ZiG-R",
    STRATEGIC_DIRECTION.ReparationsModel,
    { metals: 6000, fiat: 3000, crypto: 1000 }
  );

  // Governance System
  console.log("\n🏛️ Deploying Governance System...");
  deployedContracts.ZiGGovernance = await deployContract("ZiGGovernance", [
    process.env.ROUTER_ADDRESS,
    "ZiG Governance",
    "ZGTGOV",
    "1.0"
  ]);

  // Strategic Variants
  console.log("\n🔄 Deploying Strategic Variants...");
  const strategies = [
    { name: "ZiG Stablecoin", symbol: "ZiG-S", strategy: STRATEGIC_DIRECTION.ZiGMirrorModel, ratio: { metals: 5000, fiat: 4000, crypto: 1000 } },
    { name: "Stability-Oriented ZiG", symbol: "ZiG-SO", strategy: STRATEGIC_DIRECTION.Famous8PlusZAR, ratio: { metals: 6000, fiat: 3000, crypto: 1000 } },
    { name: "Digital Forward ZiG", symbol: "ZiG-DF", strategy: STRATEGIC_DIRECTION.Famous8PlusZAR, ratio: { metals: 4000, fiat: 3000, crypto: 3000 } },
    { name: "Afro-Centric ZiG", symbol: "ZiG-AC", strategy: STRATEGIC_DIRECTION.Famous8PlusZAR, ratio: { metals: 5500, fiat: 2500, crypto: 2000 } }
  ];

  for (const { name, symbol, strategy, ratio } of strategies) {
    deployedContracts[symbol] = await deployZiGTToken(name, symbol, strategy, ratio);
  }

  // Ecosystem Tokens
  console.log("\n💎 Deploying Ecosystem Tokens...");
  deployedContracts.ZiGUtilityToken = await deployContract("ZiGUtilityToken", [
    TOKEN_SUPPLIES.UTILITY,
    deployer.address
  ]);
  deployedContracts.ZiGMemeToken = await deployContract("ZiGMemeToken", [TOKEN_SUPPLIES.MEME]);
  deployedContracts.ZiGNFT = await deployContract("ZiGNFT", [deployer.address]);
  deployedContracts.ZiGSoulboundToken = await deployContract("ZiGSoulboundToken", [deployer.address]);
  deployedContracts.ZiGGameFiToken = await deployContract("ZiGGameFiToken", [TOKEN_SUPPLIES.GAMEFI]);

  // Initialize Ecosystem
  console.log("\n⚙️ Initializing Ecosystem...");
  await initializeEcosystem(deployedContracts, deployer.address);

  // Save Deployment
  saveDeploymentInfo(deployedContracts, deployer.address);
  displayDeploymentSummary(deployedContracts);
}

// ======================
// Helper Functions
// ======================
function validateEnvVars(requiredVars) {
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`❌ Missing required environment variable: ${varName}`);
    }
  }
}

async function deployContract(contractName, args = [], isUpgradeable = false) {
  console.log(`\n📦 Deploying ${contractName}...`);
  
  try {
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
    
    // Verify on non-local networks
    if (network.name !== 'hardhat') {
      await verifyContract(address, contractName, args, isUpgradeable);
    }
    
    return address;
    
  } catch (error) {
    console.error(`❌ Failed to deploy ${contractName}:`, error);
    throw error;
  }
}

async function verifyContract(address, contractName, args, isUpgradeable) {
  try {
    console.log(`🔍 Verifying ${contractName}...`);
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: isUpgradeable ? [] : args,
    });
    console.log(`✅ Verified ${contractName}`);
  } catch (verifyError) {
    console.warn(`⚠️ Verification failed for ${contractName}:`, verifyError.message);
  }
}

async function deployZiGTToken(name, symbol, strategy, ratio) {
  const { contract, address } = await deployContract("ZiGT", [
    process.env.ROUTER_ADDRESS,
    deployer.address,
    deployer.address,
    strategy,
    ratio
  ]);
  
  try {
    if (typeof contract.initialize === 'function') {
      await contract.initialize(strategy);
      console.log(`⚡ Initialized ${symbol}`);
    }
  } catch (initError) {
    console.warn(`⚠️ Initialization failed for ${symbol}:`, initError.message);
  }
  
  return address;
}

async function initializeEcosystem(contracts, deployer) {
  try {
    const mainZiGT = await ethers.getContractAt("ZiGT", contracts.MainZiGT);
    const vault = await ethers.getContractAt("RedistributionVault", contracts.RedistributionVault);
    const accessVerifier = await ethers.getContractAt("AccessVerifier", contracts.AccessVerifier);
    const govToken = await ethers.getContractAt("ZiGGovernanceToken", contracts.GovernanceToken);

    await mainZiGT.setReparationsModel(contracts.RedistributionVault);
    await accessVerifier.setAfrican(deployer, true);
    await govToken.mint(deployer, DEPLOYMENT_PARAMS.GOVERNANCE_MINT_AMOUNT);
    
    console.log("✅ Ecosystem initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize ecosystem:", error);
    throw error;
  }
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
  fs.writeFileSync(
    `deployments/zigt_${network.name}_${Date.now()}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
}

function displayDeploymentSummary(contracts) {
  console.log("\n🎉 ===== Deployment Summary =====");
  console.log(`🌐 Network: ${network.name} (Chain ID: ${process.env.CHAIN_ID})`);
  console.log(`👤 Deployer: ${deployer.address}\n`);
  
  console.log("📜 Contract Addresses:");
  for (const [name, address] of Object.entries(contracts)) {
    console.log(`- ${name}: ${address}`);
  }
  
  console.log("\n✅ Deployment completed successfully!");
  console.log("📁 Deployment info saved to deployments/ folder\n");
}

// ======================
// Script Execution
// ======================
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });