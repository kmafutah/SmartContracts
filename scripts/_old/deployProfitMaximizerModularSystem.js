// scripts/deployPMMS.js
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Validate environment variables
  const requiredEnvVars = [
    "PRIVATE_KEY",
    "OWNER_ADDRESS",
    "AAVE_ADDRESS_PROVIDER",
    "USDT_ADDRESS",
    "USDC_ADDRESS",
    "UNISWAP_V2_ROUTER",
    "UNISWAP_V3_ROUTER",
    "CURVE_3POOL"
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing ${envVar} in .env`);
    }
  }

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  if (deployer.address.toLowerCase() !== process.env.OWNER_ADDRESS.toLowerCase()) {
    console.warn(`WARNING: Deployer is not ${process.env.OWNER_ADDRESS}`);
  }

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH/sFUEL");
  if (balance === 0n) {
    throw new Error("Deployer has no funds. Fund your account first.");
  }

  // Verify upgrades plugin
  if (!upgrades) {
    throw new Error("OpenZeppelin upgrades plugin not loaded. Check hardhat.config.js");
  }

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  // Deployment function with verification
  const deployAndVerify = async (contractName, args = [], options = {}) => {
    console.log(`\nDeploying ${contractName}...`);
    const Contract = await ethers.getContractFactory(contractName);
    
    let contract;
    if (options.isUpgradeable) {
      contract = await upgrades.deployProxy(
        Contract,
        args,
        { 
          initializer: options.initializer || "initialize", 
          kind: options.kind || "uups",
          gasLimit: options.gasLimit || 3000000
        }
      );
      await contract.waitForDeployment();
    } else {
      contract = await Contract.deploy(...args);
      await contract.waitForDeployment();
    }

    const address = await contract.getAddress();
    console.log(`${contractName} deployed to:`, address);

    // Save deployment info
    const deploymentInfo = {
      address,
      network: hre.network.name,
      abi: Contract.interface.formatJson(),
      args,
      isUpgradeable: !!options.isUpgradeable,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(deploymentsDir, `${contractName}-${hre.network.name}.json`),
      JSON.stringify(deploymentInfo, null, 2)
    );

    // Verify on Blockscout/Etherscan if not local network
    if (!["hardhat", "localhost"].includes(hre.network.name)) {
      console.log(`Verifying ${contractName}...`);
      try {
        if (options.isUpgradeable) {
          const implementationAddress = await upgrades.erc1967.getImplementationAddress(address);
          await hre.run("verify:verify", {
            address: implementationAddress,
            constructorArguments: [],
          });
        } else {
          await hre.run("verify:verify", {
            address,
            constructorArguments: args,
          });
        }
        console.log("Verification successful");
      } catch (error) {
        console.error("Verification failed:", error.message);
      }
    }

    return contract;
  };

  // 1. Deploy Registry (upgradeable)
  const registry = await deployAndVerify("Registry", [process.env.OWNER_ADDRESS], {
    isUpgradeable: true,
    initializer: "initialize"
  });

  // 2. Deploy StrategyExecutor (upgradeable)
  const strategyExecutor = await deployAndVerify("StrategyExecutor", [
    await registry.getAddress(),
    process.env.OWNER_ADDRESS,
    process.env.OWNER_ADDRESS
  ], {
    isUpgradeable: true,
    initializer: "initialize"
  });

  // 3. Deploy FlashloanExecutor (upgradeable)
  const flashloanExecutor = await deployAndVerify("FlashloanExecutor", [
    process.env.AAVE_ADDRESS_PROVIDER,
    await registry.getAddress(),
    await strategyExecutor.getAddress(),
    process.env.OWNER_ADDRESS
  ], {
    isUpgradeable: true,
    initializer: "initialize"
  });

  // 4. Deploy ProfitMaximizerModularSystem (upgradeable)
  const pmms = await deployAndVerify("ProfitMaximizerModularSystem", [
    await registry.getAddress(),
    await flashloanExecutor.getAddress(),
    process.env.OWNER_ADDRESS
  ], {
    isUpgradeable: true,
    initializer: "initialize"
  });

  // Set addresses in Registry
  console.log("\nConfiguring Registry...");
  await registry.setAddress("USDC", process.env.USDC_ADDRESS);
  await registry.setAddress("USDT", process.env.USDT_ADDRESS);
  await registry.setAddress("UNISWAP_V2", process.env.UNISWAP_V2_ROUTER);
  await registry.setAddress("UNISWAP_V3", process.env.UNISWAP_V3_ROUTER);
  await registry.setAddress("CURVE_3POOL", process.env.CURVE_3POOL);
  await registry.setAddress("AAVE_LENDING_POOL", process.env.AAVE_ADDRESS_PROVIDER);
  console.log("Registry configured");

  // Deploy strategies
  const strategies = [
    "StrategyDexArbitrage",
    "StrategyStablecoinPegArbitrage",
    "StrategyYieldLoop",
    "StrategyTriangularArbitrage",
    "StrategyStakingTokenArbitrage",
    "StrategyStablecoinMetaProtocolArbitrage"
  ];

  console.log("\nDeploying strategies...");
  for (const strategyName of strategies) {
    const strategy = await deployAndVerify(strategyName, [await registry.getAddress()]);
    await pmms.addStrategy(strategyName, await strategy.getAddress());
    console.log(`${strategyName} registered in PMMS`);
  }

  // Update .env with deployed addresses
  console.log("\nUpdating .env file...");
  const envUpdates = [
    `REGISTRY_ADDRESS=${await registry.getAddress()}`,
    `FLASHLOAN_EXECUTOR_ADDRESS=${await flashloanExecutor.getAddress()}`,
    `PROFIT_MAXIMIZER_ADDRESS=${await pmms.getAddress()}`
  ];

  const envPath = path.join(__dirname, "../.env");
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  
  // Remove old addresses if they exist
  envContent = envContent.split("\n")
    .filter(line => !line.startsWith("REGISTRY_ADDRESS=") && 
                   !line.startsWith("FLASHLOAN_EXECUTOR_ADDRESS=") && 
                   !line.startsWith("PROFIT_MAXIMIZER_ADDRESS="))
    .join("\n");

  // Add new addresses
  envContent += `\n${envUpdates.join("\n")}\n`;
  fs.writeFileSync(envPath, envContent.trim());
  console.log(".env updated with deployed contract addresses");

  console.log("\nDeployment Summary:");
  console.log("============================================");
  console.log("Registry:", await registry.getAddress());
  console.log("StrategyExecutor:", await strategyExecutor.getAddress());
  console.log("FlashloanExecutor:", await flashloanExecutor.getAddress());
  console.log("ProfitMaximizerModularSystem:", await pmms.getAddress());
  console.log("\nStrategies deployed:");
  for (const strategyName of strategies) {
    const deploymentFile = path.join(deploymentsDir, `${strategyName}-${hre.network.name}.json`);
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile));
    console.log(`${strategyName}: ${deploymentInfo.address}`);
  }
  console.log("============================================");
}

main()
  .then(() => console.log("\nDeployment completed successfully!"))
  .catch((error) => {
    console.error("\nDeployment failed:", error.message);
    process.exit(1);
  });