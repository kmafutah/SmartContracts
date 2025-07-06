const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🔍 Debugging Vault Minting Issue...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Get contract instances
  const Vault = await ethers.getContractAt("Vault", deploymentAddresses.Vault);
  const ZiG = await ethers.getContractAt("ZiG", deploymentAddresses.ZiG);
  const ZiGT = await ethers.getContractAt("ZiGT", deploymentAddresses.ZiGT);
  const ZiGOracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);

  console.log("\n📊 Current State Analysis:");
  console.log("==========================");

  // Check ZiG balance
  const zigBalance = await ZiG.balanceOf(deployer.address);
  console.log(`💰 ZiG Balance: ${ethers.formatUnits(zigBalance, 18)} ZiG`);

  // Check ZiGT balance
  const zigtBalance = await ZiGT.balanceOf(deployer.address);
  console.log(`💰 ZiGT Balance: ${ethers.formatUnits(zigtBalance, 18)} ZiGT`);

  // Check Vault's ZiG balance
  const vaultZigBalance = await ZiG.balanceOf(deploymentAddresses.Vault);
  console.log(`🏦 Vault ZiG Balance: ${ethers.formatUnits(vaultZigBalance, 18)} ZiG`);

  // Check user's collateral for ZiGT
  const userCollateralForZiGT = await Vault.userCollateralForZiGT(deployer.address, deploymentAddresses.ZiG);
  console.log(`🔒 User Collateral for ZiGT: ${ethers.formatUnits(userCollateralForZiGT, 18)} ZiG`);

  // Check user's collateral for ZiG
  const userCollateralForZiG = await Vault.userCollateralForZiG(deployer.address, deploymentAddresses.ZiG);
  console.log(`🔒 User Collateral for ZiG: ${ethers.formatUnits(userCollateralForZiG, 18)} ZiG`);

  // Check user's minted amounts
  const userMintedZiG = await Vault.userMintedZiG(deployer.address);
  console.log(`🪙 User Minted ZiG: ${ethers.formatUnits(userMintedZiG, 18)} ZiG`);

  const userMintedZiGT = await Vault.userMintedZiGT(deployer.address);
  console.log(`🪙 User Minted ZiGT: ${ethers.formatUnits(userMintedZiGT, 18)} ZiGT`);

  // Check if ZiG is supported
  const isSupported = await Vault.isSupportedToken(deploymentAddresses.ZiG);
  console.log(`✅ ZiG is supported: ${isSupported}`);

  // Get collateral ratio
  const collateralRatio = await Vault.collateralRatio(deploymentAddresses.ZiG);
  console.log(`📊 ZiG Collateral Ratio: ${collateralRatio} basis points (${Number(collateralRatio)/100}%)`);

  // Get ZiG price from oracle
  try {
    const zigPrice = await ZiGOracleHub.getTokenPrice(deploymentAddresses.ZiG);
    console.log(`💵 ZiG Price from Oracle: $${ethers.formatUnits(zigPrice, 18)}`);
  } catch (error) {
    console.log(`❌ Failed to get ZiG price: ${error.message}`);
  }

  // Calculate total collateral value for ZiGT
  try {
    const totalCollateralValue = await Vault.getTotalCollateralValueForZiGT(deployer.address);
    console.log(`💎 Total Collateral Value for ZiGT: $${ethers.formatUnits(totalCollateralValue, 18)}`);
  } catch (error) {
    console.log(`❌ Failed to get total collateral value: ${error.message}`);
  }

  // Test the specific minting scenario
  const depositAmount = ethers.parseUnits("1000", 18);
  const mintAmount = ethers.parseUnits("500", 18);
  
  console.log("\n🧮 Minting Calculation Test:");
  console.log("============================");
  console.log(`📥 Deposit Amount: ${ethers.formatUnits(depositAmount, 18)} ZiG`);
  console.log(`🪙 Mint Amount: ${ethers.formatUnits(mintAmount, 18)} ZiGT`);

  // Calculate required collateral
  const newTotalMinted = userMintedZiGT + mintAmount;
  const requiredCollateral = (newTotalMinted * Number(collateralRatio)) / 10000;
  console.log(`📊 New Total Minted: ${ethers.formatUnits(newTotalMinted, 18)} ZiGT`);
  console.log(`📊 Required Collateral: ${ethers.formatUnits(requiredCollateral, 18)} ZiG`);

  // Check if we have enough collateral
  const currentCollateral = userCollateralForZiGT;
  console.log(`📊 Current Collateral: ${ethers.formatUnits(currentCollateral, 18)} ZiG`);
  
  if (currentCollateral >= requiredCollateral) {
    console.log("✅ Sufficient collateral for minting");
  } else {
    console.log("❌ Insufficient collateral for minting");
    console.log(`   Need: ${ethers.formatUnits(requiredCollateral, 18)} ZiG`);
    console.log(`   Have: ${ethers.formatUnits(currentCollateral, 18)} ZiG`);
    console.log(`   Short: ${ethers.formatUnits(requiredCollateral - currentCollateral, 18)} ZiG`);
  }

  // Check approval
  const allowance = await ZiG.allowance(deployer.address, deploymentAddresses.Vault);
  console.log(`🔐 ZiG Allowance for Vault: ${ethers.formatUnits(allowance, 18)} ZiG`);

  console.log("\n🔍 Potential Issues:");
  console.log("===================");
  
  if (currentCollateral < requiredCollateral) {
    console.log("❌ Issue: Insufficient collateral");
    console.log("   Solution: Deposit more ZiG as collateral");
  }
  
  if (allowance < depositAmount) {
    console.log("❌ Issue: Insufficient allowance");
    console.log("   Solution: Approve more ZiG tokens");
  }

  if (!isSupported) {
    console.log("❌ Issue: ZiG not supported as collateral");
    console.log("   Solution: Add ZiG as supported token");
  }

  console.log("\n💡 Recommendations:");
  console.log("===================");
  console.log("1. Check if the deposit transaction actually succeeded");
  console.log("2. Verify the collateral was deposited for ZiGT (not ZiG)");
  console.log("3. Ensure sufficient collateral ratio is maintained");
  console.log("4. Check if the Vault contract is paused");
}

main().catch((error) => {
  console.error("❌ Debug failed:", error);
  process.exit(1);
}); 