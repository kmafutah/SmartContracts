const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Network configurations
const NETWORKS = {
  skale: {
    name: "SKALE",
    description: "Zero gas fees, high throughput",
    command: "npx hardhat run scripts/deploy-full.js --network skale"
  },
  iota: {
    name: "IOTA EVM", 
    description: "Zero gas fees, feeless transactions",
    command: "npx hardhat run scripts/deploy-full.js --network iota"
  },
  polygon_zkevm: {
    name: "Polygon zkEVM",
    description: "Very low gas, ZK rollup", 
    command: "npx hardhat run scripts/deploy-full.js --network polygon_zkevm"
  },
  base: {
    name: "Base",
    description: "Low gas, Coinbase L2",
    command: "npx hardhat run scripts/deploy-full.js --network base"
  },
  arbitrum: {
    name: "Arbitrum One",
    description: "Low gas, optimistic rollup",
    command: "npx hardhat run scripts/deploy-full.js --network arbitrum"
  },
  optimism: {
    name: "Optimism",
    description: "Low gas, optimistic rollup", 
    command: "npx hardhat run scripts/deploy-full.js --network optimism"
  },
  mantle: {
    name: "Mantle",
    description: "Low gas, modular L2",
    command: "npx hardhat run scripts/deploy-full.js --network mantle"
  },
  scroll: {
    name: "Scroll",
    description: "Low gas, ZK rollup",
    command: "npx hardhat run scripts/deploy-full.js --network scroll"
  },
  linea: {
    name: "Linea",
    description: "Low gas, ZK rollup",
    command: "npx hardhat run scripts/deploy-full.js --network linea"
  },
  polygon: {
    name: "Polygon",
    description: "Low gas, sidechain",
    command: "npx hardhat run scripts/deploy-full.js --network polygon"
  }
};

async function checkEnvironment() {
  console.log("🔍 Checking deployment environment...");
  
  // Check if .env file exists
  const envPath = path.join(__dirname, "../.env");
  if (!fs.existsSync(envPath)) {
    console.log("⚠️  .env file not found. Creating template...");
    const envTemplate = `# Private key for deployment (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Optional: API keys for block explorers
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key
OPTIMISTIC_ETHERSCAN_API_KEY=your_optimistic_etherscan_api_key
BASESCAN_API_KEY=your_basescan_api_key
`;
    fs.writeFileSync(envPath, envTemplate);
    console.log("✅ Created .env template. Please add your private key!");
    return false;
  }
  
  // Check if private key is set
  require("dotenv").config();
  if (!process.env.PRIVATE_KEY) {
    console.log("❌ PRIVATE_KEY not found in .env file");
    console.log("Please add your private key to the .env file");
    return false;
  }
  
  console.log("✅ Environment check passed");
  return true;
}

async function showNetworkOptions() {
  console.log("\n🌐 Available Networks for Deployment:");
  console.log("=====================================");
  
  Object.entries(NETWORKS).forEach(([key, network], index) => {
    console.log(`${index + 1}. ${network.name} - ${network.description}`);
  });
  
  console.log("\n💡 Zero-Gas Networks (Recommended):");
  console.log("   • SKALE - Completely free transactions");
  console.log("   • IOTA EVM - Feeless transactions");
  
  console.log("\n💡 Low-Cost Networks:");
  console.log("   • Polygon zkEVM - Very low gas");
  console.log("   • Base, Arbitrum, Optimism - Popular L2s");
}

async function deployToNetwork(networkKey) {
  const network = NETWORKS[networkKey];
  if (!network) {
    console.log("❌ Invalid network selected");
    return;
  }
  
  console.log(`\n🚀 Deploying to ${network.name}...`);
  console.log(`📝 Description: ${network.description}`);
  
  try {
    // Check if we can connect to the network
    const [deployer] = await ethers.getSigners();
    if (!deployer) {
      throw new Error("No deployer account found. Check your PRIVATE_KEY");
    }
    
    console.log(`👤 Deployer: ${deployer.address}`);
    const balance = await deployer.getBalance();
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance.isZero()) {
      console.log("⚠️  Warning: Deployer has zero balance!");
      console.log("   For zero-gas networks (SKALE, IOTA), this is OK.");
      console.log("   For other networks, you need ETH for gas fees.");
    }
    
    // Run the deployment
    console.log("\n⏳ Starting deployment...");
    const { exec } = require("child_process");
    const { promisify } = require("util");
    const execAsync = promisify(exec);
    
    const result = await execAsync(network.command);
    console.log(result.stdout);
    
    console.log(`\n✅ Successfully deployed to ${network.name}!`);
    
  } catch (error) {
    console.error(`❌ Deployment to ${network.name} failed:`, error.message);
    if (error.message.includes("insufficient funds")) {
      console.log("💡 Tip: You need ETH for gas fees on this network");
    } else if (error.message.includes("network")) {
      console.log("💡 Tip: Check your internet connection and RPC endpoint");
    }
  }
}

async function main() {
  console.log("🌟 ZiGEcocash Multi-Network Deployment Tool");
  console.log("===========================================");
  
  // Check environment
  const envOk = await checkEnvironment();
  if (!envOk) {
    console.log("\n📋 Setup Instructions:");
    console.log("1. Add your private key to .env file");
    console.log("2. For zero-gas networks: No ETH needed");
    console.log("3. For other networks: Get some ETH for gas fees");
    console.log("4. Run this script again");
    return;
  }
  
  // Show network options
  await showNetworkOptions();
  
  // Get user input
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (query) => new Promise((resolve) => rl.question(query, resolve));
  
  try {
    const answer = await question("\n🎯 Select network to deploy to (1-10): ");
    const networkIndex = parseInt(answer) - 1;
    const networkKeys = Object.keys(NETWORKS);
    
    if (networkIndex >= 0 && networkIndex < networkKeys.length) {
      const selectedNetwork = networkKeys[networkIndex];
      await deployToNetwork(selectedNetwork);
    } else {
      console.log("❌ Invalid selection");
    }
  } catch (error) {
    console.log("❌ Error reading input:", error.message);
  } finally {
    rl.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 