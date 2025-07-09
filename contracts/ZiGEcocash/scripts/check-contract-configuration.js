const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Checking all deployed contract configurations...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  console.log("\n📊 Contract Configuration Check");
  console.log("===============================");

  let issues = [];
  let warnings = [];

  // 1. Check Vault Configuration
  console.log("\n🏦 Checking Vault Configuration...");
  try {
    const Vault = await ethers.getContractAt("Vault", deploymentAddresses.Vault);
    
    // Check oracle hub
    const vaultOracleHub = await Vault.oracleHub();
    if (vaultOracleHub.toLowerCase() !== deploymentAddresses.ZiGOracleHub.toLowerCase()) {
      issues.push(`❌ Vault using wrong oracle hub: ${vaultOracleHub} (expected: ${deploymentAddresses.ZiGOracleHub})`);
    } else {
      console.log("✅ Vault oracle hub: Correct");
    }

    // Check ZiG token
    const vaultZiG = await Vault.zig();
    if (vaultZiG.toLowerCase() !== deploymentAddresses.ZiG.toLowerCase()) {
      issues.push(`❌ Vault using wrong ZiG token: ${vaultZiG} (expected: ${deploymentAddresses.ZiG})`);
    } else {
      console.log("✅ Vault ZiG token: Correct");
    }

    // Check ZiGT token
    const vaultZiGT = await Vault.zigt();
    if (vaultZiGT.toLowerCase() !== deploymentAddresses.ZiGT.toLowerCase()) {
      issues.push(`❌ Vault using wrong ZiGT token: ${vaultZiGT} (expected: ${deploymentAddresses.ZiGT})`);
    } else {
      console.log("✅ Vault ZiGT token: Correct");
    }

    // Check if ZiG is supported
    const isZiGSupported = await Vault.isSupportedToken(deploymentAddresses.ZiG);
    if (!isZiGSupported) {
      warnings.push("⚠️  ZiG not added as supported token in Vault");
    } else {
      console.log("✅ ZiG is supported in Vault");
    }

  } catch (error) {
    issues.push(`❌ Vault configuration check failed: ${error.message}`);
  }

  // 2. Check ZiGT Configuration
  console.log("\n🪙 Checking ZiGT Configuration...");
  try {
    const ZiGT = await ethers.getContractAt("ZiGT", deploymentAddresses.ZiGT);
    
    // Check vault address
    const zigtVault = await ZiGT.vaultAddress();
    if (zigtVault.toLowerCase() !== deploymentAddresses.Vault.toLowerCase()) {
      issues.push(`❌ ZiGT using wrong vault: ${zigtVault} (expected: ${deploymentAddresses.Vault})`);
    } else {
      console.log("✅ ZiGT vault address: Correct");
    }

    // Check oracle hub
    const zigtOracleHub = await ZiGT.oracleHub();
    if (zigtOracleHub.toLowerCase() !== deploymentAddresses.ZiGOracleHub.toLowerCase()) {
      issues.push(`❌ ZiGT using wrong oracle hub: ${zigtOracleHub} (expected: ${deploymentAddresses.ZiGOracleHub})`);
    } else {
      console.log("✅ ZiGT oracle hub: Correct");
    }

    // Check ZiG token
    const zigtZiG = await ZiGT.zigToken();
    if (zigtZiG.toLowerCase() !== deploymentAddresses.ZiG.toLowerCase()) {
      issues.push(`❌ ZiGT using wrong ZiG token: ${zigtZiG} (expected: ${deploymentAddresses.ZiG})`);
    } else {
      console.log("✅ ZiGT ZiG token: Correct");
    }

  } catch (error) {
    issues.push(`❌ ZiGT configuration check failed: ${error.message}`);
  }

  // 3. Check Oracle Hub Configuration
  console.log("\n🔮 Checking Oracle Hub Configuration...");
  try {
    const ZiGOracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);
    
    // Check if deployer is authorized
    const isAuthorized = await ZiGOracleHub.authorizedOracles(deployer.address);
    if (!isAuthorized) {
      warnings.push("⚠️  Deployer not authorized as oracle in ZiGOracleHub");
    } else {
      console.log("✅ Deployer authorized as oracle");
    }

    // Check if oracle is paused
    const isPaused = await ZiGOracleHub.paused();
    if (isPaused) {
      issues.push("❌ Oracle Hub is paused");
    } else {
      console.log("✅ Oracle Hub is not paused");
    }

    // Check DAO address
    const daoAddress = await ZiGOracleHub.dao();
    if (daoAddress === ethers.ZeroAddress) {
      warnings.push("⚠️  DAO address not set in Oracle Hub");
    } else {
      console.log("✅ DAO address is set");
    }

  } catch (error) {
    issues.push(`❌ Oracle Hub configuration check failed: ${error.message}`);
  }

  // 4. Check Token Contracts
  console.log("\n🪙 Checking Token Contracts...");
  try {
    const ZiG = await ethers.getContractAt("ZiG", deploymentAddresses.ZiG);
    const ZiGGovernanceToken = await ethers.getContractAt("ZiGGovernanceToken", deploymentAddresses.ZiGGovernanceToken);
    const ZiGUtilityToken = await ethers.getContractAt("ZiGUtilityToken", deploymentAddresses.ZiGUtilityToken);
    const ZiGSoulboundToken = await ethers.getContractAt("ZiGSoulboundToken", deploymentAddresses.ZiGSoulboundToken);

    // Check ZiG owner
    const zigOwner = await ZiG.owner();
    if (zigOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      warnings.push("⚠️  Deployer is not owner of ZiG token");
    } else {
      console.log("✅ ZiG owner: Correct");
    }

    // Check governance token owner
    const govOwner = await ZiGGovernanceToken.owner();
    if (govOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      warnings.push("⚠️  Deployer is not owner of Governance token");
    } else {
      console.log("✅ Governance token owner: Correct");
    }

    // Check utility token owner
    const utilOwner = await ZiGUtilityToken.owner();
    if (utilOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      warnings.push("⚠️  Deployer is not owner of Utility token");
    } else {
      console.log("✅ Utility token owner: Correct");
    }

    // Check soulbound token owner
    const soulOwner = await ZiGSoulboundToken.owner();
    if (soulOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      warnings.push("⚠️  Deployer is not owner of Soulbound token");
    } else {
      console.log("✅ Soulbound token owner: Correct");
    }

  } catch (error) {
    issues.push(`❌ Token contracts check failed: ${error.message}`);
  }

  // 5. Check DAO Configuration
  console.log("\n🏛️  Checking DAO Configuration...");
  try {
    const ReparationsDAO = await ethers.getContractAt("ReparationsDAO", deploymentAddresses.ReparationsDAO);
    
    // Check governance token
    const daoGovToken = await ReparationsDAO.governanceToken();
    if (daoGovToken.toLowerCase() !== deploymentAddresses.ZiGGovernanceToken.toLowerCase()) {
      issues.push(`❌ DAO using wrong governance token: ${daoGovToken} (expected: ${deploymentAddresses.ZiGGovernanceToken})`);
    } else {
      console.log("✅ DAO governance token: Correct");
    }

    // Check owner
    const daoOwner = await ReparationsDAO.owner();
    if (daoOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      warnings.push("⚠️  Deployer is not owner of DAO");
    } else {
      console.log("✅ DAO owner: Correct");
    }

  } catch (error) {
    issues.push(`❌ DAO configuration check failed: ${error.message}`);
  }

  // 6. Check NFT Configuration
  console.log("\n🎨 Checking NFT Configuration...");
  try {
    const ZiGNFT = await ethers.getContractAt("ZiGNFT", deploymentAddresses.ZiGNFT);
    
    // Check owner
    const nftOwner = await ZiGNFT.owner();
    if (nftOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      warnings.push("⚠️  Deployer is not owner of ZiG NFT");
    } else {
      console.log("✅ ZiG NFT owner: Correct");
    }

  } catch (error) {
    issues.push(`❌ NFT configuration check failed: ${error.message}`);
  }

  // 7. Check RegionalStablecoins Configuration
  console.log("\n🌍 Checking RegionalStablecoins Configuration...");
  try {
    const RegionalStablecoins = await ethers.getContractAt("RegionalStablecoins", deploymentAddresses.RegionalStablecoins);
    
    // Check owner
    const stablecoinsOwner = await RegionalStablecoins.owner();
    if (stablecoinsOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      warnings.push("⚠️  Deployer is not owner of RegionalStablecoins");
    } else {
      console.log("✅ RegionalStablecoins owner: Correct");
    }

    // Check total regions and contract status
    try {
      const totalRegions = await RegionalStablecoins.totalRegions();
      console.log(`✅ RegionalStablecoins has ${totalRegions.toString()} regions configured`);
      
      const isPaused = await RegionalStablecoins.paused();
      if (isPaused) {
        warnings.push("⚠️  RegionalStablecoins contract is paused");
      } else {
        console.log("✅ RegionalStablecoins contract is active");
      }
      
      // Check Southern Africa region (region 5) as an example
      const southernAfricaInfo = await RegionalStablecoins.getRegionalStablecoin(5);
      console.log(`✅ Southern Africa region: ${southernAfricaInfo[0]} (${southernAfricaInfo[1]}) - Active: ${southernAfricaInfo[3]}`);
      
    } catch (error) {
      console.log("ℹ️  Could not check RegionalStablecoins details:", error.message);
    }

  } catch (error) {
    issues.push(`❌ RegionalStablecoins configuration check failed: ${error.message}`);
  }

  // Summary
  console.log("\n📋 Configuration Summary");
  console.log("========================");
  
  if (issues.length === 0 && warnings.length === 0) {
    console.log("🎉 All contracts are correctly configured!");
  } else {
    if (issues.length > 0) {
      console.log("\n❌ Critical Issues Found:");
      issues.forEach(issue => console.log(issue));
    }
    
    if (warnings.length > 0) {
      console.log("\n⚠️  Warnings:");
      warnings.forEach(warning => console.log(warning));
    }
  }

  console.log(`\n📊 Summary: ${issues.length} issues, ${warnings.length} warnings`);
}

main().catch((error) => {
  console.error("❌ Configuration check failed:", error);
  process.exit(1);
}); 