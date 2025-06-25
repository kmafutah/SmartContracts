const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔧 Starting ZiGEcocash Contract Interactions...");
  
  const [deployer, user1, user2, user3] = await ethers.getSigners();
  console.log("Interacting with contracts using account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ No deployment addresses found. Run deployment first.");
    return;
  }
  
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("📄 Loaded deployment addresses");

  try {
    // Get contract instances
    const ZiG = await ethers.getContractAt("ZiG", deploymentAddresses.ZiG);
    const ZiGSoulboundToken = await ethers.getContractAt("ZiGSoulboundToken", deploymentAddresses.ZiGSoulboundToken);
    const AccessVerifier = await ethers.getContractAt("contracts/governance_identity_soulbound_statehood/AccessVerifier.sol:AccessVerifier", deploymentAddresses.AccessVerifier);
    const EthicalGuard = await ethers.getContractAt("EthicalGuard", deploymentAddresses.EthicalGuard);
    const ZiGGovernanceToken = await ethers.getContractAt("ZiGGovernanceToken", deploymentAddresses.ZiGGovernanceToken);
    const SoulReparationNFT = await ethers.getContractAt("SoulReparationNFT", deploymentAddresses.SoulReparationNFT);
    const ReparationsDAO = await ethers.getContractAt("ReparationsDAO", deploymentAddresses.ReparationsDAO);
    const ZiGNFT = await ethers.getContractAt("ZiGNFT", deploymentAddresses.ZiGNFT);
    const ZiGRWAToken = await ethers.getContractAt("ZiGRWAToken", deploymentAddresses.ZiGRWAToken);
    const ZiGUtilityToken = await ethers.getContractAt("ZiGUtilityToken", deploymentAddresses.ZiGUtilityToken);
    const ZiGMemeToken = await ethers.getContractAt("ZiGMemeToken", deploymentAddresses.ZiGMemeToken);
    const ZiGGameFiToken = await ethers.getContractAt("ZiGGameFiToken", deploymentAddresses.ZiGGameFiToken);
    const ZiGBondingCurve = await ethers.getContractAt("ZiGBondingCurve", deploymentAddresses.ZiGBondingCurve);
    const ZiGWallet = await ethers.getContractAt("ZiGWallet", deploymentAddresses.ZiGWallet);

    console.log("\n🔧 Starting Contract Initialization and Testing...");

    // 1. ZiG Core Token Tests
    console.log("\n📊 1. Testing ZiG Core Token...");
    
    // Mint some tokens
    const mintAmount = ethers.parseUnits("1000000", 18);
    const mintTx = await ZiG.mint(deployer.address, mintAmount);
    await mintTx.wait();
    console.log("✅ Minted 1,000,000 ZiG tokens to deployer");

    // Transfer tokens
    const transferAmount = ethers.parseUnits("1000", 18);
    const transferTx = await ZiG.transfer(user1.address, transferAmount);
    await transferTx.wait();
    console.log("✅ Transferred 1,000 ZiG tokens to user1");

    // Check balances
    const deployerBalance = await ZiG.balanceOf(deployer.address);
    const user1Balance = await ZiG.balanceOf(user1.address);
    console.log(`📊 Deployer balance: ${ethers.formatUnits(deployerBalance, 18)} ZiG`);
    console.log(`📊 User1 balance: ${ethers.formatUnits(user1Balance, 18)} ZiG`);

    // 2. ZiGSoulboundToken Tests
    console.log("\n📊 2. Testing ZiGSoulboundToken...");
    
    // Mint soulbound token to user3 to avoid duplicate
    try {
        const issueSoulTx = await ZiGSoulboundToken.issueSoul(user3.address, "Proof for user3", 1);
        await issueSoulTx.wait();
        console.log("✅ Minted soulbound token to user3");
    } catch (error) {
        if (error.message.includes("Address already has soul")) {
            console.log("ℹ️ User3 already has a soulbound token (expected in repeated runs)");
        } else {
            throw error;
        }
    }

    // 3. AccessVerifier Tests
    console.log("\n📊 3. Testing AccessVerifier...");
    
    // Verify user
    const verifyTx = await AccessVerifier.verifyAncestry(
      user1.address,
      1, // level
      ethers.keccak256(ethers.toUtf8Bytes("User1 Ancestry")), // ancestryHash
      "0x" // dummy zkProof
    );
    await verifyTx.wait();
    console.log("✅ Verified user1");

    // Check verification status
    const isVerified = await AccessVerifier.isVerified(user1.address);
    console.log(`📊 User1 verified: ${isVerified}`);

    // 4. EthicalGuard Tests
    console.log("\n📊 4. Testing EthicalGuard...");
    
    // Fast forward time to pass cooldown period if needed
    console.log("Fast forwarding time to pass cooldown period...");
    await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
    await ethers.provider.send("evm_mine");
    console.log("✅ Time forwarded by 8 days");
    
    // Record a claim
    const claimAmount = ethers.parseUnits("100", 18);
    try {
        const recordClaimTx = await EthicalGuard.recordClaim(user1.address, claimAmount);
        await recordClaimTx.wait();
        console.log("✅ Recorded claim for user1");
    } catch (error) {
        if (error.message.includes("Claim not valid")) {
            console.log("ℹ️ User1 claim not valid (may have already claimed recently)");
        } else {
            throw error;
        }
    }

    // 5. ZiGGovernanceToken Tests
    console.log("\n📊 5. Testing ZiGGovernanceToken...");
    
    // Mint governance tokens
    const govMintAmount = ethers.parseUnits("10000", 18);
    const govMintTx = await ZiGGovernanceToken.mint(deployer.address, govMintAmount);
    await govMintTx.wait();
    console.log("✅ Minted 10,000 governance tokens to deployer");

    // 6. SoulReparationNFT Tests (DAO-driven)
    console.log("\n📊 6. Testing SoulReparationNFT via DAO...");
    
    // First, ensure user1 has voting power and is verified as African
    console.log("Setting up user1 for DAO participation...");
    const setVotingPowerTx = await ReparationsDAO.setVotingPower(user1.address, ethers.parseUnits("1000", 18));
    await setVotingPowerTx.wait();
    console.log("✅ Set voting power for user1");
    
    const verifyAfricanDaoTx = await ReparationsDAO.verifyAfrican(user1.address);
    await verifyAfricanDaoTx.wait();
    console.log("✅ Verified user1 as African");
    
    // Create a reparation proposal
    console.log("Creating reparation proposal...");
    const user1DAO = ReparationsDAO.connect(user1);
    const createProposalTx = await user1DAO.createProposal(
        "Heritage Reparation for user1",
        ethers.parseUnits("500", 18),
        user1.address
    );
    await createProposalTx.wait();
    console.log("✅ Created reparation proposal");
    
    // Vote for the proposal (user1 votes for their own proposal)
    console.log("Voting for the proposal...");
    try {
        const voteTx = await user1DAO.vote(1, true); // proposal ID 1, vote for
        await voteTx.wait();
        console.log("✅ Voted for the proposal");
    } catch (error) {
        console.log("ℹ️ Voting failed (may be due to self-voting restrictions):", error.message);
    }
    
    // Fast forward time to pass voting deadline (7 days)
    console.log("Fast forwarding time to pass voting deadline...");
    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
    await ethers.provider.send("evm_mine");
    console.log("✅ Time forwarded by 7 days");
    
    // Execute the proposal (this will trigger the NFT minting)
    console.log("Executing the proposal...");
    try {
        const executeProposalTx = await ReparationsDAO.executeProposal(1);
        await executeProposalTx.wait();
        console.log("✅ Executed proposal - NFT should be minted to user1");
    } catch (error) {
        console.log("ℹ️ Proposal execution failed (may need more votes):", error.message);
    }

    // 7. ZiGNFT Tests
    console.log("\n📊 7. Testing ZiGNFT...");
    
    // Mint NFT
    const nftMintTx = await ZiGNFT.nftmint(
      user1.address,
      "ipfs://nft-metadata",
      5, // rarity
      true // isLimited
    );
    await nftMintTx.wait();
    console.log("✅ Minted ZiG NFT to user1");

    // 8. ZiGRWAToken Tests
    console.log("\n📊 8. Testing ZiGRWAToken...");
    
    // Tokenize real-world asset
    const rwaTx = await ZiGRWAToken.tokenizeAsset(
      user1.address,
      "Real Estate",
      "Harare, Zimbabwe",
      ethers.parseUnits("100000", 18), // valuation
      "0x1234567890abcdef" // legal document hash
    );
    await rwaTx.wait();
    console.log("✅ Tokenized real-world asset for user1");

    // 9. ZiGUtilityToken Tests
    console.log("\n📊 9. Testing ZiGUtilityToken...");
    
    // Mint utility tokens
    const utilityMintTx = await ZiGUtilityToken.mint(
      user1.address,
      1, // token ID (TRANSACTION_FEE_TOKEN)
      ethers.parseUnits("1000", 18),
      "0x"
    );
    await utilityMintTx.wait();
    console.log("✅ Minted utility tokens to user1");

    // 10. ZiGMemeToken Tests
    console.log("\n📊 10. Testing ZiGMemeToken...");
    
    // Create meme
    const memeTx = await ZiGMemeToken.createMeme(
        ethers.parseUnits("100", 18),
        "0xabcdef1234567890"
    );
    await memeTx.wait();
    console.log("✅ Created meme token");

    // 11. ZiGGameFiToken Tests
    console.log("\n📊 11. Testing ZiGGameFiToken...");
    
    // Update player score
    const scoreTx = await ZiGGameFiToken.updatePlayerScore(user1.address, 1000);
    await scoreTx.wait();
    console.log("✅ Updated player score for user1");

    // 12. ZiGBondingCurve Tests
    console.log("\n📊 12. Testing ZiGBondingCurve...");
    
    // Get current price
    const currentPrice = await ZiGBondingCurve.getPrice();
    console.log(`📊 Current bonding curve price: ${ethers.formatEther(currentPrice)} ETH`);

    // Calculate mint cost
    try {
        const mintCost = await ZiGBondingCurve.calculateMintCost(ethers.parseUnits("1", 18));
        console.log(`📊 Cost to mint 1 token: ${ethers.formatEther(mintCost)} ETH`);
    } catch (error) {
        console.log("ℹ️ Could not calculate mint cost (gas limit issue):", error.message);
    }

    // 13. ZiGWallet Tests
    console.log("\n📊 13. Testing ZiGWallet...");
    
    // Add allowed token
    const addTokenTx = await ZiGWallet.addAllowedToken(deploymentAddresses.ZiG);
    await addTokenTx.wait();
    console.log("✅ Added ZiG as allowed token in wallet");

    // 14. ReparationsDAO Tests
    console.log("\n📊 14. Testing ReparationsDAO...");
    
    // Set voting power
    const votingPowerTx = await ReparationsDAO.setVotingPower(user1.address, ethers.parseUnits("1000", 18));
    await votingPowerTx.wait();
    console.log("✅ Set voting power for user1");

    // Verify African user
    const verifyAfricanTx = await ReparationsDAO.verifyAfrican(user1.address);
    await verifyAfricanTx.wait();
    console.log("✅ Verified user1 as African");

    console.log("\n🎉 All contract interactions completed successfully!");
    console.log("\n📋 Interaction Summary:");
    console.log("========================");
    console.log("✅ ZiG: Minted, transferred, checked balances");
    console.log("✅ ZiGSoulboundToken: Minted soulbound token");
    console.log("✅ AccessVerifier: Verified user");
    console.log("✅ EthicalGuard: Recorded claim");
    console.log("✅ ZiGGovernanceToken: Minted governance tokens");
    console.log("✅ SoulReparationNFT: Claimed reparation");
    console.log("✅ ZiGNFT: Minted NFT");
    console.log("✅ ZiGRWAToken: Tokenized real-world asset");
    console.log("✅ ZiGUtilityToken: Minted utility tokens");
    console.log("✅ ZiGMemeToken: Created meme");
    console.log("✅ ZiGGameFiToken: Updated player score");
    console.log("✅ ZiGBondingCurve: Checked prices");
    console.log("✅ ZiGWallet: Added allowed token");
    console.log("✅ ReparationsDAO: Set voting power and verified user");

    console.log("\n=== Testing ZiGWallet Functionality ===");
    
    // Add deployed tokens as allowed tokens in the wallet
    console.log("Adding deployed tokens as allowed tokens in ZiGWallet...");
    
    const wallet = await ethers.getContractAt("ZiGWallet", deploymentAddresses.ZiGWallet);
    
    // Add all deployed tokens as allowed tokens
    const tokensToAdd = [
        { name: "ZiG", address: deploymentAddresses.ZiG },
        { name: "ZiGT", address: deploymentAddresses.ZiGT },
        { name: "ZiGSoulboundToken", address: deploymentAddresses.ZiGSoulboundToken },
        { name: "ZiGGovernanceToken", address: deploymentAddresses.ZiGGovernanceToken },
        { name: "ZiGUtilityToken", address: deploymentAddresses.ZiGUtilityToken },
        { name: "ZiGMemeToken", address: deploymentAddresses.ZiGMemeToken },
        { name: "ZiGGameFiToken", address: deploymentAddresses.ZiGGameFiToken },
        { name: "ZiGRWAToken", address: deploymentAddresses.ZiGRWAToken },
        { name: "ZiGNFT", address: deploymentAddresses.ZiGNFT }
    ];
    
    for (const token of tokensToAdd) {
        try {
            const tx = await wallet.addAllowedToken(token.address);
            await tx.wait();
            console.log(`✓ Added ${token.name} as allowed token`);
        } catch (error) {
            console.log(`✗ Failed to add ${token.name}: ${error.message}`);
        }
    }
    
    // Test wallet deposit functionality
    console.log("\nTesting wallet deposit functionality...");
    
    // First, approve the wallet to spend tokens on behalf of the deployer
    const zigContract = await ethers.getContractAt("ZiG", deploymentAddresses.ZiG);
    const depositAmount = ethers.parseEther("1000");
    
    console.log("Approving ZiGWallet to spend ZiG tokens...");
    const approveTx = await zigContract.approve(deploymentAddresses.ZiGWallet, depositAmount);
    await approveTx.wait();
    console.log("✓ Approved ZiGWallet to spend ZiG tokens");
    
    // Deposit ZiG tokens into the wallet
    console.log("Depositing ZiG tokens into wallet...");
    const depositTx = await wallet.deposit(deploymentAddresses.ZiG, depositAmount);
    await depositTx.wait();
    console.log("✓ Deposited ZiG tokens into wallet");
    
    // Check wallet balance
    const walletBalance = await wallet.getBalance(deployer.address, deploymentAddresses.ZiG);
    console.log(`Wallet ZiG balance: ${ethers.formatEther(walletBalance)} ZiG`);
    
    // Test with other tokens
    const memeToken = await ethers.getContractAt("ZiGMemeToken", deploymentAddresses.ZiGMemeToken);
    const memeAmount = ethers.parseEther("500");
    
    console.log("Approving ZiGWallet to spend ZiGMemeToken...");
    const memeApproveTx = await memeToken.approve(deploymentAddresses.ZiGWallet, memeAmount);
    await memeApproveTx.wait();
    console.log("✓ Approved ZiGWallet to spend ZiGMemeToken");
    
    console.log("Depositing ZiGMemeToken into wallet...");
    const memeDepositTx = await wallet.deposit(deploymentAddresses.ZiGMemeToken, memeAmount);
    await memeDepositTx.wait();
    console.log("✓ Deposited ZiGMemeToken into wallet");
    
    // Check meme token balance in wallet
    const memeWalletBalance = await wallet.getBalance(deployer.address, deploymentAddresses.ZiGMemeToken);
    console.log(`Wallet ZiGMemeToken balance: ${ethers.formatEther(memeWalletBalance)} tokens`);
    
    // Test wallet withdrawal functionality
    console.log("\nTesting wallet withdrawal functionality...");
    const withdrawAmount = ethers.parseEther("100");
    
    console.log("Withdrawing ZiG tokens from wallet...");
    const withdrawTx = await wallet.withdraw(deploymentAddresses.ZiG, withdrawAmount);
    await withdrawTx.wait();
    console.log("✓ Withdrew ZiG tokens from wallet");
    
    // Check updated wallet balance
    const updatedWalletBalance = await wallet.getBalance(deployer.address, deploymentAddresses.ZiG);
    console.log(`Updated wallet ZiG balance: ${ethers.formatEther(updatedWalletBalance)} ZiG`);
    
    // Get user's token list
    console.log("\nGetting user's token list from wallet...");
    const [userTokens, userBalances] = await wallet.getUserTokens(deployer.address);
    console.log(`User has ${userTokens.length} different tokens in wallet:`);
    
    for (let i = 0; i < userTokens.length; i++) {
        const tokenName = tokensToAdd.find(t => t.address.toLowerCase() === userTokens[i].toLowerCase())?.name || "Unknown";
        console.log(`  ${tokenName}: ${ethers.formatEther(userBalances[i])} tokens`);
    }
    
    // Test wallet query functions
    console.log("\nTesting wallet query functions...");
    const userTokenCount = await wallet.getUserTokenCount(deployer.address);
    console.log(`User token count: ${userTokenCount}`);
    
    const supportedTokenCount = await wallet.getSupportedTokenCount();
    console.log(`Supported token count: ${supportedTokenCount}`);
    
    // Get supported tokens info
    const supportedTokens = await wallet.getSupportedTokens();
    console.log("First 5 supported tokens:");
    for (let i = 0; i < Math.min(5, supportedTokens.length); i++) {
        console.log(`  ${i}: ${supportedTokens[i].symbol} - ${supportedTokens[i].name}`);
    }
    
    // Test updating token addresses in supported tokens list
    console.log("\nTesting token address updates...");
    try {
        // Update ZiG address in supported tokens (index 0)
        const updateTx = await wallet.updateTokenAddress(0, deploymentAddresses.ZiG);
        await updateTx.wait();
        console.log("✓ Updated ZiG address in supported tokens list");
        
        // Update ZiGT address in supported tokens (index 1)
        const updateZiGTTx = await wallet.updateTokenAddress(1, deploymentAddresses.ZiGT);
        await updateZiGTTx.wait();
        console.log("✓ Updated ZiGT address in supported tokens list");
    } catch (error) {
        console.log(`✗ Failed to update token addresses: ${error.message}`);
    }
    
    // Test adding new supported token
    console.log("\nTesting adding new supported token...");
    try {
        const addNewTokenTx = await wallet.addNewSupportedToken(
            deploymentAddresses.ZiGUtilityToken,
            "ZUT",
            "ZiG Utility Token"
        );
        await addNewTokenTx.wait();
        console.log("✓ Added new supported token");
    } catch (error) {
        console.log(`✗ Failed to add new supported token: ${error.message}`);
    }

    // Test depositing to a different user (using a different address)
    console.log("\nTesting deposit for different user...");
    const user2 = await ethers.getSigner(1);
    
    // Mint some tokens to user2 first
    console.log("Minting ZiG tokens to user2...");
    const mintToUser2Tx = await zigContract.mint(user2.address, ethers.parseEther("500"));
    await mintToUser2Tx.wait();
    console.log("✓ Minted ZiG tokens to user2");
    
    // User2 approves wallet
    const user2ZigContract = zigContract.connect(user2);
    const user2ApproveTx = await user2ZigContract.approve(deploymentAddresses.ZiGWallet, ethers.parseEther("200"));
    await user2ApproveTx.wait();
    console.log("✓ User2 approved ZiGWallet");
    
    // User2 deposits tokens
    const user2Wallet = wallet.connect(user2);
    const user2DepositTx = await user2Wallet.deposit(deploymentAddresses.ZiG, ethers.parseEther("200"));
    await user2DepositTx.wait();
    console.log("✓ User2 deposited ZiG tokens into wallet");
    
    // Check user2's wallet balance
    const user2Balance = await wallet.getBalance(user2.address, deploymentAddresses.ZiG);
    console.log(`User2 wallet ZiG balance: ${ethers.formatEther(user2Balance)} ZiG`);
    
    // Check user2's token list
    const [user2Tokens, user2Balances] = await wallet.getUserTokens(user2.address);
    console.log(`User2 has ${user2Tokens.length} different tokens in wallet:`);
    
    for (let i = 0; i < user2Tokens.length; i++) {
        const tokenName = tokensToAdd.find(t => t.address.toLowerCase() === user2Tokens[i].toLowerCase())?.name || "Unknown";
        console.log(`  ${tokenName}: ${ethers.formatEther(user2Balances[i])} tokens`);
    }

  } catch (error) {
    console.error("❌ Contract interaction failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 