const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");

async function main() {
  // Load environment variables
  const AAVE_POOL_ADDRESSES_PROVIDER = process.env.AAVE_ADDRESS_PROVIDER;
  const INITIAL_OWNER = process.env.OWNER_ADDRESS;

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy ProfitMaximizer
  const ProfitMaximizer = await ethers.getContractFactory("ProfitMaximizerModularSystem");
  const profitMaximizer = await ProfitMaximizer.deploy(
    AAVE_POOL_ADDRESSES_PROVIDER,
    INITIAL_OWNER,
    { gasLimit: 5000000 } // Reasonable gas limit
  );

  await profitMaximizer.waitForDeployment();
  const cnt_add = profitMaximizer.target;
  console.log("ProfitMaximizer deployed to:", cnt_add);

  // Save deployed bytecode
  const deployedBytecode = await ethers.provider.getCode(cnt_add);
  console.log("Deployed Bytecode:", deployedBytecode);

  // Save deployment info
  const saveDeploymentInfo = (contractName, contractInstance) => {
    const deploymentInfo = {
      address: contractInstance.target,
      abi: contractInstance.interface.format("json"),
      bytecode: deployedBytecode,
      network: hre.network.name,
    };
    const filePath = `./deployments/${contractName}-${hre.network.name}.json`;
    fs.mkdirSync("./deployments", { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`Deployment info saved to ${filePath}`);
  };
  saveDeploymentInfo("ProfitMaximizer", profitMaximizer);

  // Verify contract
  console.log("Verifying contract...");
  try {
    await hre.run("verify:verify", {
      address: cnt_add,
      constructorArguments: [AAVE_POOL_ADDRESSES_PROVIDER, INITIAL_OWNER],
    });
    console.log("Contract verified successfully.");
  } catch (error) {
    console.error("Verification failed:", error);
  }

  // Real-time event listener for StablecoinPegOpportunity
  console.log("Setting up real-time event listener for StablecoinPegOpportunity...");
  profitMaximizer.on("StablecoinPegOpportunity", (stablecoin, profit, timestamp, event) => {
    console.log(`StablecoinPegOpportunity Event:
      Stablecoin: ${stablecoin}
      Profit: ${ethers.formatEther(profit)} ETH
      Timestamp: ${timestamp.toString()}
      Block: ${event.blockNumber}`);
  });

  console.log("Event listeners active. Keeping script running...");
  await new Promise(() => {});
}

main()
  .then(() => console.log("Deployment and verification completed"))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });