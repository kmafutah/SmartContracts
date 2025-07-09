const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🚀 Starting User Onboarding Script...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Manual user account - CHANGE THIS TO THE TARGET USER ADDRESS
  const userAddress = "0xE0282D77cF60BA484e13d24fd5686A6618F09A3B";//"0x9b13A4ddEd17053CAE4eC3B846eb890277D9972a";
  //"0xc6300129a8E0a2401d8e1A31b22545b4623e4c57";//"0x9b13A4ddEd17053CAE4eC3B846eb890277D9972a";//"0xa2f73aedbdba88f3092c1b4ad7eddf80c8f0e2b6";//"0x85DB3E1502253fEc636bf43728416C100A171fe4";//"0x4cbb965c79f27f0102d4f6662721390bea64e372";//"0x9b13A4ddEd17053CAE4eC3B846eb890277D9972a";//"0x85DB3E1502253fEc636bf43728416C100A171fe4";//"0xf8443c02e97adeb2d4dbfbd8100ff2616c073a49";//"0x41ed0fa1799bbb17f3907eada8f1810e7687d139"; // CHANGE THIS!
  
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
  // 1B. ENSURE BTCUSD PRICE IS VALID IN ORACLE
  // ========================================
  console.log("\n🔎 Ensuring BTCUSD price is valid in oracle...");
  try {
    const ZiGOracleHub = await ethers.getContractAt("ZiGOracleHub", deploymentAddresses.ZiGOracleHub);
    const btcData = await ZiGOracleHub.cryptoPrices("BTCUSD");
    const priceBigInt = btcData.price;
    const isValid = btcData.isValid;
    const timestamp = Number(btcData.timestamp);
    const age = Math.floor((Date.now() / 1000) - timestamp);
    const isStale = age > 3600;
    if (!isValid || isStale || priceBigInt === 0n || priceBigInt === 0) {
      const btcPrice = ethers.parseUnits("108000", 18); // You can update this to a live price if needed
      const tx = await ZiGOracleHub.updateCryptoPrice("BTCUSD", btcPrice);
      await tx.wait();
      console.log("✅ BTCUSD price updated in oracle");
    } else {
      console.log("✅ BTCUSD price is already valid and fresh");
    }
  } catch (error) {
    console.error("❌ Failed to check/update BTCUSD price:", error.message);
    return;
  }

  // ========================================
  // 2. MINT ZiGT VIA VAULT (USING DEPLOYER)
  // ========================================
  console.log("\n📊 2. Setting up ZiGT minting via Vault...");
  
  try {
    // Check if ZiG is already supported in the Vault
    const isZiGSupported = await Vault.isSupportedToken(deploymentAddresses.ZiG);
    
    if (!isZiGSupported) {
      console.log("✅ Adding ZiG as supported token in Vault...");
      const addTokenTx = await Vault.addSupportedToken(deploymentAddresses.ZiG, 15000); // 150% collateral ratio
      await addTokenTx.wait();
    } else {
      console.log("✅ ZiG is already supported in Vault");
    }
    
    // Deployer needs to approve Vault to spend ZiG
    console.log("✅ Approving Vault to spend ZiG tokens...");
    const approveTx = await ZiG.approve(await Vault.getAddress(), ziGForZiGT);
    await approveTx.wait();
    
    console.log("✅ Depositing ZiG as collateral...");
    const depositTx = await Vault.depositCollateral(deploymentAddresses.ZiG, ziGForZiGT, false); // false = for ZiGT
    await depositTx.wait();
    
    console.log("✅ Minting ZiGT...");
    const mintZiGTTx = await Vault.mintZiGT(ethers.parseUnits("500", 18));
    await mintZiGTTx.wait();
    
    // Transfer the minted ZiGT to the user
    console.log("✅ Transferring ZiGT to user...");
    const transferZiGTTx = await ZiGT.transfer(userAddress, ethers.parseUnits("500", 18));
    await transferZiGTTx.wait();
    
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

  // RegionalStablecoins Setup
  console.log("\n🌍 Setting up RegionalStablecoins...");
  try {
    const RegionalStablecoins = await ethers.getContractAt("RegionalStablecoins", deploymentAddresses.RegionalStablecoins);
    
    // Check total regions available
    const totalRegions = await RegionalStablecoins.totalRegions();
    console.log(`📊 Total regions available: ${totalRegions.toString()}`);
    
    // Check if contract is paused
    const isPaused = await RegionalStablecoins.paused();
    if (isPaused) {
      console.log("⚠️  RegionalStablecoins contract is paused");
    } else {
      console.log("✅ RegionalStablecoins contract is active");
    }
    
    // Get info about Southern Africa region (region 5) which includes Zimbabwe
    const southernAfricaInfo = await RegionalStablecoins.getRegionalStablecoin(5);
    console.log(`📊 Southern Africa Stablecoin: ${southernAfricaInfo[0]} (${southernAfricaInfo[1]})`);
    console.log(`   Total Supply: ${ethers.formatUnits(southernAfricaInfo[2], 18)}`);
    console.log(`   Active: ${southernAfricaInfo[3]}`);
    console.log(`   Weights: ${southernAfricaInfo[4]}% Crypto, ${southernAfricaInfo[5]}% Metal, ${southernAfricaInfo[6]}% Fiat`);
    
    // Mint some regional stablecoins for the user (Southern Africa region)
    try {
      const mintAmount = ethers.parseUnits("1000", 18);
      const mintTx = await RegionalStablecoins.mint(5, userAddress, mintAmount); // 5 = Southern Africa
      await mintTx.wait();
      console.log("✅ Minted Southern Africa stablecoins to user");
      
      const userBalance = await RegionalStablecoins.getBalance(5, userAddress);
      console.log(`📊 User Southern Africa stablecoin balance: ${ethers.formatUnits(userBalance, 18)}`);
    } catch (error) {
      console.log("⚠️  Failed to mint regional stablecoins:", error.message);
    }
    
  } catch (error) {
    console.log("⚠️  RegionalStablecoins setup failed:", error.message);
  }
  
  // ZiG NFT
  console.log("\n🎨 Minting ZiG NFT with image support...");
  try {
    // Check if deployer is the owner of ZiGNFT
    const nftOwner = await ZiGNFT.owner();
    console.log(`ZiGNFT owner: ${nftOwner}`);
    console.log(`Deployer address: ${deployer.address}`);
    
    if (nftOwner.toLowerCase() === deployer.address.toLowerCase()) {
      const nftMetadata = {
        name: "ZiG Cultural Heritage NFT",
        description: "A unique cultural heritage NFT representing African traditions and the ZiG ecosystem",
        imageURI: "https://bafybeigbdw3462m4hho6bgelosgn6f5dmtu3cdczrekopfubxetf6qzrza.ipfs.dweb.link?filename=ZNFT.png?text=ZiG+Cultural",
        metadataURI: "https://bafybeifupjbqub7yd6a5r4ns74nh3yo2z7yqvrn5to7cxnak62whujzck4.ipfs.dweb.link",
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
    } else {
      console.log("⚠️  Deployer is not the owner of ZiGNFT contract, skipping NFT minting");
    }
  } catch (error) {
    console.log("⚠️  ZiG NFT minting failed:", error.message);
  }

  // ========================================
  // 5. SETUP SOULBOUND & DAO ACCESS
  // ========================================
  console.log("\n📊 5. Setting up soulbound tokens and DAO access...");
  
  // Soulbound Token
  try {
    // Check if user already has a soul
    const userTokenId = await ZiGSoulboundToken.ownerToTokenId(userAddress);
    
    if (userTokenId === 0n) {
      const issueSoulTx = await ZiGSoulboundToken.issueSoul(userAddress, "African Heritage - Southern Africa", 3);
      await issueSoulTx.wait();
      console.log("✅ Issued soulbound token to user");
    } else {
      console.log("✅ User already has soulbound token");
    }
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
  console.log("   • Regional stablecoins (ZiG, ZiGT)");
  console.log("   • Soulbound identity");
  console.log("   • DAO voting rights");
  console.log("\n🚀 User is ready to participate in the ZiG ecosystem!");
}

main().catch((error) => {
  console.error("❌ User onboarding failed:", error);
  process.exit(1);
}); 
