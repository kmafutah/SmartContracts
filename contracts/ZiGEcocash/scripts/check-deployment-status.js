const { ethers } = require("hardhat");

async function checkDeploymentStatus() {
  console.log("🔍 Checking Deployment Status on Polygon zkEVM...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Network:", network.name);
  
  // Contracts that should be deployed based on your logs
  const contractsToCheck = [
    { name: "ReparationsDAO", address: "0x4c5859f0F772848b2D91F1D83E2Fe57935348029" },
    { name: "RegionalStablecoins", address: "0x1291Be112d480055DaFd8a610b7d1e203891C274" },
    { name: "ZiGUtilityToken", address: "0x36C02dA8a0983159322a80FFE9F24b1acfF8B570" },
    { name: "ZiGOracleHub", address: "0x809d550fca64d94Bd9F66E60752A544199cfAC3D" }
  ];
  
  console.log("📋 Checking contract deployment status:");
  console.log("=" .repeat(60));
  
  for (const contract of contractsToCheck) {
    console.log(`\n🔍 ${contract.name}...`);
    console.log(`  Address: ${contract.address}`);
    
    try {
      const code = await ethers.provider.getCode(contract.address);
      if (code === "0x") {
        console.log(`  ❌ No contract deployed`);
      } else {
        console.log(`  ✅ Contract deployed`);
        console.log(`  🔗 Explorer: https://zkevm.polygonscan.com/address/${contract.address}`);
      }
    } catch (error) {
      console.log(`  ❌ Error checking: ${error.message}`);
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ Deployment status check complete");
}

if (require.main === module) {
  checkDeploymentStatus()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { checkDeploymentStatus }; 