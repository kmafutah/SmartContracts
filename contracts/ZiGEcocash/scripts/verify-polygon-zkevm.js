const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🔍 Verifying ZiG Ecosystem contracts on Polygon zkEVM...");

    // Load deployment info
    let deploymentInfo;
    try {
        deploymentInfo = JSON.parse(fs.readFileSync('deployment-polygon-zkevm-final.json', 'utf8'));
    } catch (error) {
        console.error("❌ Could not load deployment info. Please run deployment first.");
        return;
    }

    console.log("📋 Contracts to verify:");
    console.log(`  ZiGUtilityToken: ${deploymentInfo.utilityToken}`);
    console.log(`  ZiGOracleHub: ${deploymentInfo.oracleHub}`);
    console.log(`  ReparationsDAO: ${deploymentInfo.dao}`);
    console.log(`  RegionalStablecoins: ${deploymentInfo.regionalStablecoins}`);

    // Verify ZiGUtilityToken
    console.log("\n🔍 Verifying ZiGUtilityToken...");
    try {
        await hre.run("verify:verify", {
            address: deploymentInfo.utilityToken,
            constructorArguments: [],
        });
        console.log("✅ ZiGUtilityToken verified successfully");
    } catch (error) {
        console.log("⚠️  ZiGUtilityToken verification failed or already verified:", error.message);
    }

    // Verify ZiGOracleHub
    console.log("\n🔍 Verifying ZiGOracleHub...");
    try {
        await hre.run("verify:verify", {
            address: deploymentInfo.oracleHub,
            constructorArguments: [deploymentInfo.deployer],
        });
        console.log("✅ ZiGOracleHub verified successfully");
    } catch (error) {
        console.log("⚠️  ZiGOracleHub verification failed or already verified:", error.message);
    }

    // Verify ReparationsDAO
    console.log("\n🔍 Verifying ReparationsDAO...");
    try {
        await hre.run("verify:verify", {
            address: deploymentInfo.dao,
            constructorArguments: [
                deploymentInfo.deployer,
                ethers.ZeroAddress, // governanceToken
                ethers.ZeroAddress, // ethicalGuard
                ethers.ZeroAddress, // reparationNFT
                deploymentInfo.utilityToken
            ],
        });
        console.log("✅ ReparationsDAO verified successfully");
    } catch (error) {
        console.log("⚠️  ReparationsDAO verification failed or already verified:", error.message);
    }

    // Verify RegionalStablecoins
    console.log("\n🔍 Verifying RegionalStablecoins...");
    try {
        await hre.run("verify:verify", {
            address: deploymentInfo.regionalStablecoins,
            constructorArguments: [
                deploymentInfo.utilityToken,
                deploymentInfo.oracleHub,
                deploymentInfo.dao
            ],
        });
        console.log("✅ RegionalStablecoins verified successfully");
    } catch (error) {
        console.log("⚠️  RegionalStablecoins verification failed or already verified:", error.message);
    }

    console.log("\n🎉 Verification process completed!");
    console.log("\n📋 Verification Summary:");
    console.log("  All contracts have been submitted for verification on Polygon zkEVM block explorer");
    console.log("  Check the block explorer for verification status");
    console.log("  Contract addresses saved in deployment-polygon-zkevm.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Verification failed:", error);
        process.exit(1);
    }); 