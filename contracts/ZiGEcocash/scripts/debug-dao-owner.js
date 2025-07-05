const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("🔍 Debugging DAO Owner Issue");
    console.log("Deployer address:", deployer.address);
    
    // Check if we have the deployed DAO address
    const fs = require('fs');
    let daoAddress = null;
    
    try {
        if (fs.existsSync('deployment-polygon-zkevm.json')) {
            const deploymentInfo = JSON.parse(fs.readFileSync('deployment-polygon-zkevm.json', 'utf8'));
            daoAddress = deploymentInfo.dao;
            console.log("📋 Found DAO address from deployment file:", daoAddress);
        }
    } catch (error) {
        console.log("❌ No deployment file found");
    }
    
    if (!daoAddress) {
        console.log("❌ No DAO address found. Please deploy first.");
        return;
    }
    
    // Get the DAO contract
    const dao = await ethers.getContractAt("ReparationsDAO", daoAddress);
    
    // Check the owner
    try {
        const owner = await dao.owner();
        console.log("👑 DAO Owner:", owner);
        console.log("🔍 Deployer is owner:", owner.toLowerCase() === deployer.address.toLowerCase());
        
        // Check if deployer is verified African
        const isVerified = await dao.africanVerified(deployer.address);
        console.log("🌍 Deployer is verified African:", isVerified);
        
        // Check deployer's voting power
        const votingPower = await dao.votingPower(deployer.address);
        console.log("🗳️ Deployer voting power:", votingPower.toString());
        
    } catch (error) {
        console.log("❌ Error checking DAO owner:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Debug failed:", error);
        process.exit(1);
    }); 