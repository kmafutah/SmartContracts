const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Validate environment
  if (!process.env.OWNER_ADDRESS) {
    throw new Error("Missing OWNER_ADDRESS in .env");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH/sFUEL");

  // Create deployments directory
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);

  // Deploy Registry
  console.log("\nDeploying Registry...");
  const Registry = await ethers.getContractFactory("Registry");
  const registry = await upgrades.deployProxy(
    Registry,
    [process.env.OWNER_ADDRESS],
    { 
      initializer: "initialize",
      kind: "uups",
      timeout: 120000,
      gasLimit: 3000000 
    }
  );
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("Registry deployed to:", registryAddress);

  // Deploy StrategyExecutor
  console.log("\nDeploying StrategyExecutor...");
  const StrategyExecutor = await ethers.getContractFactory("StrategyExecutor");
  const strategyExecutor = await upgrades.deployProxy(
    StrategyExecutor,
    [
      registryAddress,
      process.env.OWNER_ADDRESS,
      process.env.OWNER_ADDRESS
    ],
    { 
      initializer: "initialize",
      kind: "uups",
      timeout: 120000,
      gasLimit: 3000000 
    }
  );
  await strategyExecutor.waitForDeployment();
  const strategyExecutorAddress = await strategyExecutor.getAddress();
  console.log("StrategyExecutor deployed to:", strategyExecutorAddress);

// Deploy FlashloanExecutor
console.log("\nDeploying FlashloanExecutor...");

const FlashloanExecutor = await ethers.getContractFactory(
  "contracts/pmms/core/FlashloanExecutor.sol:FlashloanExecutor"
);

const flashloanExecutor = await upgrades.deployProxy(
  FlashloanExecutor,
  [
    process.env.AAVE_ADDRESS_PROVIDER,
    process.env.OWNER_ADDRESS,
    strategyExecutorAddress // only 3 args now
  ],
  {
    initializer: "initialize",
    kind: "uups",
    timeout: 120000,
    gasLimit: 3000000,
  }
);

await flashloanExecutor.waitForDeployment();
const flashloanExecutorAddress = await flashloanExecutor.getAddress();
console.log("FlashloanExecutor deployed to:", flashloanExecutorAddress);


  // Deploy ProfitMaximizerModularSystem
  console.log("\nDeploying ProfitMaximizerModularSystem...");
  const ProfitMaximizer = await ethers.getContractFactory("ProfitMaximizerModularSystem");
  const pmms = await upgrades.deployProxy(
    ProfitMaximizer,
    [
      registryAddress,
      flashloanExecutorAddress,
      process.env.OWNER_ADDRESS
    ],
    { 
      initializer: "initialize",
      kind: "uups",
      timeout: 120000,
      gasLimit: 3000000 
    }
  );
  await pmms.waitForDeployment();
  const pmmsAddress = await pmms.getAddress();
  console.log("ProfitMaximizerModularSystem deployed to:", pmmsAddress);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    contracts: {
      Registry: registryAddress,
      StrategyExecutor: strategyExecutorAddress,
      FlashloanExecutor: flashloanExecutorAddress,
      ProfitMaximizerModularSystem: pmmsAddress
    }
  };

  fs.writeFileSync(
    path.join(deploymentsDir, `deployment-${hre.network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Update .env
  const envUpdates = [
    `\n# PMMS Deployment - ${new Date().toISOString()}`,
    `REGISTRY_ADDRESS=${registryAddress}`,
    `FLASHLOAN_EXECUTOR_ADDRESS=${flashloanExecutorAddress}`,
    `PROFIT_MAXIMIZER_ADDRESS=${pmmsAddress}`
  ].join("\n");

  fs.appendFileSync(".env", envUpdates);
  console.log("\n.env file updated with contract addresses");

  // Verify contracts
  if (hre.network.name !== "hardhat") {
    console.log("\nVerifying contracts...");
    await verifyContract(registryAddress);
    await verifyContract(strategyExecutorAddress);
    await verifyContract(flashloanExecutorAddress);
    await verifyContract(pmmsAddress);
  }

  console.log("\n✅ Deployment completed successfully!");
}

async function verifyContract(proxyAddress) {
  try {
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log(`Verifying implementation at ${implementationAddress}...`);
    await hre.run("verify:verify", {
      address: implementationAddress,
      constructorArguments: [],
    });
    console.log("✅ Verification successful");
  } catch (error) {
    console.error("⚠️ Verification failed:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});