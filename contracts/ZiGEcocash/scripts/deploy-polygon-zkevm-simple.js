const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("🚀 Deploying ZiG Ecosystem to Polygon zkEVM (Simplified)...");
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Deployer balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

    // Deploy ZiGUtilityToken first
    console.log("\n📦 Deploying ZiGUtilityToken...");
    const ZiGUtilityToken = await ethers.getContractFactory("ZiGUtilityToken");
    const utilityToken = await ZiGUtilityToken.deploy();
    await utilityToken.waitForDeployment();
    console.log("✅ ZiGUtilityToken deployed to:", await utilityToken.getAddress());

    // Deploy ZiGOracleHub
    console.log("\n🔮 Deploying ZiGOracleHub...");
    const ZiGOracleHub = await ethers.getContractFactory("ZiGOracleHub");
    const oracleHub = await ZiGOracleHub.deploy(deployer.address);
    await oracleHub.waitForDeployment();
    console.log("✅ ZiGOracleHub deployed to:", await oracleHub.getAddress());

    // Deploy ReparationsDAO with fuel system
    console.log("\n🏛️ Deploying ReparationsDAO with fuel system...");
    const ReparationsDAO = await ethers.getContractFactory("ReparationsDAO");
    const dao = await ReparationsDAO.deploy(
        deployer.address, // initialOwner
        ethers.ZeroAddress, // governanceToken (placeholder)
        ethers.ZeroAddress, // ethicalGuard (placeholder)
        ethers.ZeroAddress, // reparationNFT (placeholder)
        await utilityToken.getAddress() // utilityToken
    );
    await dao.waitForDeployment();
    console.log("✅ ReparationsDAO deployed to:", await dao.getAddress());

    // Deploy RegionalStablecoins
    console.log("\n🌍 Deploying RegionalStablecoins...");
    const RegionalStablecoins = await ethers.getContractFactory("RegionalStablecoins");
    const regionalStablecoins = await RegionalStablecoins.deploy(
        await utilityToken.getAddress(), // utilityToken
        await oracleHub.getAddress(), // oracleHub
        await dao.getAddress() // dao
    );
    await regionalStablecoins.waitForDeployment();
    console.log("✅ RegionalStablecoins deployed to:", await regionalStablecoins.getAddress());

    // Mint initial utility tokens to deployer for testing
    console.log("\n💰 Minting initial utility tokens...");
    const mintTx = await utilityToken.mint(
        deployer.address,
        1, // TRANSACTION_FEE_TOKEN
        50000, // 50000 tokens for multiple operations
        "0x" // Empty bytes
    );
    await mintTx.wait();
    console.log("✅ Minted 50000 transaction fee tokens");

    const mintBonusTx = await utilityToken.mint(
        deployer.address,
        3, // GOVERNANCE_BONUS_TOKEN
        5000, // 5000 tokens for governance operations
        "0x" // Empty bytes
    );
    await mintBonusTx.wait();
    console.log("✅ Minted 5000 governance bonus tokens");

    // Approve RegionalStablecoins to burn utility tokens
    console.log("\n🔐 Approving RegionalStablecoins to burn utility tokens...");
    const approveRegionalTx = await utilityToken.setApprovalForAll(await regionalStablecoins.getAddress(), true);
    await approveRegionalTx.wait();
    console.log("✅ RegionalStablecoins approved to burn utility tokens");

    // Check fuel balances before operations
    console.log("\n⛽ Checking fuel balances...");
    const transactionFeeBalance = await utilityToken.balanceOf(deployer.address, 1);
    const governanceBonusBalance = await utilityToken.balanceOf(deployer.address, 3);
    console.log(`  Transaction Fee Tokens: ${transactionFeeBalance.toString()}`);
    console.log(`  Governance Bonus Tokens: ${governanceBonusBalance.toString()}`);

    // Test regional stablecoin minting
    console.log("\n🧪 Testing regional stablecoin minting...");
    const mintRegionalTx = await regionalStablecoins.mint(
        1, // NORTH_AFRICA
        deployer.address,
        ethers.parseEther("1000") // 1000 tokens
    );
    await mintRegionalTx.wait();
    console.log("✅ Minted 1000 North African Stablecoins");

    // Mint WEST_AFRICA tokens for remittance test
    console.log("\n🧪 Minting WEST_AFRICA tokens for remittance test...");
    const mintWestAfricaTx = await regionalStablecoins.mint(
        2, // WEST_AFRICA
        deployer.address,
        ethers.parseEther("500") // 500 tokens
    );
    await mintWestAfricaTx.wait();
    console.log("✅ Minted 500 West African Stablecoins");

    // Test regional stablecoin transfer
    console.log("\n🧪 Testing regional stablecoin transfer...");
    const transferTx = await regionalStablecoins.transfer(
        1, // NORTH_AFRICA
        deployer.address, // to self for testing
        ethers.parseEther("100") // 100 tokens
    );
    await transferTx.wait();
    console.log("✅ Transferred 100 North African Stablecoins");

    // Test remittance
    console.log("\n🧪 Testing remittance...");
    const remittanceTx = await regionalStablecoins.remittance(
        2, // WEST_AFRICA
        deployer.address, // to self for testing
        ethers.parseEther("50"), // 50 tokens
        "Test Recipient" // recipient name
    );
    await remittanceTx.wait();
    console.log("✅ Remittance test successful");

    // Check final fuel balances
    console.log("\n⛽ Final fuel balances:");
    const finalTransactionFeeBalance = await utilityToken.balanceOf(deployer.address, 1);
    const finalGovernanceBonusBalance = await utilityToken.balanceOf(deployer.address, 3);
    console.log(`  Transaction Fee Tokens: ${finalTransactionFeeBalance.toString()}`);
    console.log(`  Governance Bonus Tokens: ${finalGovernanceBonusBalance.toString()}`);
    console.log(`  Transaction Fee Tokens Burned: ${transactionFeeBalance - finalTransactionFeeBalance}`);
    console.log(`  Governance Bonus Tokens Burned: ${governanceBonusBalance - finalGovernanceBonusBalance}`);

    // Get regional stablecoin info
    console.log("\n📊 Regional Stablecoin Information:");
    for (let i = 1; i <= 6; i++) {
        const info = await regionalStablecoins.getRegionalStablecoin(i);
        console.log(`  Region ${i} (${info.symbol}): ${info.name}`);
        console.log(`    Composition: ${info.cryptoWeight}% Crypto, ${info.metalWeight}% Metal, ${info.fiatWeight}% Fiat`);
    }

    // Get fuel costs
    console.log("\n⛽ Fuel Costs:");
    const fuelCosts = await regionalStablecoins.getFuelCosts();
    console.log(`  Transfer: ${fuelCosts[0]} tokens`);
    console.log(`  Remittance: ${fuelCosts[1]} tokens`);
    console.log(`  Mint: ${fuelCosts[2]} tokens`);
    console.log(`  Burn: ${fuelCosts[3]} tokens`);

    console.log("\n🎉 Polygon zkEVM Deployment Complete!");
    console.log("\n📋 Deployment Summary:");
    console.log(`  ZiGUtilityToken: ${await utilityToken.getAddress()}`);
    console.log(`  ZiGOracleHub: ${await oracleHub.getAddress()}`);
    console.log(`  ReparationsDAO: ${await dao.getAddress()}`);
    console.log(`  RegionalStablecoins: ${await regionalStablecoins.getAddress()}`);

    // Save deployment addresses
    const deploymentInfo = {
        utilityToken: await utilityToken.getAddress(),
        oracleHub: await oracleHub.getAddress(),
        dao: await dao.getAddress(),
        regionalStablecoins: await regionalStablecoins.getAddress(),
        deployer: deployer.address,
        network: "polygon-zkevm",
        timestamp: new Date().toISOString()
    };

    const fs = require('fs');
    fs.writeFileSync(
        'deployment-polygon-zkevm-simple.json',
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\n💾 Deployment info saved to deployment-polygon-zkevm-simple.json");

    return {
        utilityToken: await utilityToken.getAddress(),
        oracleHub: await oracleHub.getAddress(),
        dao: await dao.getAddress(),
        regionalStablecoins: await regionalStablecoins.getAddress()
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }); 