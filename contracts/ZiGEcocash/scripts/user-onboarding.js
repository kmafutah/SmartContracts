const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🚀 Starting User Onboarding Script...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Manual user account - CHANGE THIS TO THE TARGET USER ADDRESS
  const userAddress = "0x9b13A4ddEd17053CAE4eC3B846eb890277D9972a";//"0xa2f73aedbdba88f3092c1b4ad7eddf80c8f0e2b6";//"0x85DB3E1502253fEc636bf43728416C100A171fe4";//"0x4cbb965c79f27f0102d4f6662721390bea64e372";//"0x9b13A4ddEd17053CAE4eC3B846eb890277D9972a";//"0x85DB3E1502253fEc636bf43728416C100A171fe4";//"0xf8443c02e97adeb2d4dbfbd8100ff2616c073a49";//"0x41ed0fa1799bbb17f3907eada8f1810e7687d139"; // CHANGE THIS!
  
  if (userAddress === "0x1234567890123456789012345678901234567890") {
    console.error("❌ Please change the userAddress to the actual target user address!");
    return;
  }

  console.log("Target user account:", userAddress);
  console.log("Target user balance:", ethers.formatEther(await ethers.provider.getBalance(userAddress)), "ETH");

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ No deployment addresses found. Run deployment first.");
    return;
  }
  
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("📄 Loaded deployment addresses");

  // Get contract instances
  const ZiG = await ethers.getContractAt("ZiG", deploymentAddresses.ZiG);
  const ZiGT = await ethers.getContractAt("ZiGT", deploymentAddresses.ZiGT);
  const Vault = await ethers.getContractAt("Vault", deploymentAddresses.Vault);
  const ZiGUtilityToken = await ethers.getContractAt("ZiGUtilityToken", deploymentAddresses.ZiGUtilityToken);
  const ZiGGovernanceToken = await ethers.getContractAt("ZiGGovernanceToken", deploymentAddresses.ZiGGovernanceToken);
  const ZiGMemeToken = await ethers.getContractAt("ZiGMemeToken", deploymentAddresses.ZiGMemeToken);
  const ZiGGameFiToken = await ethers.getContractAt("ZiGGameFiToken", deploymentAddresses.ZiGGameFiToken);
  const ZiGRWAToken = await ethers.getContractAt("ZiGRWAToken", deploymentAddresses.ZiGRWAToken);
  const ZiGNFT = await ethers.getContractAt("ZiGNFT", deploymentAddresses.ZiGNFT);
  const ZiGSoulboundToken = await ethers.getContractAt("ZiGSoulboundToken", deploymentAddresses.ZiGSoulboundToken);
  const ReparationsDAO = await ethers.getContractAt("ReparationsDAO", deploymentAddresses.ReparationsDAO);

  console.log("\n🎯 Starting User Onboarding Process...");

  // ========================================
  // 1. MINT ZiG TOKENS TO USER
  // ========================================
  console.log("\n📊 1. Minting ZiG tokens to user...");
  
  // Calculate required ZiG amount for all operations
  const ziGForZiGT = ethers.parseUnits("1000", 18); // For ZiGT minting
  const ziGForUtility = ethers.parseUnits("500", 18); // For utility tokens
  const ziGForOther = ethers.parseUnits("500", 18); // For other tokens
  const totalZiGNeeded = ziGForZiGT + ziGForUtility + ziGForOther;
  
  console.log(`💰 Total ZiG needed: ${ethers.formatUnits(totalZiGNeeded, 18)} ZiG`);
  
  try {
    const mintTx = await ZiG.mint(userAddress, totalZiGNeeded);
    await mintTx.wait();
    console.log("✅ Minted ZiG tokens to user");
    
    const userZiGBalance = await ZiG.balanceOf(userAddress);
    console.log(`📊 User ZiG balance: ${ethers.formatUnits(userZiGBalance, 18)} ZiG`);
  } catch (error) {
    console.error("❌ Failed to mint ZiG tokens:", error.message);
    return;
  }

  // ========================================
  // 2. MINT ZiGT VIA VAULT
  // ========================================
  console.log("\n📊 2. Setting up ZiGT minting via Vault...");
  
  try {
    // User needs to approve Vault to spend ZiG
    const userSigner = await ethers.getSigner(userAddress);
    const userZiG = ZiG.connect(userSigner);
    const userVault = Vault.connect(userSigner);
    
    console.log("✅ Approving Vault to spend ZiG tokens...");
    const approveTx = await userZiG.approve(await Vault.getAddress(), ziGForZiGT);
    await approveTx.wait();
    
    console.log("✅ Depositing ZiG as collateral...");
    const depositTx = await userVault.depositCollateral(deploymentAddresses.ZiG, ziGForZiGT, false);
    await depositTx.wait();
    
    console.log("✅ Minting ZiGT...");
    const mintZiGTTx = await userVault.mintZiGT(ethers.parseUnits("500", 18));
    await mintZiGTTx.wait();
    
    const userZiGTBalance = await ZiGT.balanceOf(userAddress);
    console.log(`📊 User ZiGT balance: ${ethers.formatUnits(userZiGTBalance, 18)} ZiGT`);
  } catch (error) {
    console.error("❌ Failed to mint ZiGT:", error.message);
  }

  // ========================================
  // 3. MINT ALL 4 ZiGUtilityToken TYPES
  // ========================================
  console.log("\n📊 3. Minting all 4 ZiGUtilityToken types...");
  
  const utilityTypes = [1, 2, 3, 4]; // All 4 utility token types
  const utilityAmount = ethers.parseUnits("1000", 18);
  
  for (const tokenType of utilityTypes) {
    try {
      const utilityMintTx = await ZiGUtilityToken.mint(
        userAddress, 
        tokenType, 
        utilityAmount, 
        "0x" // No additional data
      );
      await utilityMintTx.wait();
      console.log(`✅ Minted utility token type ${tokenType} to user`);
      
      const balance = await ZiGUtilityToken.balanceOf(userAddress, tokenType);
      console.log(`📊 User utility token type ${tokenType} balance: ${ethers.formatUnits(balance, 18)}`);
    } catch (error) {
      console.log(`❌ Failed to mint utility token type ${tokenType}:`, error.message);
    }
  }

  // ========================================
  // 4. MINT OTHER TOKENS
  // ========================================
  console.log("\n📊 4. Minting other tokens...");
  
  // Governance Token
  try {
    const govMintTx = await ZiGGovernanceToken.mint(userAddress, ethers.parseUnits("1000", 18));
    await govMintTx.wait();
    console.log("✅ Minted governance tokens to user");
    
    const govBalance = await ZiGGovernanceToken.balanceOf(userAddress);
    console.log(`📊 User governance token balance: ${ethers.formatUnits(govBalance, 18)}`);
  } catch (error) {
    console.log("❌ Failed to mint governance tokens:", error.message);
  }
  
  // Meme Token
  try {
    const memeTx = await ZiGMemeToken.createMeme(ethers.parseUnits("100", 18), "0xabcdef1234567890");
    await memeTx.wait();
    console.log("✅ Created meme token for user");
  } catch (error) {
    console.log("❌ Failed to create meme token:", error.message);
  }
  
  // GameFi Token
  try {
    const scoreTx = await ZiGGameFiToken.updatePlayerScore(userAddress, 1000);
    await scoreTx.wait();
    console.log("✅ Updated player score for user");
  } catch (error) {
    console.log("❌ Failed to update player score:", error.message);
  }
  
  // RWA Token
  try {
    const rwaTx = await ZiGRWAToken.tokenizeAsset(
      userAddress, "Real Estate", "Harare, Zimbabwe", 
      ethers.parseUnits("100000", 18), "0x1234567890abcdef"
    );
    await rwaTx.wait();
    console.log("✅ Tokenized real-world asset for user");
  } catch (error) {
    console.log("❌ Failed to tokenize RWA:", error.message);
  }
  
  // ZiG NFT
  console.log("\n🎨 Minting ZiG NFT with image support...");
  try {
    const nftMetadata = {
      name: "ZiG Cultural Heritage NFT",
      description: "A unique cultural heritage NFT representing African traditions and the ZiG ecosystem",
      imageURI: "https://via.placeholder.com/500x500/FFD700/FFFFFF?text=ZiG+Cultural",
      metadataURI: "https://ipfs.io/ipfs/QmExampleMetadata",
      attributes: ["Cultural", "Heritage", "African", "ZiG"],
      rarity: 3,
      isLimited: true,
      category: "Cultural"
    };

    const nftMintTx = await ZiGNFT.nftmint(
      userAddress,
      nftMetadata.metadataURI,
      nftMetadata.imageURI,
      nftMetadata.name,
      nftMetadata.description,
      nftMetadata.attributes,
      nftMetadata.rarity,
      nftMetadata.isLimited,
      nftMetadata.category
    );
    await nftMintTx.wait();
    console.log("✅ ZiG NFT minted with image support");
  } catch (error) {
    console.log("⚠️  ZiG NFT minting failed:", error.message);
  }

  // ========================================
  // 5. SETUP SOULBOUND & DAO ACCESS
  // ========================================
  console.log("\n📊 5. Setting up soulbound tokens and DAO access...");
  
  // Soulbound Token
  try {
    const issueSoulTx = await ZiGSoulboundToken.issueSoul(userAddress, "User onboarding proof", 1);
    await issueSoulTx.wait();
    console.log("✅ Issued soulbound token to user");
  } catch (error) {
    console.log("❌ Failed to issue soulbound token:", error.message);
  }
  
  // DAO Access
  try {
    const setVotingPowerTx = await ReparationsDAO.setVotingPower(userAddress, ethers.parseUnits("1000", 18));
    await setVotingPowerTx.wait();
    console.log("✅ Set voting power for user in DAO");
    
    const verifyAfricanTx = await ReparationsDAO.verifyAfrican(userAddress);
    await verifyAfricanTx.wait();
    console.log("✅ Verified user as African in DAO");
  } catch (error) {
    console.log("❌ Failed to setup DAO access:", error.message);
  }

  // ========================================
  // 6. FINAL BALANCE CHECK
  // ========================================
  console.log("\n📊 6. Final balance check...");
  
  const finalZiGBalance = await ZiG.balanceOf(userAddress);
  const finalZiGTBalance = await ZiGT.balanceOf(userAddress);
  const finalGovBalance = await ZiGGovernanceToken.balanceOf(userAddress);
  
  console.log("🎉 User Onboarding Complete!");
  console.log("=============================");
  console.log(`📊 Final ZiG balance: ${ethers.formatUnits(finalZiGBalance, 18)} ZiG`);
  console.log(`📊 Final ZiGT balance: ${ethers.formatUnits(finalZiGTBalance, 18)} ZiGT`);
  console.log(`📊 Final Governance balance: ${ethers.formatUnits(finalGovBalance, 18)} GOV`);
  console.log("✅ User now has access to:");
  console.log("   • ZiG tokens for transactions");
  console.log("   • ZiGT stable tokens");
  console.log("   • All 4 utility token types");
  console.log("   • Governance tokens for DAO voting");
  console.log("   • Meme, GameFi, and RWA tokens");
  console.log("   • Soulbound identity");
  console.log("   • DAO voting rights");
  console.log("\n🚀 User is ready to participate in the ZiG ecosystem!");
}

main().catch((error) => {
  console.error("❌ User onboarding failed:", error);
  process.exit(1);
}); 