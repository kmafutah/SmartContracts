const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🧪 Simple Vault Minting Test...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Get contract instances
  const Vault = await ethers.getContractAt("Vault", deploymentAddresses.Vault);
  const ZiG = await ethers.getContractAt("ZiG", deploymentAddresses.ZiG);
  const ZiGT = await ethers.getContractAt("ZiGT", deploymentAddresses.ZiGT);

  console.log("\n📊 Step 1: Check Current State");
  console.log("==============================");

  // Check current state
  const userCollateralForZiGT = await Vault.userCollateralForZiGT(deployer.address, deploymentAddresses.ZiG);
  const userMintedZiGT = await Vault.userMintedZiGT(deployer.address);
  const collateralRatio = await Vault.collateralRatio(deploymentAddresses.ZiG);
  
  console.log(`🔒 Current Collateral for ZiGT: ${ethers.formatUnits(userCollateralForZiGT, 18)} ZiG`);
  console.log(`🪙 Current Minted ZiGT: ${ethers.formatUnits(userMintedZiGT, 18)} ZiGT`);
  console.log(`📊 Collateral Ratio: ${collateralRatio} basis points (${Number(collateralRatio)/100}%)`);

  console.log("\n📊 Step 2: Test getTotalCollateralValueForZiGT");
  console.log("==============================================");
  
  try {
    const totalValue = await Vault.getTotalCollateralValueForZiGT(deployer.address);
    console.log(`✅ Total Collateral Value: $${ethers.formatUnits(totalValue, 18)}`);
  } catch (error) {
    console.log(`❌ getTotalCollateralValueForZiGT failed: ${error.message}`);
    
    // Try to understand why it failed
    console.log("\n🔍 Investigating the failure...");
    
    // Check if ZiG is supported
    const isSupported = await Vault.isSupportedToken(deploymentAddresses.ZiG);
    console.log(`ZiG is supported: ${isSupported}`);
    
    // Check supported tokens count
    const supportedCount = await Vault.getSupportedTokensCount();
    console.log(`Supported tokens count: ${supportedCount}`);
    
    // List supported tokens
    for (let i = 0; i < supportedCount; i++) {
      const token = await Vault.supportedTokens(i);
      console.log(`Supported token ${i}: ${token}`);
    }
  }

  console.log("\n📊 Step 3: Test mintZiGT with minimal amount");
  console.log("=============================================");
  
  const testMintAmount = ethers.parseUnits("1", 18); // Try minting just 1 ZiGT
  
  try {
    console.log(`🪙 Attempting to mint ${ethers.formatUnits(testMintAmount, 18)} ZiGT...`);
    
    // First, let's try to estimate gas to see if the transaction would succeed
    const gasEstimate = await Vault.mintZiGT.estimateGas(testMintAmount);
    console.log(`✅ Gas estimate: ${gasEstimate.toString()}`);
    
    // If gas estimation succeeds, try the actual transaction
    const tx = await Vault.mintZiGT(testMintAmount);
    await tx.wait();
    console.log("✅ Minting succeeded!");
    
  } catch (error) {
    console.log(`❌ Minting failed: ${error.message}`);
    
    // Try to get more details about the revert
    if (error.message.includes("execution reverted")) {
      console.log("\n🔍 Revert Analysis:");
      
      // Check if the issue is in the collateral calculation
      try {
        const newTotalMinted = userMintedZiGT + testMintAmount;
        const requiredCollateral = (newTotalMinted * Number(collateralRatio)) / 10000;
        console.log(`Required collateral for ${ethers.formatUnits(testMintAmount, 18)} ZiGT: ${ethers.formatUnits(requiredCollateral, 18)} ZiG`);
        console.log(`Current collateral: ${ethers.formatUnits(userCollateralForZiGT, 18)} ZiG`);
        
        if (userCollateralForZiGT < requiredCollateral) {
          console.log("❌ Issue: Insufficient collateral");
        } else {
          console.log("✅ Collateral should be sufficient");
        }
      } catch (calcError) {
        console.log(`❌ Could not calculate required collateral: ${calcError.message}`);
      }
    }
  }

  console.log("\n📊 Final State");
  console.log("==============");
  
  const finalMintedZiGT = await Vault.userMintedZiGT(deployer.address);
  const finalZiGTBalance = await ZiGT.balanceOf(deployer.address);
  
  console.log(`🪙 Final Minted ZiGT: ${ethers.formatUnits(finalMintedZiGT, 18)} ZiGT`);
  console.log(`💰 Final ZiGT Balance: ${ethers.formatUnits(finalZiGTBalance, 18)} ZiGT`);
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
}); 