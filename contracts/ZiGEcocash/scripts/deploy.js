const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting ZiGEcocash deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Store deployment addresses
  const deploymentAddresses = {};

  try {
    // Phase 1: Core Economic Infrastructure
    console.log("\n📊 Phase 1: Deploying Core Economic Infrastructure");
    
    // Deploy ZiGOracleHub first
    console.log("Deploying ZiGOracleHub...");
    const ZiGOracleHub = await ethers.getContractFactory("ZiGOracleHub");
    const oracleHub = await ZiGOracleHub.deploy(deployer.address);
    await oracleHub.waitForDeployment();
    deploymentAddresses.ZiGOracleHub = await oracleHub.getAddress();
    console.log("✅ ZiGOracleHub deployed to:", deploymentAddresses.ZiGOracleHub);

    // Deploy ZiG (governance token)
    console.log("Deploying ZiG...");
    const ZiG = await ethers.getContractFactory("ZiG");
    const zig = await ZiG.deploy(0); // initialGoldBacking set to 0 for now
    await zig.waitForDeployment();
    deploymentAddresses.ZiG = await zig.getAddress();
    console.log("✅ ZiG deployed to:", deploymentAddresses.ZiG);

    // Deploy Vault first (needed by ZiGT)
    console.log("Deploying Vault...");
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(
      deploymentAddresses.ZiG, // zigToken
      deployer.address, // treasury (using deployer as placeholder)
      deployer.address, // futureReserve (using deployer as placeholder)
      deployer.address, // diasporaFund (using deployer as placeholder)
      deploymentAddresses.ZiG, // zigAddress
      ethers.ZeroAddress, // zigtAddress (placeholder, will be set later)
      deploymentAddresses.ZiGOracleHub, // oracleHubAddress
      ethers.ZeroAddress // paxgAddress (placeholder)
    );
    await vault.waitForDeployment();
    deploymentAddresses.Vault = await vault.getAddress();
    console.log("✅ Vault deployed to:", deploymentAddresses.Vault);

    // Deploy ZiGT with the actual vault address
    console.log("Deploying ZiGT...");
    const ZiGT = await ethers.getContractFactory("ZiGT");
    const zigT = await ZiGT.deploy(
      deploymentAddresses.ZiG, // zigToken
      deploymentAddresses.Vault // vaultAddress
    );
    await zigT.waitForDeployment();
    deploymentAddresses.ZiGT = await zigT.getAddress();
    console.log("✅ ZiGT deployed to:", deploymentAddresses.ZiGT);

    // Set the ZiGT address in Vault (if needed)
    console.log("Setting ZiGT address in Vault...");
    // Note: This would require a setZiGTAddress function in Vault
    // For now, we'll note this in the deployment addresses

    // Save deployment addresses
    const deploymentPath = path.join(__dirname, "../deployment-addresses.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentAddresses, null, 2));
    
    console.log("\n🎉 Initial deployment completed!");
    console.log("📄 Deployment addresses saved to: deployment-addresses.json");
    
    console.log("\n📋 Deployment Summary:");
    console.log("========================");
    Object.entries(deploymentAddresses).forEach(([contract, address]) => {
      console.log(`${contract}: ${address}`);
    });

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 