const { ethers } = require("hardhat");

async function validateAddresses() {
  console.log("🔍 Validating Deployment Addresses...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  try {
    // Load deployment addresses
    const deploymentData = require("../deployment-addresses-polygon_zkevm.json");
    console.log("✅ Loaded deployment data");
    console.log("Network:", deploymentData.network);
    console.log("File deployer:", deploymentData.deployer);
    
    // Check deployer match
    const deployerMatches = deploymentData.deployer.toLowerCase() === deployer.address.toLowerCase();
    console.log("Deployer matches:", deployerMatches ? "✅" : "❌");
    
    // Contract list
    const contracts = [
      "ZiGOracleHub", "ZiG", "Vault", "ZiGT", "ZiGWallet", 
      "ZiGSoulboundToken", "contracts/governance_identity_soulbound_statehood/AccessVerifier.sol:AccessVerifier", "EthicalGuard", 
      "ReparationsDAO", "ZiGGovernanceToken", "SoulReparationNFT", 
      "ZiGNFT", "ZiGRWAToken", "ZiGUtilityToken", "ZiGMemeToken", 
      "ZiGGameFiToken", "ZiGBondingCurve", "FeedRegistry", 
      "BandFeedRegistry", "LiveBandFeed", "MultiOracle"
    ];
    
    console.log("\n📋 Contract Validation:");
    console.log("=".repeat(60));
    
    let validCount = 0;
    let totalCount = 0;
    
    for (const contractName of contracts) {
      const address = deploymentData[contractName];
      totalCount++;
      
      if (!address) {
        console.log(`❌ ${contractName}: No address`);
        continue;
      }
      
      console.log(`\n🔍 ${contractName}: ${address}`);
      
      try {
        // Check if contract exists
        const code = await ethers.provider.getCode(address);
        if (code === "0x") {
          console.log(`  ❌ No contract deployed`);
          continue;
        }
        
        console.log(`  ✅ Contract exists`);
        
        // Try to get contract instance
        try {
          const contract = await ethers.getContractAt(contractName, address);
          
          // Test basic functions
          if (contractName.includes("Token") || contractName === "ZiG") {
            const name = await contract.name();
            const symbol = await contract.symbol();
            console.log(`  ✅ Valid - Name: ${name}, Symbol: ${symbol}`);
            validCount++;
          } else if (contractName === "ZiGNFT") {
            const name = await contract.name();
            const totalSupply = await contract.totalSupply();
            console.log(`  ✅ Valid - Name: ${name}, Supply: ${totalSupply}`);
            validCount++;
          } else {
            console.log(`  ✅ Valid contract`);
            validCount++;
          }
          
        } catch (error) {
          console.log(`  ❌ Interface error: ${error.message}`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total contracts: ${totalCount}`);
    console.log(`Valid contracts: ${validCount}`);
    console.log(`Success rate: ${((validCount/totalCount)*100).toFixed(1)}%`);
    
    if (validCount === totalCount) {
      console.log("\n🎉 All contracts validated successfully!");
    } else {
      console.log("\n⚠️  Some contracts need attention.");
    }
    
  } catch (error) {
    console.error("❌ Validation failed:", error.message);
  }
}

if (require.main === module) {
  validateAddresses()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { validateAddresses }; 