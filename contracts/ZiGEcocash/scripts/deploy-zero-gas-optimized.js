const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Zero-Gas Network Optimized Deployment");
  console.log("=======================================");
  
  const [deployer] = await ethers.getSigners();
  
  if (!deployer) {
    console.error("❌ No deployer account found. Please set PRIVATE_KEY in .env file");
    process.exit(1);
  }
  
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "zero-gas" : network.name;
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Network:", networkName);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const deploymentAddresses = {
    network: networkName,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  // Zero-gas network optimized settings
  const gasLimit = 8000000; // Conservative gas limit
  const gasPrice = ethers.parseUnits("100000", "wei");

  try {
    // Phase 1: Minimal Core Contracts (Zero-Gas Optimized)
    console.log("\n📊 Phase 1: Minimal Core Contracts");
    
    // ZiG (simplest possible deployment)
    console.log("Deploying ZiG (minimal)...");
    const ZiG = await ethers.getContractFactory("ZiG");
    const zig = await ZiG.deploy(ethers.parseUnits("1000", 18), {
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await zig.waitForDeployment();
    deploymentAddresses.ZiG = await zig.getAddress();
    console.log("✅ ZiG:", await zig.getAddress());

    // ZiGUtilityToken (no constructor args)
    console.log("Deploying ZiGUtilityToken...");
    const ZiGUtilityToken = await ethers.getContractFactory("ZiGUtilityToken");
    const utilityToken = await ZiGUtilityToken.deploy({
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await utilityToken.waitForDeployment();
    deploymentAddresses.ZiGUtilityToken = await utilityToken.getAddress();
    console.log("✅ ZiGUtilityToken:", await utilityToken.getAddress());

    // ZiGMemeToken (no constructor args)
    console.log("Deploying ZiGMemeToken...");
    const ZiGMemeToken = await ethers.getContractFactory("ZiGMemeToken");
    const memeToken = await ZiGMemeToken.deploy({
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await memeToken.waitForDeployment();
    deploymentAddresses.ZiGMemeToken = await memeToken.getAddress();
    console.log("✅ ZiGMemeToken:", await memeToken.getAddress());

    // ZiGNFT (no constructor args)
    console.log("Deploying ZiGNFT...");
    const ZiGNFT = await ethers.getContractFactory("ZiGNFT");
    const zigNFT = await ZiGNFT.deploy({
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await zigNFT.waitForDeployment();
    deploymentAddresses.ZiGNFT = await zigNFT.getAddress();
    console.log("✅ ZiGNFT:", await zigNFT.getAddress());

    // ZiGRWAToken (no constructor args)
    console.log("Deploying ZiGRWAToken...");
    const ZiGRWAToken = await ethers.getContractFactory("ZiGRWAToken");
    const rwaToken = await ZiGRWAToken.deploy({
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await rwaToken.waitForDeployment();
    deploymentAddresses.ZiGRWAToken = await rwaToken.getAddress();
    console.log("✅ ZiGRWAToken:", await rwaToken.getAddress());

    // ZiGGameFiToken (no constructor args)
    console.log("Deploying ZiGGameFiToken...");
    const ZiGGameFiToken = await ethers.getContractFactory("ZiGGameFiToken");
    const gameFiToken = await ZiGGameFiToken.deploy({
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await gameFiToken.waitForDeployment();
    deploymentAddresses.ZiGGameFiToken = await gameFiToken.getAddress();
    console.log("✅ ZiGGameFiToken:", await gameFiToken.getAddress());

    // ZiGBondingCurve (no constructor args)
    console.log("Deploying ZiGBondingCurve...");
    const ZiGBondingCurve = await ethers.getContractFactory("ZiGBondingCurve");
    const bondingCurve = await ZiGBondingCurve.deploy({
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await bondingCurve.waitForDeployment();
    deploymentAddresses.ZiGBondingCurve = await bondingCurve.getAddress();
    console.log("✅ ZiGBondingCurve:", await bondingCurve.getAddress());

    // Phase 2: Simple Identity Contracts
    console.log("\n🆔 Phase 2: Simple Identity Contracts");
    
    // ZiGSoulboundToken (no constructor args)
    console.log("Deploying ZiGSoulboundToken...");
    const ZiGSoulboundToken = await ethers.getContractFactory("ZiGSoulboundToken");
    const soulboundToken = await ZiGSoulboundToken.deploy({
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await soulboundToken.waitForDeployment();
    deploymentAddresses.ZiGSoulboundToken = await soulboundToken.getAddress();
    console.log("✅ ZiGSoulboundToken:", await soulboundToken.getAddress());

    // Save deployment addresses
    const deploymentPath = path.join(__dirname, `../deployment-addresses-${networkName}-optimized.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentAddresses, null, 2));
    
    console.log("\n🎉 Zero-gas optimized deployment completed!");
    console.log(`📄 Deployment addresses saved to: deployment-addresses-${networkName}-optimized.json`);
    
    // Print summary
    console.log("\n📋 Deployment Summary:");
    console.log("========================");
    console.log(`Network: ${networkName}`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Timestamp: ${deploymentAddresses.timestamp}`);
    console.log("------------------------");
    console.log("✅ Successfully deployed contracts:");
    Object.entries(deploymentAddresses).forEach(([key, value]) => {
      if (key !== 'network' && key !== 'deployer' && key !== 'timestamp') {
        console.log(`   ${key}: ${value}`);
      }
    });
    
    console.log("\n💡 Next Steps:");
    console.log("1. Test basic functionality with deployed contracts");
    console.log("2. Deploy complex contracts (Vault, OracleHub) in separate phases");
    console.log("3. Set up contract interactions and governance");
    console.log("4. Consider using proxy patterns for complex contracts");
    
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    
    if (error.message.includes("out of gas")) {
      console.log("\n💡 Gas optimization tips:");
      console.log("1. Try with even lower gas limit (4,000,000)");
      console.log("2. Deploy contracts one by one");
      console.log("3. Use proxy patterns for complex contracts");
    } else if (error.message.includes("execution reverted")) {
      console.log("\n💡 Execution issues:");
      console.log("1. Check constructor parameters");
      console.log("2. Verify contract dependencies");
      console.log("3. Try simpler contract versions");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
