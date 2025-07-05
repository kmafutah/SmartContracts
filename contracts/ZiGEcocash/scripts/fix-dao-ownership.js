const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("🔧 Fixing DAO Ownership Issue");
    console.log("Current deployer address:", deployer.address);
    
    // Read deployment info
    const fs = require('fs');
    const deploymentInfo = JSON.parse(fs.readFileSync('deployment-polygon-zkevm.json', 'utf8'));
    const daoAddress = deploymentInfo.dao;
    const originalDeployer = deploymentInfo.deployer;
    
    console.log("📋 DAO address:", daoAddress);
    console.log("📋 Original deployer (owner):", originalDeployer);
    console.log("📋 Current deployer:", deployer.address);
    
    // Get the DAO contract
    const dao = await ethers.getContractAt("ReparationsDAO", daoAddress);
    
    try {
        // Check current owner
        const currentOwner = await dao.owner();
        console.log("👑 Current DAO Owner:", currentOwner);
        
        // If the current deployer is not the owner, we need to transfer ownership
        if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.log("⚠️ Current deployer is not the owner. Need to transfer ownership.");
            
            // Check if we can transfer ownership (only owner can do this)
            console.log("🔄 Attempting to transfer ownership...");
            
            // First, let's try to call setVotingPower directly to see the exact error
            try {
                const setPowerTx = await dao.setVotingPower(deployer.address, ethers.parseEther("10000"));
                await setPowerTx.wait();
                console.log("✅ Successfully set voting power!");
            } catch (error) {
                console.log("❌ Failed to set voting power:", error.message);
                
                // Try to transfer ownership if we have the private key of the original owner
                console.log("🔄 Attempting to transfer ownership...");
                try {
                    const transferTx = await dao.transferOwnership(deployer.address);
                    await transferTx.wait();
                    console.log("✅ Successfully transferred ownership!");
                    
                    // Now try to set voting power again
                    const setPowerTx2 = await dao.setVotingPower(deployer.address, ethers.parseEther("10000"));
                    await setPowerTx2.wait();
                    console.log("✅ Successfully set voting power after ownership transfer!");
                    
                } catch (transferError) {
                    console.log("❌ Failed to transfer ownership:", transferError.message);
                    console.log("💡 You may need to manually transfer ownership or redeploy with the correct owner.");
                }
            }
        } else {
            console.log("✅ Current deployer is the owner. Setting voting power...");
            const setPowerTx = await dao.setVotingPower(deployer.address, ethers.parseEther("10000"));
            await setPowerTx.wait();
            console.log("✅ Successfully set voting power!");
        }
        
        // Verify the fix
        const votingPower = await dao.votingPower(deployer.address);
        const isVerified = await dao.africanVerified(deployer.address);
        console.log("🗳️ Deployer voting power:", votingPower.toString());
        console.log("🌍 Deployer is verified African:", isVerified);
        
    } catch (error) {
        console.log("❌ Error fixing DAO ownership:", error.message);
        console.log("💡 You may need to redeploy the contracts with the correct owner.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Fix failed:", error);
        process.exit(1);
    }); 