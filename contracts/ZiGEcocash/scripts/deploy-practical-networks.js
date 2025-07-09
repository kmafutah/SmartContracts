const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Focus on networks that are more practical and accessible
const practicalNetworks = [
  "base",      // Coinbase L2 - well established
  "celo"       // Mobile-first - good adoption
];

async function deployToNetwork(networkName) {
  console.log(`\n🚀 Deploying to ${networkName.toUpperCase()}...`);
  console.log("=" .repeat(50));
  
  try {
    // Get the deployer account for this network
    const [deployer] = await ethers.getSigners();
    console.log("Deployer account:", deployer.address);
    
    // Check balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
    
    if (balance < ethers.parseEther("0.01")) {
      console.log("⚠️  Warning: Low balance. You need to fund this account first.");
      console.log(`💡 To fund ${networkName}:`);
      if (networkName === "base") {
        console.log("   - Bridge ETH from Ethereum mainnet to Base");
        console.log("   - Or use Base Bridge: https://bridge.base.org");
      } else if (networkName === "celo") {
        console.log("   - Buy CELO from exchanges");
        console.log("   - Or use Celo Bridge: https://bridge.celo.org");
      }
      return false;
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

async function main() {
  console.log("🚀 ZiG Ecosystem Practical Network Deployment");
  console.log("=" .repeat(60));
  console.log("Networks to deploy:", practicalNetworks.join(", "));
  console.log("\n💡 Note: You need to fund your deployer account on each network first!");
  
  const results = {
    deployments: {},
    setups: {},
    configurations: {}
  };

  // Step 1: Deploy to practical networks
  console.log("\n📦 STEP 1: Deploying to practical networks...");
  for (const network of practicalNetworks) {
    results.deployments[network] = await deployToNetwork(network);
  }

  // Step 2: Setup contract relationships for successful deployments
  console.log("\n🔗 STEP 2: Setting up contract relationships...");
  for (const network of practicalNetworks) {
    if (results.deployments[network]) {
      results.setups[network] = await setupNetwork(network);
    }
  }

  // Step 3: Check configurations for successful setups
  console.log("\n🔍 STEP 3: Checking configurations...");
  for (const network of practicalNetworks) {
    if (results.deployments[network] && results.setups[network]) {
      results.configurations[network] = await checkConfiguration(network);
    }
  }

  // Final summary
  console.log("\n🎉 Practical Network Deployment Summary");
  console.log("=" .repeat(60));
  
  for (const network of practicalNetworks) {
    console.log(`\n${network.toUpperCase()}:`);
    console.log(`  📦 Deployment: ${results.deployments[network] ? '✅' : '❌'}`);
    console.log(`  🔗 Setup: ${results.setups[network] ? '✅' : '❌'}`);
    console.log(`  🔍 Configuration: ${results.configurations[network] ? '✅' : '❌'}`);
    
    if (results.deployments[network] && results.setups[network] && results.configurations[network]) {
      console.log(`  🎯 Status: FULLY OPERATIONAL ✅`);
    } else if (!results.deployments[network]) {
      console.log(`  💰 Status: NEEDS FUNDING - Add ETH/CELO to deployer account`);
    } else {
      console.log(`  ⚠️  Status: PARTIAL / NEEDS ATTENTION`);
    }
  }

  // Save results to file
  const resultsPath = path.join(__dirname, "../practical-deployment-results.json");
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results saved to: practical-deployment-results.json`);
  
  console.log("\n📋 Next Steps:");
  console.log("1. Fund your deployer account on each network");
  console.log("2. Run this script again to complete deployment");
  console.log("3. Update oracle prices: python3 update_oracle.py");
  console.log("4. Test user onboarding on each network");
  
  console.log("\n🚀 Practical network deployment process completed!");
}

main().catch((error) => {
  console.error("❌ Practical network deployment failed:", error);
  process.exit(1);
}); 