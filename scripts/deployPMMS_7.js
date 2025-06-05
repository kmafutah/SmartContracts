const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  const useMock = network.includes("skale");

  const [deployer] = await ethers.getSigners();
  console.log(`🔐 Deploying on ${network} as: ${deployer.address}`);

  // Fetch deployer balance
  let balance;
  try {
    balance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "sFUEL");
  } catch (error) {
    console.warn("⚠️ Failed to fetch balance:", error.message);
    balance = ethers.toBigInt(0);
  }

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);

  // Deploy Mocks for SKALE
  let USDC, USDT, DAI, WETH, STETH, CURVE_3POOL, UNISWAP_V2, UNISWAP_V3, UNISWAP_V3_QUOTER, CONVEX, CURVE_3POOL_TOKEN, AAVE_LENDING_POOL, SKALE_IMA_BRIDGE, GAS_ORACLE;
  if (useMock) {
    console.log("📦 Deploying mocks...");
    try {
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      USDC = await MockERC20.deploy("USD Coin", "USDC");
      USDT = await MockERC20.deploy("Tether USD", "USDT");
      DAI = await MockERC20.deploy("Dai Stablecoin", "DAI");
      WETH = await MockERC20.deploy("Wrapped Ether", "WETH");
      STETH = await MockERC20.deploy("stETH", "STETH");
      await Promise.all([
        USDC.waitForDeployment(),
        USDT.waitForDeployment(),
        DAI.waitForDeployment(),
        WETH.waitForDeployment(),
        STETH.waitForDeployment(),
      ]);

      const MockCurvePool = await ethers.getContractFactory("MockCurvePool");
      const curvePool = await MockCurvePool.deploy(USDC.target, USDT.target, DAI.target);
      await curvePool.waitForDeployment();
      CURVE_3POOL = curvePool.target;

      const MockUniswapV2Router = await ethers.getContractFactory("MockUniswapV2Router");
      const uniswapV2 = await MockUniswapV2Router.deploy();
      await uniswapV2.waitForDeployment();
      UNISWAP_V2 = uniswapV2.target;

      const MockSwapRouter = await ethers.getContractFactory("MockSwapRouter");
      const swapRouter = await MockSwapRouter.deploy();
      await swapRouter.waitForDeployment();
      UNISWAP_V3 = swapRouter.target;

      const MockQuoter = await ethers.getContractFactory("MockQuoter");
      const quoter = await MockQuoter.deploy();
      await quoter.waitForDeployment();
      UNISWAP_V3_QUOTER = quoter.target;

      const MockConvexBooster = await ethers.getContractFactory("MockConvexBooster");
      const convex = await MockConvexBooster.deploy();
      await convex.waitForDeployment();
      CONVEX = convex.target;

      const MockCurve3PoolToken = await ethers.getContractFactory("MockERC20");
      const curve3PoolToken = await MockCurve3PoolToken.deploy("Curve 3Pool LP", "3CRV");
      await curve3PoolToken.waitForDeployment();
      CURVE_3POOL_TOKEN = curve3PoolToken.target;

      const MockAaveLendingPool = await ethers.getContractFactory("MockAaveLendingPool");
      const aaveLendingPool = await MockAaveLendingPool.deploy();
      await aaveLendingPool.waitForDeployment();
      AAVE_LENDING_POOL = aaveLendingPool.target;

      const MockIMABridge = await ethers.getContractFactory("MockIMABridge");
      const imaBridge = await MockIMABridge.deploy();
      await imaBridge.waitForDeployment();
      SKALE_IMA_BRIDGE = imaBridge.target;

      const MockGasOracle = await ethers.getContractFactory("MockGasOracle");
      const gasOracle = await MockGasOracle.deploy();
      await gasOracle.waitForDeployment();
      GAS_ORACLE = gasOracle.target;

      console.log("✅ Mocks deployed:");
      console.log("  USDC:", USDC.target);
      console.log("  USDT:", USDT.target);
      console.log("  DAI:", DAI.target);
      console.log("  WETH:", WETH.target);
      console.log("  STETH:", STETH.target);
      console.log("  CURVE_3POOL:", CURVE_3POOL);
      console.log("  UNISWAP_V2:", UNISWAP_V2);
      console.log("  UNISWAP_V3:", UNISWAP_V3);
      console.log("  UNISWAP_V3_QUOTER:", UNISWAP_V3_QUOTER);
      console.log("  CONVEX:", CONVEX);
      console.log("  CURVE_3POOL_TOKEN:", CURVE_3POOL_TOKEN);
      console.log("  AAVE_LENDING_POOL:", AAVE_LENDING_POOL);
      console.log("  SKALE_IMA_BRIDGE:", SKALE_IMA_BRIDGE);
      console.log("  GAS_ORACLE:", GAS_ORACLE);
    } catch (error) {
      console.error("❌ Mock deployment failed:", error.message);
      throw error;
    }
  } else {
    // Mainnet addresses
    USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
    DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    STETH = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84";
    CURVE_3POOL = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";
    UNISWAP_V2 = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    UNISWAP_V3 = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
    UNISWAP_V3_QUOTER = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
    CONVEX = "0xF403C135812408BFbE8713b5A23a04b3D48AAE31";
    CURVE_3POOL_TOKEN = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490";
    AAVE_LENDING_POOL = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9"; // Aave V2
    SKALE_IMA_BRIDGE = "0x0000000000000000000000000000000000000000"; // Not used on mainnet
    GAS_ORACLE = "0x0000000000000000000000000000000000000000"; // Not used on mainnet
  }

  // --- Deploy Registry ---
  console.log("📦 Deploying Registry...");
  let registry;
  let registryAddress;
  let flashloanExecutorAddress;
  try {
    const Registry = await ethers.getContractFactory("Registry");
    registry = await upgrades.deployProxy(Registry, [deployer.address], {
      initializer: "initialize",
      kind: "uups",
    });
    await registry.waitForDeployment();
    registryAddress = await registry.getAddress();
    console.log("✅ Registry:", registryAddress);
  } catch (error) {
    console.error("❌ Registry deployment failed:", error.message);
    throw error;
  }

  // Register mock addresses
  if (useMock) {
    console.log("📝 Registering mock addresses...");
    try {

      const registrations = [
        { key: "USDC", value: USDC.target },
        { key: "USDT", value: USDT.target },
        { key: "DAI", value: DAI.target },
        { key: "WETH", value: WETH.target },
        { key: "STETH", value: STETH.target },
        { key: "CURVE_3POOL", value: CURVE_3POOL },
        { key: "UNISWAP_V2", value: UNISWAP_V2 },
        { key: "UNISWAP_V3", value: UNISWAP_V3 },
        { key: "UNISWAP_V3_QUOTER", value: UNISWAP_V3_QUOTER },
        { key: "CONVEX", value: CONVEX },
        { key: "CURVE_3POOL_TOKEN", value: CURVE_3POOL_TOKEN },
        { key: "AAVE_LENDING_POOL", value: AAVE_LENDING_POOL },
        { key: "SKALE_IMA_BRIDGE", value: SKALE_IMA_BRIDGE },
        { key: "GAS_ORACLE", value: GAS_ORACLE },
        // Add any additional keys here
      ];

      for (const { key, value } of registrations) {
        console.log(`Registering ${key} -> ${value}`);
        await registry.setAddress(key, value);
      }

      console.log("✅ Mock addresses registered in Registry");
    } catch (error) {
      console.error("❌ Mock address registration failed:", error.message);
      throw error;
    }
  }

  // --- Deploy StrategyExecutor ---
  console.log("📦 Deploying StrategyExecutor...");
  let strategyExecutor;
  let strategyExecutorAddress;
  try {
    const StrategyExecutor = await ethers.getContractFactory("StrategyExecutor");
    const strategyAdmin = process.env.STRATEGY_ADMIN_ADDRESS || deployer.address;
    const strategyOwner = process.env.STRATEGY_OWNER_ADDRESS || deployer.address;
    console.log("📌 StrategyExecutor args:");
    console.log("  Registry:", registryAddress);
    console.log("  Admin:", strategyAdmin);
    console.log("  Owner:", strategyOwner);
    strategyExecutor = await upgrades.deployProxy(
      StrategyExecutor,
      [registryAddress, strategyAdmin, strategyOwner],
      {
        initializer: "initialize",
        kind: "uups",
      }
    );
    await strategyExecutor.waitForDeployment();
     strategyExecutorAddress = await strategyExecutor.getAddress();
    console.log("✅ StrategyExecutor:", strategyExecutorAddress);
  } catch (error) {
    console.error("❌ StrategyExecutor deployment failed:", error.message);
    throw error;
  }

  // --- Deploy FlashloanExecutor ---
  console.log("📦 Deploying FlashloanExecutor...");
  let flashloanExecutor;
  try {
    if (useMock) {
      const MockFlashloanExecutor = await ethers.getContractFactory("MockFlashloanExecutor");
      flashloanExecutor = await upgrades.deployProxy(
        MockFlashloanExecutor,
        [deployer.address, deployer.address],
        {
          initializer: "initialize",
          kind: "uups",
        }
      );
    } else {
      const FlashloanExecutor = await ethers.getContractFactory("FlashloanExecutor");
      const providerAddress = process.env.AAVE_ADDRESS_PROVIDER;
      if (!providerAddress) throw new Error("Missing AAVE_ADDRESS_PROVIDER in .env for non-mock network");
      flashloanExecutor = await upgrades.deployProxy(
        FlashloanExecutor,
        [providerAddress, deployer.address, strategyExecutorAddress],
        {
          initializer: "initialize",
          kind: "uups",
        }
      );
    }
    await flashloanExecutor.waitForDeployment();
    flashloanExecutorAddress = await flashloanExecutor.getAddress();
    console.log("✅ FlashloanExecutor:", flashloanExecutorAddress);
  } catch (error) {
    console.error("❌ FlashloanExecutor deployment failed:", error.message);
    throw error;
  }

  // --- Deploy PMMS ---
  console.log("📦 Deploying ProfitMaximizerModularSystem...");
  let pmms;
  let pmmsAddress;
  try {
    const PMMS = await ethers.getContractFactory("ProfitMaximizerModularSystem");
    pmms = await upgrades.deployProxy(
      PMMS,
      [registryAddress, flashloanExecutorAddress, deployer.address],
      {
        initializer: "initialize",
        kind: "uups",
      }
    );
    await pmms.waitForDeployment();
     pmmsAddress = await pmms.getAddress();
    console.log("✅ PMMS:", pmmsAddress);
  } catch (error) {
    console.error("❌ PMMS deployment failed:", error.message);
    throw error;
  }

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
    "StrategyYieldLoop",
  ];

  const strategyInfo = {};
  for (const contractName of strategyContracts) {
    console.log(`📦 Deploying ${contractName}...`);
    try {
      const Strategy = await ethers.getContractFactory(contractName);
      let strategy;
      if (contractName === "StrategyBridgingLatencyArbitrage") {
        strategy = await upgrades.deployProxy(
          Strategy,
          [registryAddress, UNISWAP_V3, UNISWAP_V3_QUOTER, SKALE_IMA_BRIDGE, deployer.address],
          {
            initializer: "initialize",
            kind: "uups",
          }
        );
      } else if (contractName === "StrategyFlashMintArbitrage") {
        strategy = await upgrades.deployProxy(
          Strategy,
          [registryAddress, UNISWAP_V3, UNISWAP_V3_QUOTER, deployer.address],
          {
            initializer: "initialize",
            kind: "uups",
          }
        );
      } else if (contractName === "StrategyRebaseTokenArbitrage") {
        strategy = await upgrades.deployProxy(
          Strategy,
          [registryAddress, UNISWAP_V3, UNISWAP_V3_QUOTER],
          {
            initializer: "initialize",
            kind: "uups",
          }
        );
      } else {
        strategy = await upgrades.deployProxy(Strategy, [registryAddress], {
          initializer: "initialize",
          kind: "uups",
        });
      }
      await strategy.waitForDeployment();
      const strategyAddress = await strategy.getAddress();

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
    Mocks: useMock
      ? {
          USDC: USDC.target,
          USDT: USDT.target,
          DAI: DAI.target,
          WETH: WETH.target,
          STETH: STETH.target,
          CURVE_3POOL: CURVE_3POOL,
          UNISWAP_V2: UNISWAP_V2,
          UNISWAP_V3: UNISWAP_V3,
          UNISWAP_V3_QUOTER: UNISWAP_V3_QUOTER,
          CONVEX: CONVEX,
          CURVE_3POOL_TOKEN: CURVE_3POOL_TOKEN,
          AAVE_LENDING_POOL: AAVE_LENDING_POOL,
          SKALE_IMA_BRIDGE: SKALE_IMA_BRIDGE,
          GAS_ORACLE: GAS_ORACLE,
        }
      : {
          USDC,
          USDT,
          DAI,
          WETH,
          STETH,
          CURVE_3POOL,
          UNISWAP_V2,
          UNISWAP_V3,
          UNISWAP_V3_QUOTER,
          CONVEX,
          CURVE_3POOL_TOKEN,
          AAVE_LENDING_POOL,
          SKALE_IMA_BRIDGE,
          GAS_ORACLE,
        },
    Strategies: strategyInfo,
  };
  fs.writeFileSync(path.join(deploymentsDir, `deployment-${network}.json`), JSON.stringify(info, null, 2));

  // Update .env
  let envUpdates = [
    `\n# PMMS Deployment (${network}) - ${new Date().toISOString()}`,
    `REGISTRY_ADDRESS=${registryAddress}`,
    `STRATEGY_EXECUTOR_ADDRESS=${strategyExecutorAddress}`,
    `FLASHLOAN_EXECUTOR_ADDRESS=${flashloanExecutorAddress}`,
    `PMMS_ADDRESS=${pmmsAddress}`,
    `USDC_ADDRESS=${USDC}`,
    `USDT_ADDRESS=${USDT}`,
    `DAI_ADDRESS=${DAI}`,
    `WETH_ADDRESS=${WETH}`,
    `STETH_ADDRESS=${STETH}`,
    `CURVE_3POOL_ADDRESS=${CURVE_3POOL}`,
    `UNISWAP_V2_ADDRESS=${UNISWAP_V2}`,
    `UNISWAP_V3_ADDRESS=${UNISWAP_V3}`,
    `UNISWAP_V3_QUOTER_ADDRESS=${UNISWAP_V3_QUOTER}`,
    `CONVEX_ADDRESS=${CONVEX}`,
    `CURVE_3POOL_TOKEN_ADDRESS=${CURVE_3POOL_TOKEN}`,
    `AAVE_LENDING_POOL_ADDRESS=${AAVE_LENDING_POOL}`,
    `SKALE_IMA_BRIDGE_ADDRESS=${SKALE_IMA_BRIDGE}`,
    `GAS_ORACLE_ADDRESS=${GAS_ORACLE}`,
  ];
  for (const [contractName, address] of Object.entries(strategyInfo)) {
    envUpdates.push(`${contractName.toUpperCase()}_ADDRESS=${address}`);
  }
  fs.appendFileSync(path.join(__dirname, "../.env"), envUpdates.join("\n"));

  // Verify (skip for SKALE testnet)
  // if (!["hardhat", "localhost", "skale_testnet"].includes(network)) {
  if (!["hardhat", "localhost"].includes(network)) {    
    console.log("🔍 Verifying contracts...");
    await verifyUpgrade(registryAddress);
    await verifyUpgrade(strategyExecutorAddress);
    await verifyUpgrade(flashloanExecutorAddress);
    await verifyUpgrade(pmmsAddress);
    for (const [contractName, address] of Object.entries(strategyInfo)) {
      try {
        const impl = await upgrades.erc1967.getImplementationAddress(address);
        await hre.run("verify:verify", {
          address: impl,
          constructorArguments: [],
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
      constructorArguments: [],
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