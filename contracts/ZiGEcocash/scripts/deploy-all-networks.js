const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// List of networks to deploy to (excluding polygon_zkevm which is already deployed)
const networks = [
  "base",
  "celo", 
  "skale",
  "zero",
  "sophon",
  "vite",
  "oasis",
  "iota_evm"
];

async function deployToNetwork(networkName) {
  console.log(`\n🚀 Deploying to ${networkName.toUpperCase()}...`);
  console.log("=" .repeat(50));
  
  try {
    // Set the network environment variable
    process.env.HARDHAT_NETWORK = networkName;
    
    // Get the deployer account for this network
    const deployer = new ethers.Wallet(process.env.PRIVATE_KEY);
    console.log("Deployer account:", deployer.address);
    
    // Check balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
    
    // Log current gas price
    try {
      const gasPrice = await ethers.provider.getGasPrice();
      console.log("Current gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
    } catch (err) {
      console.log("Could not fetch gas price:", err.message);
    }
    
    if (balance < ethers.parseEther("0.01")) {
      console.log("⚠️  Warning: Low balance. Deployment may fail.");
    }

    // Run the deployment script
    console.log("📦 Deploying contracts...");
    const { execSync } = require('child_process');
    execSync(`npx hardhat run scripts/deploy-circular.js --network ${networkName}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log("✅ Deployment completed for", networkName);
    return true;
    
  } catch (error) {
    console.error(`❌ Deployment failed for ${networkName}:`, error.message);
    return false;
  }
}

async function setupNetwork(networkName) {
  console.log(`\n🔗 Setting up ${networkName.toUpperCase()}...`);
  console.log("-".repeat(40));
  
  try {
    // Set the network environment variable
    process.env.HARDHAT_NETWORK = networkName;
    
    // Run the setup script
    const { execSync } = require('child_process');
    execSync(`npx hardhat run scripts/setup-contract-relationships.js --network ${networkName}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log("✅ Setup completed for", networkName);
    return true;
    
  } catch (error) {
    console.error(`❌ Setup failed for ${networkName}:`, error.message);
    return false;
  }
}

async function checkConfiguration(networkName) {
  console.log(`\n🔍 Checking ${networkName.toUpperCase()} configuration...`);
  console.log("-".repeat(40));
  
  try {
    // Set the network environment variable
    process.env.HARDHAT_NETWORK = networkName;
    
    // Run the configuration check
    const { execSync } = require('child_process');
    execSync(`npx hardhat run scripts/check-contract-configuration.js --network ${networkName}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log("✅ Configuration check completed for", networkName);
    return true;
    
  } catch (error) {
    console.error(`❌ Configuration check failed for ${networkName}:`, error.message);
    return false;
  }
}

async function testUserOnboarding(networkName) {
  console.log(`\n🧪 Testing ${networkName.toUpperCase()} user onboarding...`);
  console.log("-".repeat(40));
  
  try {
    // Set the network environment variable
    process.env.HARDHAT_NETWORK = networkName;
    
    // Run the user onboarding test
    const { execSync } = require('child_process');
    execSync(`npx hardhat run scripts/user-onboarding.js --network ${networkName}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log("✅ User onboarding test completed for", networkName);
    return true;
    
  } catch (error) {
    console.error(`❌ User onboarding test failed for ${networkName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log("🚀 ZiG Ecosystem Multi-Network Deployment");
  console.log("=" .repeat(60));
  console.log("Networks to deploy:", networks.join(", "));
  
  const results = {
    deployments: {},
    setups: {},
    configurations: {},
    onboarding: {}
  };

  // Step 1: Deploy to all networks
  console.log("\n📦 STEP 1: Deploying to all networks...");
  for (const network of networks) {
    results.deployments[network] = await deployToNetwork(network);
  }

  // Step 2: Update oracle prices (once for all networks)
  console.log("\n🔮 STEP 2: Updating oracle prices...");
  try {
    const { execSync } = require('child_process');
    execSync('python3 update_oracle.py', { stdio: 'inherit', cwd: process.cwd() });
    console.log("✅ Oracle prices updated for all networks");
  } catch (error) {
    console.error("❌ Oracle price update failed:", error.message);
  }

  // Step 3: Setup contract relationships
  console.log("\n🔗 STEP 3: Setting up contract relationships...");
  for (const network of networks) {
    if (results.deployments[network]) {
      results.setups[network] = await setupNetwork(network);
    }
  }

  // Step 4: Check configurations
  console.log("\n🔍 STEP 4: Checking configurations...");
  for (const network of networks) {
    if (results.deployments[network] && results.setups[network]) {
      results.configurations[network] = await checkConfiguration(network);
    }
  }

  // Step 5: Test user onboarding
  console.log("\n🧪 STEP 5: Testing user onboarding...");
  for (const network of networks) {
    if (results.deployments[network] && results.setups[network] && results.configurations[network]) {
      results.onboarding[network] = await testUserOnboarding(network);
    }
  }

  // Final summary
  console.log("\n🎉 Multi-Network Deployment Summary");
  console.log("=" .repeat(60));
  
  for (const network of networks) {
    console.log(`\n${network.toUpperCase()}:`);
    console.log(`  📦 Deployment: ${results.deployments[network] ? '✅' : '❌'}`);
    console.log(`  🔗 Setup: ${results.setups[network] ? '✅' : '❌'}`);
    console.log(`  🔍 Configuration: ${results.configurations[network] ? '✅' : '❌'}`);
    console.log(`  🧪 Onboarding: ${results.onboarding[network] ? '✅' : '❌'}`);
    
    if (results.deployments[network] && results.setups[network] && results.configurations[network] && results.onboarding[network]) {
      console.log(`  🎯 Status: FULLY OPERATIONAL ✅`);
    } else {
      console.log(`  ⚠️  Status: PARTIAL / NEEDS ATTENTION`);
    }
  }

  // Save results to file
  const resultsPath = path.join(__dirname, "../deployment-results.json");
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results saved to: deployment-results.json`);
  
  console.log("\n🚀 Multi-network deployment process completed!");
  console.log("Check individual network files for contract addresses.");
}

main().catch((error) => {
  console.error("❌ Multi-network deployment failed:", error);
  process.exit(1);
}); 