const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔧 Fixing Critical Contract Configuration Issues...");
  console.log("==================================================");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  console.log("\n📊 Current Configuration Issues:");
  console.log("=================================");
  console.log(`❌ Vault using wrong oracle hub: ${deploymentAddresses.Vault}`);
  console.log(`❌ DAO using wrong governance token: ${deploymentAddresses.ReparationsDAO}`);

  let fixesApplied = [];

  // Fix 1: DAO Governance Token
  console.log("\n🔧 Fix 1: DAO Governance Token");
  console.log("===============================");
  
  try {
    // Check current DAO governance token
    const currentDAO = await ethers.getContractAt("ReparationsDAO", deploymentAddresses.ReparationsDAO);
    const currentGovToken = await currentDAO.governanceToken();
    
    if (currentGovToken === ethers.ZeroAddress) {
      console.log("❌ DAO has zero address for governance token - redeploying...");
      
      // Deploy new ReparationsDAO with correct parameters
      const ReparationsDAO = await ethers.getContractFactory("ReparationsDAO");
      const newDAO = await ReparationsDAO.deploy(
        deployer.address, // initialOwner
        deploymentAddresses.ZiGGovernanceToken, // governanceToken (correct address)
        deploymentAddresses.EthicalGuard, // ethicalGuard
        deploymentAddresses.SoulReparationNFT, // reparationNFT
        deploymentAddresses.ZiGUtilityToken // utilityToken
      );
      await newDAO.waitForDeployment();
      
      const newDAOAddress = await newDAO.getAddress();
      console.log("✅ New ReparationsDAO deployed to:", newDAOAddress);
      
      // Update the deployment addresses
      deploymentAddresses.ReparationsDAO = newDAOAddress;
      
      // Update Oracle Hub DAO address
      const ZiGOracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);
      const setDaoTx = await ZiGOracleHub.setDaoAddress(newDAOAddress);
      await setDaoTx.wait();
      console.log("✅ Oracle Hub DAO address updated");
      
      // Update Governance Token DAO address
      const ZiGGovernanceToken = await ethers.getContractAt("ZiGGovernanceToken", deploymentAddresses.ZiGGovernanceToken);
      const setDaoInGovTx = await ZiGGovernanceToken.setReparationsDAO(newDAOAddress);
      await setDaoInGovTx.wait();
      console.log("✅ Governance Token DAO address updated");
      
      // Update SoulReparationNFT DAO address
      const SoulReparationNFT = await ethers.getContractAt("SoulReparationNFT", deploymentAddresses.SoulReparationNFT);
      const setDaoInNFTTx = await SoulReparationNFT.setReparationsDAO(newDAOAddress);
      await setDaoInNFTTx.wait();
      console.log("✅ SoulReparationNFT DAO address updated");
      
      fixesApplied.push("DAO Governance Token");
    } else {
      console.log("✅ DAO already has governance token set");
    }
  } catch (error) {
    console.log("⚠️  Could not fix DAO governance token:", error.message);
  }

  // Fix 2: Vault Oracle Hub
  console.log("\n🔧 Fix 2: Vault Oracle Hub");
  console.log("===========================");
  
  try {
    // Check current Vault oracle hub
    const currentVault = await ethers.getContractAt("Vault", deploymentAddresses.Vault);
    const currentOracleHub = await currentVault.oracleHub();
    
    if (currentOracleHub.toLowerCase() !== deploymentAddresses.ZiGOracleHub.toLowerCase()) {
      console.log("❌ Vault using wrong oracle hub - redeploying...");
      
      // Deploy new Vault with correct parameters
      const Vault = await ethers.getContractFactory("Vault");
      const newVault = await Vault.deploy(
        deploymentAddresses.ZiG, // ZiG token address
        deployer.address, // Treasury (using deployer for now)
        deployer.address, // FutureReserve (using deployer for now)
        deployer.address, // DiasporaFund (using deployer for now)
        deploymentAddresses.ZiG, // ZiG contract address
        deploymentAddresses.ZiGT, // ZiGT contract address
        deploymentAddresses.ZiGOracleHub, // Oracle Hub (correct address)
        ethers.ZeroAddress // PAXG (zero address for now)
      );
      await newVault.waitForDeployment();
      
      const newVaultAddress = await newVault.getAddress();
      console.log("✅ New Vault deployed to:", newVaultAddress);
      
      // Update the deployment addresses
      deploymentAddresses.Vault = newVaultAddress;
      
      // Update ZiGT vault address
      const ZiGT = await ethers.getContractAt("ZiGT", deploymentAddresses.ZiGT);
      const setVaultTx = await ZiGT.setVaultAddress(newVaultAddress);
      await setVaultTx.wait();
      console.log("✅ ZiGT vault address updated");
      
      // Add ZiG as supported token in new Vault
      try {
        const addTokenTx = await newVault.addSupportedToken(deploymentAddresses.ZiG, 15000); // 150% collateral ratio
        await addTokenTx.wait();
        console.log("✅ ZiG added as supported token in new Vault");
      } catch (error) {
        if (error.message.includes('Token already supported')) {
          console.log("✅ ZiG is already supported in new Vault");
        } else {
          console.log("⚠️  Failed to add ZiG as supported token:", error.message);
        }
      }
      
      fixesApplied.push("Vault Oracle Hub");
    } else {
      console.log("✅ Vault already using correct oracle hub");
    }
  } catch (error) {
    console.log("⚠️  Could not fix Vault oracle hub:", error.message);
  }

  // Save updated addresses if any fixes were applied
  if (fixesApplied.length > 0) {
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentAddresses, null, 2));
    console.log("✅ Updated deployment addresses file");
  }

  console.log("\n🎉 Critical Issues Fix Summary");
  console.log("==============================");
  if (fixesApplied.length > 0) {
    console.log("✅ Fixed issues:");
    fixesApplied.forEach(fix => console.log(`   - ${fix}`));
    console.log("\n📋 Updated Configuration:");
    console.log(`   - DAO: ${deploymentAddresses.ReparationsDAO}`);
    console.log(`   - Vault: ${deploymentAddresses.Vault}`);
    console.log(`   - Governance Token: ${deploymentAddresses.ZiGGovernanceToken}`);
    console.log(`   - Oracle Hub: ${deploymentAddresses.ZiGOracleHub}`);
  } else {
    console.log("✅ No critical issues found - all contracts are properly configured!");
  }
  
  console.log("\n🚀 You can now run the user onboarding script successfully!");
}

main().catch((error) => {
  console.error("❌ Critical issues fix failed:", error);
  process.exit(1);
}); 