const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  const useMock = network.includes("skale");

  const [deployer] = await ethers.getSigners();
  console.log(`🔐 Deploying on ${network} as: ${deployer.address}`);
  console.log("💰 Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer)), "ETH/sFUEL");

  const deploymentsDir = path.join(__dirname, `../deployments`);
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);

  // --- Deploy Registry ---
  console.log("📦 Deploying Registry...");
  const Registry = await ethers.getContractFactory("Registry");
  const registry = await upgrades.deployProxy(Registry, [deployer.address], {
    initializer: "initialize",
    kind: "uups"
  });
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ Registry:", registryAddress);

  // --- Deploy StrategyExecutor ---
  console.log("📦 Deploying StrategyExecutor...");
  const StrategyExecutor = await ethers.getContractFactory("StrategyExecutor");

  const strategyAdmin = process.env.STRATEGY_ADMIN_ADDRESS || deployer.address;
  const strategyOwner = process.env.STRATEGY_OWNER_ADDRESS || deployer.address;

  console.log("📌 StrategyExecutor args:");
  console.log("  Registry:", registryAddress);
  console.log("  Admin:", strategyAdmin);
  console.log("  Owner:", strategyOwner);

  const strategyExecutor = await upgrades.deployProxy(StrategyExecutor, [
    registryAddress,
    strategyAdmin,
    strategyOwner
  ], {
    initializer: "initialize",
    kind: "uups"
  });
  await strategyExecutor.waitForDeployment();
  const strategyExecutorAddress = await strategyExecutor.getAddress();
  console.log("✅ StrategyExecutor:", strategyExecutorAddress);

  // --- Deploy FlashloanExecutor ---
  console.log("📦 Deploying FlashloanExecutor...");
  let flashloanExecutor;
  if (useMock) {
    const MockFlashloanExecutor = await ethers.getContractFactory("MockFlashloanExecutor");
    flashloanExecutor = await upgrades.deployProxy(MockFlashloanExecutor, [deployer.address, deployer.address], {
      initializer: "initialize",
      kind: "uups"
    });
  } else {
    const FlashloanExecutor = await ethers.getContractFactory("FlashloanExecutor");
    const providerAddress = process.env.AAVE_ADDRESS_PROVIDER;
    if (!providerAddress) throw new Error("Missing AAVE_ADDRESS_PROVIDER in .env for non-mock network");

    flashloanExecutor = await upgrades.deployProxy(FlashloanExecutor, [
      providerAddress,
      deployer.address,
      strategyExecutorAddress
    ], {
      initializer: "initialize",
      kind: "uups"
    });
  }
  await flashloanExecutor.waitForDeployment();
  const flashloanExecutorAddress = await flashloanExecutor.getAddress();
  console.log("✅ FlashloanExecutor:", flashloanExecutorAddress);

  // --- Deploy PMMS ---
  console.log("📦 Deploying ProfitMaximizerModularSystem...");
  const PMMS = await ethers.getContractFactory("ProfitMaximizerModularSystem");
  const pmms = await upgrades.deployProxy(PMMS, [
    registryAddress,
    flashloanExecutorAddress,
    deployer.address
  ], {
    initializer: "initialize",
    kind: "uups"
  });
  await pmms.waitForDeployment();
  const pmmsAddress = await pmms.getAddress();
  console.log("✅ PMMS:", pmmsAddress);

  // --- Deploy and Register All Strategies ---
  const strategyContracts = [
    "StrategyAaveLiquidation",
    "StrategyBridgingLatencyArbitrage",
    "StrategyCrossDexLendingArbitrage",
    "StrategyDexArbitrage",
    "StrategyFlashloanGasArbitrage",
    "StrategyFlashMintArbitrage",
    "StrategyGasRefundArbitrage",
    "StrategyGovernanceArbitrage",
    "StrategyLPBurnArbitrage",
    "StrategyMEVCapture",
    "StrategyNFTCollateralLiquidation",
    "StrategyNFTFloorArbitrage",
    "StrategyOracleLagArbitrage",
    "StrategyRebaseTokenArbitrage",
    "StrategyStablecoinMetaProtocolArbitrage",
    "StrategyStablecoinPegArbitrage",
    "StrategyStakingTokenArbitrage",
    "StrategyTriangularArbitrage",
    "StrategyYieldLoop"
  ];

  const strategyInfo = {};
  for (const contractName of strategyContracts) {
    console.log(`📦 Deploying ${contractName}...`);
    try {
      const Strategy = await ethers.getContractFactory(contractName);
      // Deploy as UUPS proxy, assuming constructor takes registryAddress
      const strategy = await upgrades.deployProxy(Strategy, [registryAddress], {
        initializer: "initialize",
        kind: "uups"
      });
      await strategy.waitForDeployment();
      const strategyAddress = await strategy.getAddress();

      // Derive strategy name (remove "Strategy" prefix)
      const strategyName = contractName.replace(/^Strategy/, "");
      await registry.addStrategy(strategyName, strategyAddress);
      console.log(`✅ Registered strategy: ${strategyName} at ${strategyAddress}`);

      strategyInfo[contractName] = strategyAddress;
    } catch (err) {
      console.error(`❌ Failed to deploy ${contractName}: ${err.message}`);
    }
  }

  // Save deployments
  const info = {
    network,
    timestamp: new Date().toISOString(),
    Registry: registryAddress,
    StrategyExecutor: strategyExecutorAddress,
    FlashloanExecutor: flashloanExecutorAddress,
    PMMS: pmmsAddress,
    Strategies: strategyInfo
  };
  fs.writeFileSync(path.join(deploymentsDir, `deployment-${network}.json`), JSON.stringify(info, null, 2));

  // Update .env
  let envUpdates = [
    `\n# PMMS Deployment (${network}) - ${new Date().toISOString()}`,
    `REGISTRY_ADDRESS=${registryAddress}`,
    `STRATEGY_EXECUTOR_ADDRESS=${strategyExecutorAddress}`,
    `FLASHLOAN_EXECUTOR_ADDRESS=${flashloanExecutorAddress}`,
    `PMMS_ADDRESS=${pmmsAddress}`
  ];
  for (const [contractName, address] of Object.entries(strategyInfo)) {
    envUpdates.push(`${contractName.toUpperCase()}_ADDRESS=${address}`);
  }
  fs.appendFileSync(".env", envUpdates.join("\n"));

  // Verify
  if (!["hardhat", "localhost"].includes(network)) {
    console.log("🔍 Verifying contracts...");
    await verifyUpgrade(registryAddress);
    await verifyUpgrade(strategyExecutorAddress);
    await verifyUpgrade(flashloanExecutorAddress);
    await verifyUpgrade(pmmsAddress);
    // Verify strategy proxies
    for (const [contractName, address] of Object.entries(strategyInfo)) {
      try {
        const impl = await upgrades.erc1967.getImplementationAddress(address);
        await hre.run("verify:verify", {
          address: impl,
          constructorArguments: []
        });
        console.log(`🔍 Verified strategy: ${contractName} at ${impl}`);
      } catch (e) {
        console.warn(`⚠️ Verification failed for ${contractName} at ${address}: ${e.message}`);
      }
    }
  }

  console.log("✅ Deployment complete!");
}

async function verifyUpgrade(proxyAddr) {
  try {
    const impl = await upgrades.erc1967.getImplementationAddress(proxyAddr);
    await hre.run("verify:verify", {
      address: impl,
      constructorArguments: []
    });
    console.log(`🔍 Verified: ${impl}`);
  } catch (e) {
    console.warn(`⚠️ Verification failed for ${proxyAddr}: ${e.message}`);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});