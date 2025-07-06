const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying Core Contracts Only (SKALE Compatible)");
  console.log("==================================================");
  
  const [deployer] = await ethers.getSigners();
  
  console.log("Deployer address:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "skale" : network.name;
  
  const deploymentAddresses = {
    network: networkName,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  // Conservative settings for SKALE
  const gasLimit = 1500000;
  const gasPrice = ethers.parseUnits("100000", "wei");

  try {
    // Deploy only the most essential contracts
    console.log("\n📊 Deploying Essential Contracts Only");
    
    // 1. ZiG (most basic contract)
    console.log("\n1️⃣ Deploying ZiG...");
    const ZiG = await ethers.getContractFactory("ZiG");
    const zig = await ZiG.deploy(ethers.parseUnits("1", 18), {
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await zig.waitForDeployment();
    deploymentAddresses.ZiG = await zig.getAddress();
    console.log("✅ ZiG:", deploymentAddresses.ZiG);

    // 2. ZiGOracleHub
    console.log("\n2️⃣ Deploying ZiGOracleHub...");
    const ZiGOracleHub = await ethers.getContractFactory("ZiGOracleHub");
    const oracleHub = await ZiGOracleHub.deploy(deployer.address, {
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await oracleHub.waitForDeployment();
    deploymentAddresses.ZiGOracleHub = await oracleHub.getAddress();
    console.log("✅ ZiGOracleHub:", deploymentAddresses.ZiGOracleHub);

    // 3. ZiGUtilityToken (simple token)
    console.log("\n3️⃣ Deploying ZiGUtilityToken...");
    const ZiGUtilityToken = await ethers.getContractFactory("ZiGUtilityToken");
    const utilityToken = await ZiGUtilityToken.deploy({
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await utilityToken.waitForDeployment();
    deploymentAddresses.ZiGUtilityToken = await utilityToken.getAddress();
    console.log("✅ ZiGUtilityToken:", deploymentAddresses.ZiGUtilityToken);

    // Save deployment addresses
    const deploymentPath = path.join(__dirname, `../deployment-addresses-${networkName}-core.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentAddresses, null, 2));
    
    console.log("\n🎉 Core deployment completed!");
    console.log(`📄 Addresses saved to: deployment-addresses-${networkName}-core.json`);
    
    console.log("\n📋 Summary:");
    Object.entries(deploymentAddresses).forEach(([key, value]) => {
      if (key !== 'network' && key !== 'deployer' && key !== 'timestamp') {
        console.log(`${key}: ${value}`);
      }
    });

  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 