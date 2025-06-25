const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🔍 Starting Polygon zkEVM Contract Verification...");
    
    // Read deployment addresses
    const deploymentFile = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
    if (!fs.existsSync(deploymentFile)) {
        console.error("❌ Deployment file not found:", deploymentFile);
        process.exit(1);
    }
    
    const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    console.log("📄 Loaded deployment data for network:", deploymentData.network);
    console.log("👤 Deployer:", deploymentData.deployer);
    console.log("⏰ Timestamp:", deploymentData.timestamp);
    
    // Contract verification configurations
    const contractsToVerify = [
        {
            name: "ZiGOracleHub",
            address: deploymentData.ZiGOracleHub,
            constructorArgs: [deploymentData.deployer]
        },
        {
            name: "ZiG",
            address: deploymentData.ZiG,
            constructorArgs: [ethers.parseUnits("1", 18)] // 1 mg of gold per token
        },
        {
            name: "Vault",
            address: deploymentData.Vault,
            constructorArgs: [
                deploymentData.ZiG, // zigToken
                deploymentData.deployer, // treasury
                deploymentData.deployer, // futureReserve
                deploymentData.deployer, // diasporaFund
                deploymentData.ZiG, // zigAddress
                ethers.ZeroAddress, // placeholder zigtAddress
                deploymentData.ZiGOracleHub, // oracleHubAddress
                deploymentData.deployer // paxgAddress (using deployer as placeholder)
            ]
        },
        {
            name: "ZiGT",
            address: deploymentData.ZiGT,
            constructorArgs: [
                deploymentData.Vault,
                deploymentData.ZiGOracleHub
            ]
        },
        {
            name: "ZiGWallet",
            address: deploymentData.ZiGWallet,
            constructorArgs: [deploymentData.deployer]
        },
        {
            name: "ZiGSoulboundToken",
            address: deploymentData.ZiGSoulboundToken,
            constructorArgs: []
        },
        {
            name: "AccessVerifier",
            address: deploymentData.AccessVerifier,
            constructorArgs: [deploymentData.ZiGSoulboundToken]
        },
        {
            name: "EthicalGuard",
            address: deploymentData.EthicalGuard,
            constructorArgs: [
                deploymentData.deployer,
                deploymentData.AccessVerifier
            ]
        },
        {
            name: "ReparationsDAO",
            address: deploymentData.ReparationsDAO,
            constructorArgs: [
                deploymentData.deployer,
                deploymentData.ZiG,
                deploymentData.EthicalGuard,
                deploymentData.ZiGSoulboundToken
            ]
        },
        {
            name: "ZiGGovernanceToken",
            address: deploymentData.ZiGGovernanceToken,
            constructorArgs: [deploymentData.ReparationsDAO]
        },
        {
            name: "SoulReparationNFT",
            address: deploymentData.SoulReparationNFT,
            constructorArgs: [deploymentData.ReparationsDAO]
        },
        {
            name: "ZiGNFT",
            address: deploymentData.ZiGNFT,
            constructorArgs: []
        },
        {
            name: "ZiGRWAToken",
            address: deploymentData.ZiGRWAToken,
            constructorArgs: []
        },
        {
            name: "ZiGUtilityToken",
            address: deploymentData.ZiGUtilityToken,
            constructorArgs: []
        },
        {
            name: "ZiGMemeToken",
            address: deploymentData.ZiGMemeToken,
            constructorArgs: []
        },
        {
            name: "ZiGGameFiToken",
            address: deploymentData.ZiGGameFiToken,
            constructorArgs: []
        },
        {
            name: "ZiGBondingCurve",
            address: deploymentData.ZiGBondingCurve,
            constructorArgs: []
        }
    ];
    
    console.log(`\n🚀 Starting verification of ${contractsToVerify.length} contracts...`);
    console.log("=" .repeat(60));
    
    const results = {
        successful: [],
        failed: [],
        skipped: []
    };
    
    for (const contract of contractsToVerify) {
        try {
            console.log(`\n📋 Verifying ${contract.name}...`);
            console.log(`📍 Address: ${contract.address}`);
            
            if (contract.constructorArgs.length > 0) {
                console.log(`🔧 Constructor Args: ${contract.constructorArgs.map(arg => 
                    typeof arg === 'string' ? arg : arg.toString()
                ).join(', ')}`);
            }
            
            // Run verification with proper API key
            const { exec } = require("child_process");
            const { promisify } = require("util");
            const execAsync = promisify(exec);
            
            // Set the API key environment variable for this verification
            const env = { ...process.env };
            env.POLYGON_ZKEVM_API_KEY = process.env.POLYGON_ZKEVM_API_KEY;
            
            const verifyCommand = `npx hardhat verify --network polygon_zkevm ${contract.address} ${contract.constructorArgs.join(' ')}`;
            console.log(`🔍 Running: ${verifyCommand}`);
            
            const result = await execAsync(verifyCommand, { env });
            console.log("✅ Success:", result.stdout);
            results.successful.push(contract.name);
            
        } catch (error) {
            if (error.message.includes("Already Verified") || error.message.includes("already verified")) {
                console.log("⏭️  Already verified, skipping...");
                results.skipped.push(contract.name);
            } else {
                console.error("❌ Verification failed:", error.message);
                results.failed.push({
                    name: contract.name,
                    error: error.message
                });
            }
        }
        
        // Add delay between verifications to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 VERIFICATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Successfully verified: ${results.successful.length}`);
    console.log(`⏭️  Already verified: ${results.skipped.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    
    if (results.successful.length > 0) {
        console.log("\n✅ Successfully verified contracts:");
        results.successful.forEach(name => console.log(`   • ${name}`));
    }
    
    if (results.skipped.length > 0) {
        console.log("\n⏭️  Already verified contracts:");
        results.skipped.forEach(name => console.log(`   • ${name}`));
    }
    
    if (results.failed.length > 0) {
        console.log("\n❌ Failed verifications:");
        results.failed.forEach(item => {
            console.log(`   • ${item.name}: ${item.error}`);
        });
    }
    
    // Save results to file
    const resultsFile = path.join(__dirname, "../verification-results-polygon-zkevm.json");
    const resultsData = {
        timestamp: new Date().toISOString(),
        network: "polygon_zkevm",
        summary: {
            total: contractsToVerify.length,
            successful: results.successful.length,
            skipped: results.skipped.length,
            failed: results.failed.length
        },
        results: {
            successful: results.successful,
            skipped: results.skipped,
            failed: results.failed
        }
    };
    
    fs.writeFileSync(resultsFile, JSON.stringify(resultsData, null, 2));
    console.log(`\n📄 Results saved to: ${resultsFile}`);
    
    if (results.failed.length === 0) {
        console.log("\n🎉 All contracts verified successfully!");
    } else {
        console.log(`\n⚠️  ${results.failed.length} contracts failed verification. Check the results above.`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    }); 