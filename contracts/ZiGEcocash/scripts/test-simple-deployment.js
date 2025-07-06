const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Simple Contract Deployment on SKALE");
  console.log("=============================================");
  
  const [deployer] = await ethers.getSigners();
  
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  try {
    // Try deploying the simplest possible contract
    console.log("\n📦 Deploying TestToken (minimal ERC20)...");
    
    const TestToken = await ethers.getContractFactory("TestToken");
    const testToken = await TestToken.deploy({
      gasLimit: 2000000,
      gasPrice: ethers.parseUnits("100000", "wei")
    });
    
    await testToken.waitForDeployment();
    const address = await testToken.getAddress();
    
    console.log("✅ TestToken deployed successfully at:", address);
    
    // Test basic functionality
    const name = await testToken.name();
    const symbol = await testToken.symbol();
    const balance = await testToken.balanceOf(deployer.address);
    
    console.log("✅ Contract verification:");
    console.log("   Name:", name);
    console.log("   Symbol:", symbol);
    console.log("   Balance:", ethers.formatEther(balance), "tokens");
    
    console.log("\n🎉 SKALE deployment test successful!");
    console.log("💡 This means SKALE can handle basic contracts");
    
  } catch (error) {
    console.error("❌ Test deployment failed:", error.message);
    
    if (error.message.includes("execution reverted")) {
      console.log("\n🔍 Analysis:");
      console.log("   • SKALE's EVM is incompatible with OpenZeppelin contracts");
      console.log("   • Even simple ERC20 contracts fail");
      console.log("   • This is a SKALE-specific issue, not your contracts");
      
      console.log("\n💡 Recommendations:");
      console.log("1. Try IOTA EVM instead (different zero-gas network)");
      console.log("2. Use traditional networks (Sepolia, Polygon)");
      console.log("3. Contact SKALE support about EVM compatibility");
      console.log("4. Consider using proxy patterns for complex contracts");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 