
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

async function main() {
  // Validate environment variables
  if (!process.env.PRIVATE_KEY) {
    throw new Error("Missing PRIVATE_KEY in .env");
  }
  if (!process.env.OWNER_ADDRESS) {
    throw new Error("Missing OWNER_ADDRESS in .env");
  }

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Get balance using provider.getBalance()
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deployment parameters
  const deploymentParams = {
    // Oracle Hub
    oracleHubOwner: process.env.OWNER_ADDRESS,
    
    // Reparations Model
    zigtTokenAddress: "", // Will be set after ZiGT deployment
    vaultAddress: "", // Will be set after Vault deployment
    verifierAddress: "", // Will be set after AccessVerifier deployment
    daoAddress: "", // Will be set after DAO deployment
    oracleRouterAddress: "", // Will be set after OracleHub deployment
    
    // ZiGT Token
    initialSupply: ethers.parseEther("1000000"), // 1M tokens
    ccipRouter: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59", // Example CCIP router (replace with actual)
    bandFeedRegistry: "", // Will be set after BandFeedRegistry deployment
    
    // Governance Token
    governanceInitialSupply: ethers.parseEther("100000"), // 100k tokens
    
    // GameFi Token
    gameFiInitialSupply: ethers.parseEther("1000000"), // 1M tokens
    
    // RWA Token
    rwaInitialSupply: ethers.parseEther("1000"), // 1k tokens
    
    // Meme Token
    memeInitialSupply: ethers.parseEther("1000000000"), // 1B tokens
  };

  // Deployment tracker
  const deployments = {};

  // Helper function to save deployment info
  const saveDeployment = async (contractName, proxyAddress, implementationAddress) => {
    deployments[contractName] = {
      proxy: proxyAddress,
      implementation: implementationAddress,
      timestamp: new Date().toISOString()
    };
    
    fs.mkdirSync("./deployments", { recursive: true });
    fs.writeFileSync(
      `./deployments/${contractName}-${hre.network.name}.json`,
      JSON.stringify({
        proxyAddress,
        implementationAddress,
        network: hre.network.name,
        timestamp: new Date().toISOString()
      }, null, 2)
    );
    
    // Update .env
    fs.writeFileSync(".env", `\n${contractName.toUpperCase()}_ADDRESS=${proxyAddress}`, { flag: "a" });
  };

  // Helper function to verify contracts
  const verifyContract = async (contractName, address, constructorArgs = []) => {
    if (hre.network.name !== "hardhat") {
      console.log(`Verifying ${contractName} at ${address}...`);
      try {
        await hre.run("verify:verify", {
          address: address,
          constructorArguments: constructorArgs
        });
        console.log(`${contractName} verified successfully.`);
      } catch (error) {
        console.error(`Verification failed for ${contractName}:`, error.message);
      }
    }
  };

  // 1. Deploy AccessVerifier
  console.log("Deploying AccessVerifier...");
  const AccessVerifier = await ethers.getContractFactory("AccessVerifier");
  const accessVerifier = await upgrades.deployProxy(AccessVerifier, [], { 
    initializer: "initialize", 
    kind: "uups" 
  });
  await accessVerifier.waitForDeployment();
  deploymentParams.verifierAddress = await accessVerifier.getAddress();
  const accessVerifierImpl = await upgrades.erc1967.getImplementationAddress(deploymentParams.verifierAddress);
  await saveDeployment("AccessVerifier", deploymentParams.verifierAddress, accessVerifierImpl);
  console.log("AccessVerifier deployed to:", deploymentParams.verifierAddress);

  // 2. Deploy RedistributionVault
  console.log("Deploying RedistributionVault...");
  const RedistributionVault = await ethers.getContractFactory("RedistributionVault");
  const vault = await upgrades.deployProxy(RedistributionVault, [
    process.env.OWNER_ADDRESS, // tokenAddress (will be updated later)
    process.env.OWNER_ADDRESS, // panAfricanTreasury (temporary)
    process.env.OWNER_ADDRESS, // diasporaDevelopmentPool (temporary)
    process.env.OWNER_ADDRESS, // historicalRestitutionFund (temporary)
    2500 // minRedistributionShare (25%)
  ], { 
    initializer: "initialize", 
    kind: "uups" 
  });
  await vault.waitForDeployment();
  deploymentParams.vaultAddress = await vault.getAddress();
  const vaultImpl = await upgrades.erc1967.getImplementationAddress(deploymentParams.vaultAddress);
  await saveDeployment("RedistributionVault", deploymentParams.vaultAddress, vaultImpl);
  console.log("RedistributionVault deployed to:", deploymentParams.vaultAddress);

  // 3. Deploy ReparationsDAO
  console.log("Deploying ReparationsDAO...");
  const ReparationsDAO = await ethers.getContractFactory("ReparationsDAO");
  const dao = await upgrades.deployProxy(ReparationsDAO, [], { 
    initializer: "initialize", 
    kind: "uups" 
  });
  await dao.waitForDeployment();
  deploymentParams.daoAddress = await dao.getAddress();
  const daoImpl = await upgrades.erc1967.getImplementationAddress(deploymentParams.daoAddress);
  await saveDeployment("ReparationsDAO", deploymentParams.daoAddress, daoImpl);
  console.log("ReparationsDAO deployed to:", deploymentParams.daoAddress);

  // 4. Deploy BandFeedRegistry
  console.log("Deploying BandFeedRegistry...");
  const BandFeedRegistry = await ethers.getContractFactory("BandFeedRegistry");
  const bandFeedRegistry = await upgrades.deployProxy(BandFeedRegistry, [
    process.env.OWNER_ADDRESS
  ], { 
    initializer: "initialize", 
    kind: "uups" 
  });
  await bandFeedRegistry.waitForDeployment();
  deploymentParams.bandFeedRegistry = await bandFeedRegistry.getAddress();
  const bandFeedRegistryImpl = await upgrades.erc1967.getImplementationAddress(deploymentParams.bandFeedRegistry);
  await saveDeployment("BandFeedRegistry", deploymentParams.bandFeedRegistry, bandFeedRegistryImpl);
  console.log("BandFeedRegistry deployed to:", deploymentParams.bandFeedRegistry);

  // 5. Deploy ZiGOracleHub
  console.log("Deploying ZiGOracleHub...");
  const ZiGOracleHub = await ethers.getContractFactory("ZiGOracleHub");
  const oracleHub = await ZiGOracleHub.deploy(process.env.OWNER_ADDRESS);
  await oracleHub.waitForDeployment();
  deploymentParams.oracleRouterAddress = await oracleHub.getAddress();
  await saveDeployment("ZiGOracleHub", deploymentParams.oracleRouterAddress, deploymentParams.oracleRouterAddress);
  console.log("ZiGOracleHub deployed to:", deploymentParams.oracleRouterAddress);

  // 6. Deploy ZiGT Token
  console.log("Deploying ZiGT Token...");
  const ZiGT = await ethers.getContractFactory("ZiGT");
  const zigt = await upgrades.deployProxy(ZiGT, [
    deploymentParams.ccipRouter,
    deploymentParams.bandFeedRegistry,
    process.env.OWNER_ADDRESS,
    0, // StrategicDirection.Famous8PlusZAR
    {
      metals: 6000, // 60%
      fiat: 3000,   // 30%
      crypto: 1000  // 10%
    }
  ], { 
    initializer: "initialize", 
    kind: "uups",
    gasLimit: 5000000 
  });
  await zigt.waitForDeployment();
  deploymentParams.zigtTokenAddress = await zigt.getAddress();
  const zigtImpl = await upgrades.erc1967.getImplementationAddress(deploymentParams.zigtTokenAddress);
  await saveDeployment("ZiGT", deploymentParams.zigtTokenAddress, zigtImpl);
  console.log("ZiGT Token deployed to:", deploymentParams.zigtTokenAddress);

  // 7. Deploy ReparationsModel
  console.log("Deploying ReparationsModel...");
  const ReparationsModel = await ethers.getContractFactory("ReparationsModel");
  const reparationsModel = await upgrades.deployProxy(ReparationsModel, [
    deploymentParams.zigtTokenAddress,
    deploymentParams.vaultAddress,
    deploymentParams.verifierAddress,
    deploymentParams.daoAddress,
    deploymentParams.oracleRouterAddress
  ], { 
    initializer: "initialize", 
    kind: "uups" 
  });
  await reparationsModel.waitForDeployment();
  const reparationsModelAddress = await reparationsModel.getAddress();
  const reparationsModelImpl = await upgrades.erc1967.getImplementationAddress(reparationsModelAddress);
  await saveDeployment("ReparationsModel", reparationsModelAddress, reparationsModelImpl);
  console.log("ReparationsModel deployed to:", reparationsModelAddress);

  // 8. Deploy Governance Token
  console.log("Deploying ZiGGovernanceToken...");
  const ZiGGovernanceToken = await ethers.getContractFactory("ZiGGovernanceToken");
  const govToken = await upgrades.deployProxy(ZiGGovernanceToken, [
    deploymentParams.vaultAddress, // treasuryAddress
    deploymentParams.governanceInitialSupply,
    process.env.OWNER_ADDRESS
  ], { 
    initializer: "initialize", 
    kind: "uups" 
  });
  await govToken.waitForDeployment();
  const govTokenAddress = await govToken.getAddress();
  const govTokenImpl = await upgrades.erc1967.getImplementationAddress(govTokenAddress);
  await saveDeployment("ZiGGovernanceToken", govTokenAddress, govTokenImpl);
  console.log("ZiGGovernanceToken deployed to:", govTokenAddress);

  // 9. Deploy GameFi Token
  console.log("Deploying ZiGGameFiToken...");
  const ZiGGameFiToken = await ethers.getContractFactory("ZiGGameFiToken");
  const gameFiToken = await ZiGGameFiToken.deploy(deploymentParams.gameFiInitialSupply);
  await gameFiToken.waitForDeployment();
  const gameFiTokenAddress = await gameFiToken.getAddress();
  await saveDeployment("ZiGGameFiToken", gameFiTokenAddress, gameFiTokenAddress);
  console.log("ZiGGameFiToken deployed to:", gameFiTokenAddress);

  // 10. Deploy RWA Token
  console.log("Deploying ZiGRWAToken...");
  const ZiGRWAToken = await ethers.getContractFactory("ZiGRWAToken");
  const rwaToken = await ZiGRWAToken.deploy(deploymentParams.rwaInitialSupply);
  await rwaToken.waitForDeployment();
  const rwaTokenAddress = await rwaToken.getAddress();
  await saveDeployment("ZiGRWAToken", rwaTokenAddress, rwaTokenAddress);
  console.log("ZiGRWAToken deployed to:", rwaTokenAddress);

  // 11. Deploy Meme Token
  console.log("Deploying ZiGMemeToken...");
  const ZiGMemeToken = await ethers.getContractFactory("ZiGMemeToken");
  const memeToken = await ZiGMemeToken.deploy(deploymentParams.memeInitialSupply);
  await memeToken.waitForDeployment();
  const memeTokenAddress = await memeToken.getAddress();
  await saveDeployment("ZiGMemeToken", memeTokenAddress, memeTokenAddress);
  console.log("ZiGMemeToken deployed to:", memeTokenAddress);

  // 12. Deploy NFT Contracts
  console.log("Deploying NFT contracts...");
  
  // ZiGNFT
  const ZiGNFT = await ethers.getContractFactory("ZiGNFT");
  const zgNFT = await ZiGNFT.deploy(process.env.OWNER_ADDRESS);
  await zgNFT.waitForDeployment();
  const zgNFTAddress = await zgNFT.getAddress();
  await saveDeployment("ZiGNFT", zgNFTAddress, zgNFTAddress);
  console.log("ZiGNFT deployed to:", zgNFTAddress);

  // ZiGSoulboundToken
  const ZiGSoulboundToken = await ethers.getContractFactory("ZiGSoulboundToken");
  const soulboundToken = await ZiGSoulboundToken.deploy(process.env.OWNER_ADDRESS);
  await soulboundToken.waitForDeployment();
  const soulboundTokenAddress = await soulboundToken.getAddress();
  await saveDeployment("ZiGSoulboundToken", soulboundTokenAddress, soulboundTokenAddress);
  console.log("ZiGSoulboundToken deployed to:", soulboundTokenAddress);

  // SoulReparationNFT
  const SoulReparationNFT = await ethers.getContractFactory("SoulReparationNFT");
  const soulRepNFT = await SoulReparationNFT.deploy(process.env.OWNER_ADDRESS);
  await soulRepNFT.waitForDeployment();
  const soulRepNFTAddress = await soulRepNFT.getAddress();
  await saveDeployment("SoulReparationNFT", soulRepNFTAddress, soulRepNFTAddress);
  console.log("SoulReparationNFT deployed to:", soulRepNFTAddress);

  // Verify all contracts
  if (hre.network.name !== "hardhat") {
    console.log("Starting verification process...");
    
    await verifyContract("AccessVerifier", deploymentParams.verifierAddress);
    await verifyContract("RedistributionVault", deploymentParams.vaultAddress);
    await verifyContract("ReparationsDAO", deploymentParams.daoAddress);
    await verifyContract("BandFeedRegistry", deploymentParams.bandFeedRegistry);
    await verifyContract("ZiGOracleHub", deploymentParams.oracleRouterAddress);
    await verifyContract("ZiGT", deploymentParams.zigtTokenAddress);
    await verifyContract("ReparationsModel", reparationsModelAddress);
    await verifyContract("ZiGGovernanceToken", govTokenAddress);
    await verifyContract("ZiGGameFiToken", gameFiTokenAddress);
    await verifyContract("ZiGRWAToken", rwaTokenAddress);
    await verifyContract("ZiGMemeToken", memeTokenAddress);
    await verifyContract("ZiGNFT", zgNFTAddress);
    await verifyContract("ZiGSoulboundToken", soulboundTokenAddress);
    await verifyContract("SoulReparationNFT", soulRepNFTAddress);
  }

  // Save complete deployment info
  fs.writeFileSync(
    `./deployments/full-deployment-${hre.network.name}.json`,
    JSON.stringify(deployments, null, 2)
  );

  console.log("Deployment completed successfully!");
  console.log("Summary of deployed contracts:");
  console.table(deployments);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });