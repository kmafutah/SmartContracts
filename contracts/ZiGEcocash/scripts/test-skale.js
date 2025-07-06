const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing SKALE connection and basic deployment...");
  
  const [deployer] = await ethers.getSigners();
  
  console.log("Deployer address:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  // Test 1: Simple contract deployment
  console.log("\n📝 Test 1: Deploying simple contract...");
  
  try {
    // Try deploying a simple ERC20 token first
    const SimpleToken = await ethers.getContractFactory("ZiG");
    console.log("Contract factory created successfully");
    
    const simpleToken = await SimpleToken.deploy(ethers.parseUnits("1000000", 18), {
      gasLimit: 3000000, // Lower gas limit
      gasPrice: ethers.parseUnits("100000", "wei")
    });
    
    console.log("Deployment transaction sent...");
    await simpleToken.waitForDeployment();
    
    const address = await simpleToken.getAddress();
    console.log("✅ Simple contract deployed successfully at:", address);
    
    // Test basic function
    const name = await simpleToken.name();
    console.log("Contract name:", name);
    
  } catch (error) {
    console.error("❌ Simple contract deployment failed:", error.message);
    
    // Try with even lower gas limit
    console.log("\n🔄 Retrying with lower gas limit...");
    try {
      const SimpleToken = await ethers.getContractFactory("ZiG");
      const simpleToken = await SimpleToken.deploy(ethers.parseUnits("1000000", 18), {
        gasLimit: 1000000, // Much lower gas limit
        gasPrice: ethers.parseUnits("100000", "wei")
      });
      
      await simpleToken.waitForDeployment();
      const address = await simpleToken.getAddress();
      console.log("✅ Simple contract deployed with lower gas limit at:", address);
      
    } catch (error2) {
      console.error("❌ Even lower gas limit failed:", error2.message);
      console.log("\n💡 Suggestions:");
      console.log("1. Check SKALE network status");
      console.log("2. Try a different SKALE endpoint");
      console.log("3. Verify account has sufficient balance");
      console.log("4. Try deploying to a different network first");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 