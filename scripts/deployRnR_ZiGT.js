const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

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
// Main Deployment Script
// ======================
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`\n🚀 Deploying with account: ${deployer.address}`);
  
  // Deployment tracker
  const deployedContracts = {};

  // ======================
  // Phase 1: Core Infrastructure
  // ======================
  console.log("\n🔨 Phase 1: Deploying Core Infrastructure...");
  
  // 1.1 Registries
  deployedContracts.FeedRegistry = await deployContract("FeedRegistry", [], false);
  deployedContracts.BandFeedRegistry = await deployContract("BandFeedRegistry", [deployer.address], true);
  
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
      deployedContracts.GovernanceToken, // tokenAddress
      deployer.address, // panAfricanTreasury
      deployer.address, // diasporaDevelopmentPool
      deployer.address, // historicalRestitutionFund
      DEPLOYMENT_PARAMS.MIN_REDISTRIBUTION_SHARE
    ],
    true
  );
  
  deployedContracts.AccessVerifier = await deployContract("AccessVerifier", [], true);
  deployedContracts.ReparationsDAO = await deployContract("ReparationsDAO", [], true);
  
  
  // 1.4 Oracles
  deployedContracts.OracleHub = await deployContract("ZiGOracleHub", [deployer.address], false);
  
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
  
// 2.2 Reparations Model
// For upgradeable version:
deployedContracts.ReparationsModel = await deployContract(
  "ReparationsModel",
  [], // NO constructor args for proxy
  true // isUpgradeable
);

// Then initialize with ALL parameters:
const reparationsModel = await ethers.getContractAt("ReparationsModel", deployedContracts.ReparationsModel);
await reparationsModel.initialize(
  deployedContracts.MainZiGT, // paymentToken
  deployedContracts.MainZiGT, // zigtToken
  deployedContracts.RedistributionVault, // vault
  deployedContracts.AccessVerifier, // verifier
  deployedContracts.ReparationsDAO, // dao
  deployedContracts.OracleHub // oracleRouter
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
  
  // 5.4 Oracle Setup
  const oracleHub = await ethers.getContractAt("ZiGOracleHub", deployedContracts.OracleHub);
  await oracleHub.setOracle("XAU", "0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6", 8, false, false);
  await oracleHub.setOracle("BTC", "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c", 8, false, false);
  
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
  
  // Verification (skip for local networks)
  if (network.name !== 'hardhat') {
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

// async function deployZiGTToken(name, symbol, strategy, ratio, governance, bandfeeder) {
//   console.log(`\n📦 Deploying ZiGT Token: ${name} (${symbol})...`);
  
//   const initializerArgs = [
//     process.env.ROUTER_ADDRESS,
//     bandfeeder,
//     governance,
//     strategy,
//     ratio
//   ];
  
//   const zigt = await deployContract("ZiGT", initializerArgs, true);
//   return zigt;
// }

async function deployZiGTToken(name, symbol, strategy, ratio, governance, bandfeeder) {
  console.log(`\n📦 Deploying ZiGT Token: ${name} (${symbol})...`);

  const Factory = await ethers.getContractFactory("ZiGT");

  // Define the arguments for the initialize function
  const initializerArgs = [
    process.env.ROUTER_ADDRESS,
    bandfeeder,
    governance, // This will be used as initialGovernance in ZiGCrossChain
    strategy,
    ratio
  ];

  // Define the initializer signature
  // Based on ZiGT.sol: initialize(address,address,address,StrategicDirection,ReserveRatio)
  // StrategicDirection (enum) is a uint8 in Solidity, and ReserveRatio (struct) is encoded as its members.
  // So the signature will look like: initialize(address,address,address,uint8,(uint256,uint256,uint256))
  const initializerSignature = "initialize(address,address,address,uint8,(uint256,uint256,uint256))";

  const zigt = await upgrades.deployProxy(Factory, initializerArgs, {
    kind: 'uups',
    timeout: 120000,
    initializer: initializerSignature 
  });

  await zigt.waitForDeployment();
  const address = await zigt.getAddress();

  console.log(`✅ ${symbol} deployed to: ${address}`);
  return zigt;
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