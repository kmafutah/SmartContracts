const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting ZiGEcocash deployment on SKALE (Optimized)...");
  
  const [deployer] = await ethers.getSigners();
  
  if (!deployer) {
    console.error("❌ No deployer account found. Please set PRIVATE_KEY in .env file");
    process.exit(1);
  }
  
  // Get network name for filename
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "skale" : network.name;
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Network:", networkName);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const deploymentAddresses = {
    network: networkName,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  // SKALE-optimized settings
  const gasLimit = 30000000; // Lower than default
  const gasPrice = ethers.parseUnits("100000", "wei"); // 0.0001 gwei

  try {
    // Phase 1: Core Economic Infrastructure (Simplified)
    console.log("\n📊 Phase 1: Core Economic Infrastructure");
    
    // ZiG (simplest contract first)
    console.log("Deploying ZiG...");
    const ZiG = await ethers.getContractFactory("ZiG");
    const zig = await ZiG.deploy(ethers.parseUnits("1", 18), {
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await zig.waitForDeployment();
    deploymentAddresses.ZiG = await zig.getAddress();
    console.log("✅ ZiG:", await zig.getAddress());

    // ZiGOracleHub (with minimal constructor)
    console.log("Deploying ZiGOracleHub...");
    const ZiGOracleHub = await ethers.getContractFactory("ZiGOracleHub");
    const oracleHub = await ZiGOracleHub.deploy(deployer.address, {
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await oracleHub.waitForDeployment();
    deploymentAddresses.ZiGOracleHub = await oracleHub.getAddress();
    console.log("✅ ZiGOracleHub:", await oracleHub.getAddress());

    // Vault (with minimal constructor)
    console.log("Deploying Vault...");
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(
      await zig.getAddress(), // zigToken
      deployer.address, // treasury
      deployer.address, // futureReserve
      deployer.address, // diasporaFund
      await zig.getAddress(), // zigAddress
      ethers.ZeroAddress, // placeholder zigtAddress
      await oracleHub.getAddress(), // oracleHubAddress
      deployer.address, // paxgAddress
      {
        gasLimit: gasLimit,
        gasPrice: gasPrice
      }
    );
    await vault.waitForDeployment();
    deploymentAddresses.Vault = await vault.getAddress();
    console.log("✅ Vault:", await vault.getAddress());

    // ZiGT
    console.log("Deploying ZiGT...");
    const ZiGT = await ethers.getContractFactory("ZiGT");
    const zigT = await ZiGT.deploy(await vault.getAddress(), await oracleHub.getAddress(), {
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await zigT.waitForDeployment();
    deploymentAddresses.ZiGT = await zigT.getAddress();
    console.log("✅ ZiGT:", await zigT.getAddress());

    // Update Vault with real ZiGT address
    console.log("Updating Vault with ZiGT address...");
    const updateVaultTx = await vault.setZiGT(await zigT.getAddress(), {
      gasLimit: 100000,
      gasPrice: gasPrice
    });
    await updateVaultTx.wait();
    console.log("✅ Vault updated with ZiGT address");

    // ZiGWallet
    console.log("Deploying ZiGWallet...");
    const ZiGWallet = await ethers.getContractFactory("ZiGWallet");
    const zigWallet = await ZiGWallet.deploy(deployer.address, {
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await zigWallet.waitForDeployment();
    deploymentAddresses.ZiGWallet = await zigWallet.getAddress();
    console.log("✅ ZiGWallet:", await zigWallet.getAddress());

    // Phase 2: Identity & Governance (Simplified)
    console.log("\n🆔 Phase 2: Identity & Governance");
    
    // ZiGSoulboundToken
    console.log("Deploying ZiGSoulboundToken...");
    const ZiGSoulboundToken = await ethers.getContractFactory("ZiGSoulboundToken");
    const soulboundToken = await ZiGSoulboundToken.deploy({
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await soulboundToken.waitForDeployment();
    deploymentAddresses.ZiGSoulboundToken = await soulboundToken.getAddress();
    console.log("✅ ZiGSoulboundToken:", await soulboundToken.getAddress());

    // AccessVerifier
    console.log("Deploying AccessVerifier...");
    const AccessVerifier = await ethers.getContractFactory("contracts/governance_identity_soulbound_statehood/AccessVerifier.sol:AccessVerifier");
    const accessVerifier = await AccessVerifier.deploy(await soulboundToken.getAddress(), {
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await accessVerifier.waitForDeployment();
    deploymentAddresses.AccessVerifier = await accessVerifier.getAddress();
    console.log("✅ AccessVerifier:", await accessVerifier.getAddress());

    // EthicalGuard
    console.log("Deploying EthicalGuard...");
    const EthicalGuard = await ethers.getContractFactory("EthicalGuard");
    const ethicalGuard = await EthicalGuard.deploy(deployer.address, await accessVerifier.getAddress(), {
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await ethicalGuard.waitForDeployment();
    deploymentAddresses.EthicalGuard = await ethicalGuard.getAddress();
    console.log("✅ EthicalGuard:", await ethicalGuard.getAddress());

    // ReparationsDAO
    console.log("Deploying ReparationsDAO...");
    const ReparationsDAO = await ethers.getContractFactory("ReparationsDAO");
    const reparationsDAO = await ReparationsDAO.deploy(deployer.address, await zig.getAddress(), await ethicalGuard.getAddress(), await soulboundToken.getAddress(), {
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await reparationsDAO.waitForDeployment();
    deploymentAddresses.ReparationsDAO = await reparationsDAO.getAddress();
    console.log("✅ ReparationsDAO:", await reparationsDAO.getAddress());

    // ZiGGovernanceToken
    console.log("Deploying ZiGGovernanceToken...");
    const ZiGGovernanceToken = await ethers.getContractFactory("ZiGGovernanceToken");
    const governanceToken = await ZiGGovernanceToken.deploy(await reparationsDAO.getAddress(), {
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await governanceToken.waitForDeployment();
    deploymentAddresses.ZiGGovernanceToken = await governanceToken.getAddress();
    console.log("✅ ZiGGovernanceToken:", await governanceToken.getAddress());

    // Phase 3: Cultural & Utility Layer (Simplified)
    console.log("\n🎭 Phase 3: Cultural & Utility Layer");
    
    // SoulReparationNFT
    console.log("Deploying SoulReparationNFT...");
    const SoulReparationNFT = await ethers.getContractFactory("SoulReparationNFT");
    const soulReparationNFT = await SoulReparationNFT.deploy(await reparationsDAO.getAddress(), {
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await soulReparationNFT.waitForDeployment();
    deploymentAddresses.SoulReparationNFT = await soulReparationNFT.getAddress();
    console.log("✅ SoulReparationNFT:", await soulReparationNFT.getAddress());

    // ZiGNFT
    console.log("Deploying ZiGNFT...");
    const ZiGNFT = await ethers.getContractFactory("ZiGNFT");
    const zigNFT = await ZiGNFT.deploy({
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await zigNFT.waitForDeployment();
    deploymentAddresses.ZiGNFT = await zigNFT.getAddress();
    console.log("✅ ZiGNFT:", await zigNFT.getAddress());

    // ZiGRWAToken
    console.log("Deploying ZiGRWAToken...");
    const ZiGRWAToken = await ethers.getContractFactory("ZiGRWAToken");
    const rwaToken = await ZiGRWAToken.deploy({
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await rwaToken.waitForDeployment();
    deploymentAddresses.ZiGRWAToken = await rwaToken.getAddress();
    console.log("✅ ZiGRWAToken:", await rwaToken.getAddress());

    // ZiGUtilityToken
    console.log("Deploying ZiGUtilityToken...");
    const ZiGUtilityToken = await ethers.getContractFactory("ZiGUtilityToken");
    const utilityToken = await ZiGUtilityToken.deploy({
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await utilityToken.waitForDeployment();
    deploymentAddresses.ZiGUtilityToken = await utilityToken.getAddress();
    console.log("✅ ZiGUtilityToken:", await utilityToken.getAddress());

    // ZiGMemeToken
    console.log("Deploying ZiGMemeToken...");
    const ZiGMemeToken = await ethers.getContractFactory("ZiGMemeToken");
    const memeToken = await ZiGMemeToken.deploy({
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await memeToken.waitForDeployment();
    deploymentAddresses.ZiGMemeToken = await memeToken.getAddress();
    console.log("✅ ZiGMemeToken:", await memeToken.getAddress());

    // Phase 4: GameFi Expansion (Simplified)
    console.log("\n🎮 Phase 4: GameFi Expansion");
    
    // ZiGGameFiToken
    console.log("Deploying ZiGGameFiToken...");
    const ZiGGameFiToken = await ethers.getContractFactory("ZiGGameFiToken");
    const gameFiToken = await ZiGGameFiToken.deploy({
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await gameFiToken.waitForDeployment();
    deploymentAddresses.ZiGGameFiToken = await gameFiToken.getAddress();
    console.log("✅ ZiGGameFiToken:", await gameFiToken.getAddress());

    // ZiGBondingCurve
    console.log("Deploying ZiGBondingCurve...");
    const ZiGBondingCurve = await ethers.getContractFactory("ZiGBondingCurve");
    const bondingCurve = await ZiGBondingCurve.deploy({
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    await bondingCurve.waitForDeployment();
    deploymentAddresses.ZiGBondingCurve = await bondingCurve.getAddress();
    console.log("✅ ZiGBondingCurve:", await bondingCurve.getAddress());

    // Save deployment addresses
    const deploymentPath = path.join(__dirname, `../deployment-addresses-${networkName}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentAddresses, null, 2));
    
    console.log("\n🎉 Full deployment completed successfully on SKALE!");
    console.log(`📄 Deployment addresses saved to: deployment-addresses-${networkName}.json`);
    
    // Print summary
    console.log("\n📋 Deployment Summary:");
    console.log("========================");
    console.log(`Network: ${networkName}`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Timestamp: ${deploymentAddresses.timestamp}`);
    console.log("------------------------");
    Object.entries(deploymentAddresses).forEach(([key, value]) => {
      if (key !== 'network' && key !== 'deployer' && key !== 'timestamp') {
        console.log(`${key}: ${value}`);
      }
    });

    console.log("\n🔗 Next Steps:");
    console.log("1. Verify contracts on SKALE block explorer");
    console.log("2. Set up proper oracle price feeds");
    console.log("3. Configure DAO governance parameters");
    console.log("4. Test all contract interactions");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    
    // Save partial deployment addresses if available
    if (Object.keys(deploymentAddresses).length > 3) {
      const deploymentPath = path.join(__dirname, `../deployment-addresses-${networkName}-partial.json`);
      fs.writeFileSync(deploymentPath, JSON.stringify(deploymentAddresses, null, 2));
      console.log(`📄 Partial deployment addresses saved to: deployment-addresses-${networkName}-partial.json`);
    }
    
    console.log("\n💡 SKALE Deployment Troubleshooting:");
    console.log("1. SKALE uses different gas mechanics than traditional networks");
    console.log("2. Try deploying contracts individually to isolate issues");
    console.log("3. Consider using SKALE testnet first");
    console.log("4. Check SKALE network status and documentation");
    console.log("5. Verify your account has sufficient SKALE tokens");
    
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 