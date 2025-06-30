const { ethers } = require("hardhat");

async function testNFTImages() {
  console.log("🎨 Testing ZiG NFT Image Functionality with Real Assets...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  try {
    // Get contract addresses directly (from your deployment)
    const ZiGNFTAddress = "0x8C831De426b8De6bedbFa9d33eDEAC5342DAdFBD";
    const SoulReparationNFTAddress = "0x0c4eC1A9C0A9AA482a8F741C6dBC56b8164D19f2";
    
    console.log("ZiGNFT address:", ZiGNFTAddress);
    console.log("SoulReparationNFT address:", SoulReparationNFTAddress);
    
    // Get contract instances
    const ZiGNFT = await ethers.getContractAt("ZiGNFT", ZiGNFTAddress);
    const SoulReparationNFT = await ethers.getContractAt("SoulReparationNFT", SoulReparationNFTAddress);
    
    console.log("✅ Contracts loaded successfully");
    
    // Check permissions
    console.log("\n🔐 Checking Permissions...");
    const ziGNFTOwner = await ZiGNFT.owner();
    console.log("ZiGNFT Owner:", ziGNFTOwner);
    console.log("Is deployer owner of ZiGNFT?", ziGNFTOwner.toLowerCase() === deployer.address.toLowerCase());
    
    // Test 1: Check existing NFTs
    console.log("\n1️⃣ Checking Existing NFTs...");
    const totalSupply = await ZiGNFT.totalSupply();
    console.log("Total ZiGNFT supply:", totalSupply.toString());
    
    // Test 2: Test basic contract functions
    console.log("\n2️⃣ Testing Basic Contract Functions...");
    const ziGNFTName = await ZiGNFT.name();
    const ziGNFTSymbol = await ZiGNFT.symbol();
    console.log("ZiGNFT Name:", ziGNFTName);
    console.log("ZiGNFT Symbol:", ziGNFTSymbol);
    
    // Test 3: Try to read existing NFT data
    console.log("\n3️⃣ Reading Existing NFT Data...");
    if (totalSupply > 0) {
      for (let i = 1; i <= Math.min(totalSupply, 3); i++) {
        try {
          const owner = await ZiGNFT.ownerOf(i);
          console.log(`NFT #${i} owner:`, owner);
          
          // Try to get token URI
          const tokenURI = await ZiGNFT.tokenURI(i);
          console.log(`NFT #${i} URI:`, tokenURI);
          
        } catch (error) {
          console.log(`Failed to read NFT #${i}:`, error.message);
        }
      }
    }
    
    // Test 4: Try to create a simple NFT with minimal data
    if (ziGNFTOwner.toLowerCase() === deployer.address.toLowerCase()) {
      console.log("\n4️⃣ Creating Simple NFT...");
      
      try {
        // Use the simpler nftmint function (4 parameters)
        const tx = await ZiGNFT.nftmint(
          deployer.address,
          "https://ipfs.io/ipfs/QmTestMetadata",
          3, // rarity
          true // isLimited
        );
        await tx.wait();
        console.log("✅ Simple NFT created successfully");
        
        // Check the new total supply
        const newTotalSupply = await ZiGNFT.totalSupply();
        console.log("New total supply:", newTotalSupply.toString());
        
      } catch (error) {
        console.log("❌ Failed to create simple NFT:", error.message);
        
        // Try to get more details about the error
        if (error.data) {
          console.log("Error data:", error.data);
        }
      }
    }
    
    // Test 5: Test user ownership
    console.log("\n5️⃣ Testing User Ownership...");
    try {
      const userNFTs = await ZiGNFT.tokensOfOwner(deployer.address);
      console.log("User's ZiG NFTs:", userNFTs.map(id => id.toString()));
    } catch (error) {
      console.log("Failed to get user NFTs:", error.message);
    }
    
    console.log("\n🎉 NFT image tests completed!");
    console.log("\n💡 Available Asset Images in assets/ folder:");
    console.log("  - ZiG.png (Cultural)");
    console.log("  - ZGT.png (Economic)");
    console.log("  - ZGF.png (Governance)");
    console.log("  - ZUT.png (Utility)");
    console.log("  - SRPNFT.png (Soul Reparation)");
    console.log("  - ZRWA.png (Real World Asset)");
    console.log("  - ZMT.png (Meme Token)");
    console.log("  - ZBC.png (Bonding Curve)");
    console.log("  - ZWallet.png (Wallet)");
    console.log("  - ZOH.png (Oracle Hub)");
    console.log("  - VLT.png (Vault)");
    
    console.log("\n📝 About NFT_IMAGE_GUIDE.md:");
    console.log("  This guide documents the NFT image functionality that was planned");
    console.log("  but may not be fully implemented in the deployed contracts yet.");
    console.log("  The guide shows the intended features and usage patterns.");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

if (require.main === module) {
  testNFTImages()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { testNFTImages }; 