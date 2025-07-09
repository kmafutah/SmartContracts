const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔧 Fixing DAO Governance Token Configuration...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  console.log("\n📊 Current DAO Configuration:");
  console.log("==============================");
  console.log(`Current DAO: ${deploymentAddresses.ReparationsDAO}`);
  console.log(`Governance Token: ${deploymentAddresses.ZiGGovernanceToken}`);
  console.log(`Utility Token: ${deploymentAddresses.ZiGUtilityToken}`);

  // Check current DAO governance token
  try {
    const currentDAO = await ethers.getContractAt("ReparationsDAO", deploymentAddresses.ReparationsDAO);
    const currentGovToken = await currentDAO.governanceToken();
    console.log(`Current DAO governance token: ${currentGovToken}`);
    
    if (currentGovToken === ethers.ZeroAddress) {
      console.log("❌ DAO has zero address for governance token - needs redeployment");
    } else {
      console.log("ℹ️  DAO has a governance token set, but it's not the correct one");
    }
  } catch (error) {
    console.log("⚠️  Could not check current DAO:", error.message);
  }

  console.log("\n🚀 Redeploying ReparationsDAO with correct governance token...");
  
  try {
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
    
    // Save updated addresses
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentAddresses, null, 2));
    console.log("✅ Updated deployment addresses file");
    
    // Update Oracle Hub DAO address
    console.log("\n🔗 Updating Oracle Hub DAO address...");
    const ZiGOracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);
    const setDaoTx = await ZiGOracleHub.setDaoAddress(newDAOAddress);
    await setDaoTx.wait();
    console.log("✅ Oracle Hub DAO address updated");
    
    // Update Governance Token DAO address
    console.log("\n🔗 Updating Governance Token DAO address...");
    const ZiGGovernanceToken = await ethers.getContractAt("ZiGGovernanceToken", deploymentAddresses.ZiGGovernanceToken);
    const setDaoInGovTx = await ZiGGovernanceToken.setReparationsDAO(newDAOAddress);
    await setDaoInGovTx.wait();
    console.log("✅ Governance Token DAO address updated");
    
    // Update SoulReparationNFT DAO address
    console.log("\n🔗 Updating SoulReparationNFT DAO address...");
    const SoulReparationNFT = await ethers.getContractAt("SoulReparationNFT", deploymentAddresses.SoulReparationNFT);
    const setDaoInNFTTx = await SoulReparationNFT.setReparationsDAO(newDAOAddress);
    await setDaoInNFTTx.wait();
    console.log("✅ SoulReparationNFT DAO address updated");
    
    console.log("\n🎉 DAO Governance Token Fix Complete!");
    console.log("=====================================");
    console.log(`New DAO Address: ${newDAOAddress}`);
    console.log(`Governance Token: ${deploymentAddresses.ZiGGovernanceToken}`);
    console.log("✅ All contracts updated to use the new DAO");
    
  } catch (error) {
    console.error("❌ Failed to fix DAO governance token:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ DAO governance fix failed:", error);
  process.exit(1);
}); 