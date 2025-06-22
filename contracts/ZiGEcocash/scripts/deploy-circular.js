const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting Circular Dependency Deployment (ZiGT + Vault)...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Load existing deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses.json");
  let deploymentAddresses = {};
  
  if (fs.existsSync(deploymentPath)) {
    deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    console.log("📄 Loaded existing deployment addresses");
  }

  try {
    // Step 1: Deploy Vault with placeholder ZiGT address
    console.log("\n📊 Step 1: Deploying Vault with placeholder ZiGT address");
    
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(
      deploymentAddresses.ZiG || ethers.ZeroAddress, // zigToken
      deployer.address, // treasury
      deployer.address, // futureReserve
      deployer.address, // diasporaFund
      deploymentAddresses.ZiG || ethers.ZeroAddress, // zigAddress
      ethers.ZeroAddress, // placeholder zigtAddress
      deploymentAddresses.ZiGOracleHub || ethers.ZeroAddress, // oracleHubAddress
      deployer.address, // paxgAddress (using deployer as placeholder for local testing)
    );
    await vault.waitForDeployment();
    deploymentAddresses.Vault = await vault.getAddress();
    console.log("✅ Vault deployed to:", deploymentAddresses.Vault);

    // Step 2: Deploy ZiGT with real Vault address
    console.log("\n📊 Step 2: Deploying ZiGT with real Vault address");
    
    const ZiGT = await ethers.getContractFactory("ZiGT");
    const zigT = await ZiGT.deploy(
      deploymentAddresses.ZiG || ethers.ZeroAddress, // zigToken
      deploymentAddresses.Vault // real vault address
    );
    await zigT.waitForDeployment();
    deploymentAddresses.ZiGT = await zigT.getAddress();
    console.log("✅ ZiGT deployed to:", deploymentAddresses.ZiGT);

    // Step 3: Update Vault with real ZiGT address
    console.log("\n📊 Step 3: Updating Vault with real ZiGT address");
    
    const updateZiGTTx = await vault.setZiGT(deploymentAddresses.ZiGT);
    await updateZiGTTx.wait();
    console.log("✅ Vault ZiGT reference updated");

    // Step 4: Verify the connection
    console.log("\n📊 Step 4: Verifying contract connections");
    
    const zigTVault = await zigT.vaultAddress();
    const vaultZiGT = await vault.zigt();
    
    console.log("ZiGT.vaultAddress():", zigTVault);
    console.log("Vault.zigt():", vaultZiGT);
    
    if (zigTVault === deploymentAddresses.Vault && vaultZiGT === deploymentAddresses.ZiGT) {
      console.log("✅ Contract connections verified successfully!");
    } else {
      console.log("❌ Contract connection verification failed!");
    }

    // Save updated deployment addresses
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentAddresses, null, 2));
    
    console.log("\n🎉 Circular dependency deployment completed successfully!");
    console.log("📄 Updated deployment addresses saved to: deployment-addresses.json");
    
    console.log("\n📋 Final Deployment Summary:");
    console.log("========================");
    Object.entries(deploymentAddresses).forEach(([contract, address]) => {
      console.log(`${contract}: ${address}`);
    });

  } catch (error) {
    console.error("❌ Circular dependency deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 