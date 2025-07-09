const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Testing .env file and wallet address...");
  console.log("=" .repeat(50));
  
  // Check if .env file exists
  const envPath = path.join(__dirname, "../.env");
  if (!fs.existsSync(envPath)) {
    console.log("❌ .env file not found!");
    console.log("💡 Create .env file with your private key");
    return;
  }
  
  console.log("✅ .env file found");
  
  // Load environment variables
  require("dotenv").config();
  
  // Check if PRIVATE_KEY is set
  if (!process.env.PRIVATE_KEY) {
    console.log("❌ PRIVATE_KEY not found in .env file");
    return;
  }
  
  console.log("✅ PRIVATE_KEY found in .env file");
  console.log("�� Private key (first 10 chars):", process.env.PRIVATE_KEY.substring(0, 10) + "...");
  
  // Create wallet from private key
  try {
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    console.log("📱 Wallet address:", wallet.address);
    
    // Check if this matches your expected address
    const expectedAddress = "0x9b13A4ddEd17053CAE4eC3B846eb890277D9972a";
    if (wallet.address.toLowerCase() === expectedAddress.toLowerCase()) {
      console.log("✅ Correct wallet address detected!");
    } else {
      console.log("❌ Wrong wallet address detected!");
      console.log("Expected:", expectedAddress);
      console.log("Got:", wallet.address);
    }
    
    // Test with Hardhat
    console.log("\n🔧 Testing with Hardhat getSigners()...");
    const [deployer] = await ethers.getSigners();
    console.log("Hardhat deployer:", deployer.address);
    
    if (deployer.address.toLowerCase() === wallet.address.toLowerCase()) {
      console.log("✅ Hardhat is using the correct wallet!");
    } else {
      console.log("❌ Hardhat is using the wrong wallet!");
      console.log("This means your .env file has the wrong PRIVATE_KEY");
    }
    
  } catch (error) {
    console.error("❌ Error creating wallet:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});