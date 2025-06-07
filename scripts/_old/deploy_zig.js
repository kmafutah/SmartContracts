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

// SKALE-specific gas settings
const GAS_SETTINGS = {
  skale_testnet: {
    gasPrice: ethers.parseUnits('0.1', 'gwei'),
    gasLimit: 8000000
  },
  default: {
    gasPrice: ethers.parseUnits('1', 'gwei'),
    gasLimit: 6000000
  }
};

// ======================
// Main Deployment Script
// ======================
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`\n🚀 Deploying ZiG Ecosystem with account: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} ${network.name === 'skale_testnet' ? 'sFUEL' : 'ETH'}\n`);
  
  // Get network-specific gas settings
  const gasConfig = GAS_SETTINGS[network.name] || GAS_SETTINGS.default;

  // Deployment tracker
  const deployedContracts = {};

  // ======================
  // Deployment Functions
  // ======================
  
async function deployContract(contractName, args = [], isUpgradeable = false) {
  console.log(`\n📦 Deploying ${contractName}...`);
  
  try {
    const Factory = await ethers.getContractFactory(contractName);
    let contract;
    
    if (isUpgradeable) {
      contract = await upgrades.deployProxy(Factory, args, {
        kind: 'uups',
        timeout: 120000,
        gasPrice: ethers.parseUnits('0.1', 'gwei'),
        gasLimit: 8000000
      });
    } else {
      contract = await Factory.deploy(...args, {
        gasPrice: ethers.parseUnits('0.1', 'gwei'),
        gasLimit: 8000000
      });
    }
    
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    
    console.log(`✅ ${contractName} deployed to: ${address}`);
    
    // Verification
    if (network.name !== 'hardhat') {
      await verifyContract(address, args, isUpgradeable);
    }
    
    return { contract, address };
    
  } catch (error) {
    console.error(`❌ Failed to deploy ${contractName}:`, error);
    throw error;
  }
};

// async function deployZiGBondingCurve() {
//     const Factory = await ethers.getContractFactory("ZiGBondingCurve");
//     const contract = await upgrades.deployProxy(Factory, [], { 
//         kind: 'uups',
//         initializer: 'initialize'
//     });
//     await contract.waitForDeployment();
//     return contract;
// }
// async function deployZiGBondingCurve() {
//     console.log("\n📈 Deploying ZiGBondingCurve (upgradeable)...");
//     const Factory = await ethers.getContractFactory("ZiGBondingCurve");
//     const contract = await upgrades.deployProxy(Factory, [], {
//         kind: 'uups',
//         gasPrice: gasConfig.gasPrice,
//         gasLimit: gasConfig.gasLimit
//     });
//     await contract.waitForDeployment();
//     const address = await contract.getAddress();
//     console.log(`✅ ZiGBondingCurve deployed to: ${address}`);
//     return address;
// }
async function deployZiGBondingCurve() {
    const Factory = await ethers.getContractFactory("ZiGBondingCurve");
    const contract = await upgrades.deployProxy(Factory, [], {
        kind: 'uups',
        initializer: 'initialize',
        gasPrice: ethers.parseUnits('0.1', 'gwei'),
        gasLimit: 8000000
    });
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log(`ZiGBondingCurve deployed to: ${address}`);
    return address;
}

async function verifyContract(address, args, isUpgradeable) {
  try {
    console.log(`🔍 Verifying ${address}...`);
    if (isUpgradeable) {
      const implAddr = await upgrades.erc1967.getImplementationAddress(address);
      await hre.run("verify:verify", { address: implAddr });
    }
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: isUpgradeable ? [] : args,
    });
    console.log(`✅ Verified contract at ${address}`);
  } catch (verifyError) {
    console.warn(`⚠️ Verification failed:`, verifyError.message);
  }
}

// In your deployZiGTToken function:
async function deployZiGTToken(name, symbol, strategy, ratio) {
  console.log(`\n🪙 Deploying ${name} (${symbol})...`);
  
  try {
    console.log(`\n📦 Deploying ${name} (upgradeable)...`);
    const Factory = await ethers.getContractFactory("ZiGT");
    
    // Deploy as upgradeable proxy with empty constructor
    const contract = await upgrades.deployProxy(Factory, [], {
      kind: 'uups',
      timeout: 120000,
      gasPrice: gasConfig.gasPrice,
      gasLimit: gasConfig.gasLimit
    });
    
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log(`✅ ${name} deployed to: ${address}`);
    
    // Initialize the contract with required parameters
    console.log("⚡ Initializing contract...");
    await contract.initialize(
      process.env.ROUTER_ADDRESS,
      deployedContracts.BandFeedRegistry || process.env.BAND_FEED_REGISTRY,
      deployer.address,
      strategy,
      ratio
    );
    
    // Verify the contract
    if (network.name !== 'hardhat') {
      await verifyContract(address, [], true);
    }
    
    return address;
  } catch (error) {
    console.error(`❌ Failed to deploy ${name}:`, error);
    throw error;
  }
};

  // ======================
  // Deployment Execution
  // ======================
  
  try {
    // Core Infrastructure
    console.log("🔨 Deploying Core Infrastructure...");
    const { address: feedRegistry } = await deployContract("FeedRegistry");
    deployedContracts.FeedRegistry = feedRegistry;
    
    const { address: accessVerifier } = await deployContract("AccessVerifier", [], true);
    deployedContracts.AccessVerifier = accessVerifier;
    
    const { address: governanceToken } = await deployContract("ZiGGovernanceToken", [
      deployer.address,
      ethers.parseEther("1000000"),
      deployer.address
    ], true);
    deployedContracts.GovernanceToken = governanceToken;
    
    const { address: redistributionVault } = await deployContract("RedistributionVault", [
      governanceToken,
      deployer.address,
      deployer.address,
      deployer.address,
      2500
    ], true);
    deployedContracts.RedistributionVault = redistributionVault;


    // Deploy BandFeedRegistry if not already deployed
    console.log("\n📦 Deploying BandFeedRegistry (upgradeable)...");
    const { address: bandFeedRegistry } = await deployContract("BandFeedRegistry", [deployer.address], true);
    deployedContracts.BandFeedRegistry = bandFeedRegistry;
   
    deployedContracts.BondingCurve = await deployZiGBondingCurve();
    // Then deploy ZiGT token with the registry address
    deployedContracts.MainZiGT = await deployZiGTToken(
    "ZiG Reparations Token",
    "ZiG-R",
    STRATEGIC_DIRECTION.ReparationsModel,
    { metals: 6000, fiat: 3000, crypto: 1000 }
    );

    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      chainId: network.config.chainId,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: deployedContracts
    };

    fs.writeFileSync(
      `deployments/zigt_${network.name}_${Date.now()}.json`,
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n🎉 ===== Deployment Summary =====");
    console.log(`🌐 Network: ${network.name} (Chain ID: ${network.config.chainId})`);
    console.log(`👤 Deployer: ${deployer.address}\n`);
    
    console.log("📜 Contract Addresses:");
    for (const [name, address] of Object.entries(deployedContracts)) {
      console.log(`- ${name}: ${address}`);
    }
    
    console.log("\n✅ Deployment completed successfully!");
    console.log("📁 Deployment info saved to deployments/ folder");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
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