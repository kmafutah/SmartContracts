const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Get deployer wallet using private key from .env file
 * This ensures we use the actual private key instead of Hardhat's default accounts
 */
function getDeployer() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY not found in .env file");
  }
  
  try {
    const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, ethers.provider);
    console.log("📱 Using wallet:", deployer.address);
    return deployer;
  } catch (error) {
    throw new Error(`❌ Failed to create wallet from private key: ${error.message}`);
  }
}

/**
 * Get deployer wallet and check balance
 */
async function getDeployerWithBalance() {
  const deployer = getDeployer();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.01")) {
    console.log("⚠️  Warning: Low balance. Consider funding this account.");
  }
  
  return deployer;
}

/**
 * Get multiple signers (for testing scenarios)
 */
async function getSigners() {
  const deployer = getDeployer();
  // For testing, create additional wallets if needed
  const user1 = new ethers.Wallet(process.env.USER1_PRIVATE_KEY || process.env.PRIVATE_KEY, ethers.provider);
  const user2 = new ethers.Wallet(process.env.USER2_PRIVATE_KEY || process.env.PRIVATE_KEY, ethers.provider);
  
  return [deployer, user1, user2];
}

module.exports = {
  getDeployer,
  getDeployerWithBalance,
  getSigners
}; 