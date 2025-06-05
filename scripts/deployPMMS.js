const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Utility functions
async function deployWithRetries(contractFactory, args, overrides = {}, retries = 3, delay = 2000) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const contract = await contractFactory.deploy(...args, overrides);
      await contract.waitForDeployment();
      return contract;
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${i + 1}/${retries} failed: ${error.message}`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

async function deployProxyWithRetries(contractFactory, args, options = {}, retries = 3, delay = 2000) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const contract = await upgrades.deployProxy(contractFactory, args, options);
      await contract.waitForDeployment();
      return contract;
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${i + 1}/${retries} failed: ${error.message}`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

async function checkDeployerBalance(deployer, minBalance = ethers.parseEther("0.1")) {
  try {
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "sFUEL");
    
    if (balance < minBalance) {
      throw new Error(`Insufficient balance. Need at least ${ethers.formatEther(minBalance)} sFUEL`);
    }
    
    return balance;
  } catch (error) {
    console.error("❌ Balance check failed:", error.message);
    throw error;
  }
}

// Main deployment function
async function main() {
  try {
    const network = hre.network.name;
    const useMock = network.includes("skale");
    const deploymentsDir = path.join(__dirname, "../deployments");
    
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }

    const [deployer] = await ethers.getSigners();
    console.log(`🔐 Deploying on ${network} as: ${deployer.address}`);

    // Configure deployment settings
    const deploymentConfig = {
      gasOverrides: useMock ? {
        gasLimit: 8000000,
        gasPrice: ethers.parseUnits("100", "gwei")
      } : {}
    };

    await checkDeployerBalance(deployer);

    // Deploy Mocks for SKALE
    let mockContracts = {};
    if (useMock) {
      console.log("📦 Deploying mocks...");
      try {
        // Deploy ERC20 tokens
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        mockContracts.USDC = await deployWithRetries(MockERC20, ["USD Coin", "USDC"], deploymentConfig.gasOverrides);
        mockContracts.USDT = await deployWithRetries(MockERC20, ["Tether USD", "USDT"], deploymentConfig.gasOverrides);
        mockContracts.DAI = await deployWithRetries(MockERC20, ["Dai Stablecoin", "DAI"], deploymentConfig.gasOverrides);
        mockContracts.WETH = await deployWithRetries(MockERC20, ["Wrapped Ether", "WETH"], deploymentConfig.gasOverrides);
        mockContracts.STETH = await deployWithRetries(MockERC20, ["stETH", "STETH"], deploymentConfig.gasOverrides);

        // Deploy Curve Pool
        const MockCurvePool = await ethers.getContractFactory("MockCurvePool");
        mockContracts.CURVE_3POOL = await deployWithRetries(
          MockCurvePool,
          [mockContracts.USDC.target, mockContracts.USDT.target, mockContracts.DAI.target],
          deploymentConfig.gasOverrides
        );

        // Deploy Uniswap V2
        const MockUniswapV2Router = await ethers.getContractFactory("MockUniswapV2Router");
        mockContracts.UNISWAP_V2 = await deployWithRetries(
          MockUniswapV2Router,
          [],
          deploymentConfig.gasOverrides
        );

        // Deploy Uniswap V3
        const MockSwapRouter = await ethers.getContractFactory("MockSwapRouter");
        mockContracts.UNISWAP_V3 = await deployWithRetries(
          MockSwapRouter,
          [],
          deploymentConfig.gasOverrides
        );

        // Deploy Quoter
        const MockQuoter = await ethers.getContractFactory("MockQuoter");
        mockContracts.UNISWAP_V3_QUOTER = await deployWithRetries(
          MockQuoter,
          [],
          deploymentConfig.gasOverrides
        );

        // Deploy Convex
        const MockConvexBooster = await ethers.getContractFactory("MockConvexBooster");
        mockContracts.CONVEX = await deployWithRetries(
          MockConvexBooster,
          [],
          deploymentConfig.gasOverrides
        );

        // Deploy Curve 3Pool Token
        mockContracts.CURVE_3POOL_TOKEN = await deployWithRetries(
          MockERC20,
          ["Curve 3Pool LP", "3CRV"],
          deploymentConfig.gasOverrides
        );

        // Deploy Aave Lending Pool
        const MockAaveLendingPool = await ethers.getContractFactory("MockAaveLendingPool");
        mockContracts.AAVE_LENDING_POOL = await deployWithRetries(
          MockAaveLendingPool,
          [],
          deploymentConfig.gasOverrides
        );

        // Deploy SKALE IMA Bridge
        const MockIMABridge = await ethers.getContractFactory("MockIMABridge");
        mockContracts.SKALE_IMA_BRIDGE = await deployWithRetries(
          MockIMABridge,
          [],
          deploymentConfig.gasOverrides
        );

        // Deploy Gas Oracle
        const MockGasOracle = await ethers.getContractFactory("MockGasOracle");
        mockContracts.GAS_ORACLE = await deployWithRetries(
          MockGasOracle,
          [],
          deploymentConfig.gasOverrides
        );

        console.log("✅ Mocks deployed successfully");
      } catch (error) {
        console.error("❌ Mock deployment failed:", error);
        throw error;
      }
    }

    // Mainnet addresses (fallback when not using mocks)
    const mainnetAddresses = {
      USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      STETH: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
      CURVE_3POOL: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
      UNISWAP_V2: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      UNISWAP_V3: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      UNISWAP_V3_QUOTER: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
      CONVEX: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
      CURVE_3POOL_TOKEN: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
      AAVE_LENDING_POOL: "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9",
      SKALE_IMA_BRIDGE: ethers.ZeroAddress,
      GAS_ORACLE: ethers.ZeroAddress
    };

    const tokenAddresses = useMock ? {
      USDC: mockContracts.USDC.target,
      USDT: mockContracts.USDT.target,
      DAI: mockContracts.DAI.target,
      WETH: mockContracts.WETH.target,
      STETH: mockContracts.STETH.target,
      CURVE_3POOL: mockContracts.CURVE_3POOL.target,
      UNISWAP_V2: mockContracts.UNISWAP_V2.target,
      UNISWAP_V3: mockContracts.UNISWAP_V3.target,
      UNISWAP_V3_QUOTER: mockContracts.UNISWAP_V3_QUOTER.target,
      CONVEX: mockContracts.CONVEX.target,
      CURVE_3POOL_TOKEN: mockContracts.CURVE_3POOL_TOKEN.target,
      AAVE_LENDING_POOL: mockContracts.AAVE_LENDING_POOL.target,
      SKALE_IMA_BRIDGE: mockContracts.SKALE_IMA_BRIDGE.target,
      GAS_ORACLE: mockContracts.GAS_ORACLE.target
    } : mainnetAddresses;

    // --- Deploy Registry ---
    console.log("📦 Deploying Registry...");
    let registry;
    try {
      const Registry = await ethers.getContractFactory("Registry");
      registry = await deployProxyWithRetries(
        Registry,
        [deployer.address],
        {
          initializer: "initialize",
          kind: "uups",
          ...deploymentConfig.gasOverrides
        }
      );
      console.log("✅ Registry deployed at:", await registry.getAddress());
    } catch (error) {
      console.error("❌ Registry deployment failed:", error);
      throw error;
    }

    const registryAddress = await registry.getAddress();

    // Register addresses
    if (useMock) {
      console.log("📝 Registering mock addresses...");
      try {
        const registrations = Object.entries(tokenAddresses)
          .filter(([key]) => key !== "SKALE_IMA_BRIDGE" && key !== "GAS_ORACLE")
          .map(([key, value]) => ({ key, value }));

        for (const { key, value } of registrations) {
          console.log(`Registering ${key} -> ${value}`);
          const tx = await registry.setAddress(key, value, deploymentConfig.gasOverrides);
          await tx.wait();
        }
        console.log("✅ Mock addresses registered in Registry");
      } catch (error) {
        console.error("❌ Mock address registration failed:", error);
        throw error;
      }
    }

    // --- Deploy StrategyExecutor ---
    console.log("📦 Deploying StrategyExecutor...");
    let strategyExecutor;
    try {
      const StrategyExecutor = await ethers.getContractFactory("StrategyExecutor");
      const strategyAdmin = process.env.STRATEGY_ADMIN_ADDRESS || deployer.address;
      const strategyOwner = process.env.STRATEGY_OWNER_ADDRESS || deployer.address;
      
      console.log("📌 StrategyExecutor args:");
      console.log("  Registry:", registryAddress);
      console.log("  Admin:", strategyAdmin);
      console.log("  Owner:", strategyOwner);

      strategyExecutor = await deployProxyWithRetries(
        StrategyExecutor,
        [registryAddress, strategyAdmin, strategyOwner],
        {
          initializer: "initialize",
          kind: "uups",
          ...deploymentConfig.gasOverrides
        }
      );
      console.log("✅ StrategyExecutor deployed at:", await strategyExecutor.getAddress());
    } catch (error) {
      console.error("❌ StrategyExecutor deployment failed:", error);
      throw error;
    }

    const strategyExecutorAddress = await strategyExecutor.getAddress();

    // --- Deploy FlashloanExecutor ---
    console.log("📦 Deploying FlashloanExecutor...");
    let flashloanExecutor;
    try {
      if (useMock) {
        const MockFlashloanExecutor = await ethers.getContractFactory("MockFlashloanExecutor");
        flashloanExecutor = await deployProxyWithRetries(
          MockFlashloanExecutor,
          [deployer.address, deployer.address],
          {
            initializer: "initialize",
            kind: "uups",
            ...deploymentConfig.gasOverrides
          }
        );
      } else {
        const FlashloanExecutor = await ethers.getContractFactory("FlashloanExecutor");
        const providerAddress = process.env.AAVE_ADDRESS_PROVIDER;
        if (!providerAddress) {
          throw new Error("Missing AAVE_ADDRESS_PROVIDER in .env for non-mock network");
        }
        flashloanExecutor = await deployProxyWithRetries(
          FlashloanExecutor,
          [providerAddress, deployer.address, strategyExecutorAddress],
          {
            initializer: "initialize",
            kind: "uups",
            ...deploymentConfig.gasOverrides
          }
        );
      }
      console.log("✅ FlashloanExecutor deployed at:", await flashloanExecutor.getAddress());
    } catch (error) {
      console.error("❌ FlashloanExecutor deployment failed:", error);
      throw error;
    }

    const flashloanExecutorAddress = await flashloanExecutor.getAddress();

    // --- Deploy PMMS ---
    console.log("📦 Deploying ProfitMaximizerModularSystem...");
    let pmms;
    try {
      const PMMS = await ethers.getContractFactory("ProfitMaximizerModularSystem");
      pmms = await deployProxyWithRetries(
        PMMS,
        [registryAddress, flashloanExecutorAddress, deployer.address],
        {
          initializer: "initialize",
          kind: "uups",
          ...deploymentConfig.gasOverrides
        }
      );
      console.log("✅ PMMS deployed at:", await pmms.getAddress());
    } catch (error) {
      console.error("❌ PMMS deployment failed:", error);
      throw error;
    }

    const pmmsAddress = await pmms.getAddress();

    // --- Deploy and Register Strategies ---
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
          strategy = await deployProxyWithRetries(
            Strategy,
            [
              registryAddress,
              tokenAddresses.UNISWAP_V3,
              tokenAddresses.UNISWAP_V3_QUOTER,
              tokenAddresses.SKALE_IMA_BRIDGE,
              deployer.address
            ],
            {
              initializer: "initialize",
              kind: "uups",
              ...deploymentConfig.gasOverrides
            }
          );
        } else if (contractName === "StrategyFlashMintArbitrage") {
          strategy = await deployProxyWithRetries(
            Strategy,
            [
              registryAddress,
              tokenAddresses.UNISWAP_V3,
              tokenAddresses.UNISWAP_V3_QUOTER,
              deployer.address
            ],
            {
              initializer: "initialize",
              kind: "uups",
              ...deploymentConfig.gasOverrides
            }
          );
        } else if (contractName === "StrategyRebaseTokenArbitrage") {
          strategy = await deployProxyWithRetries(
            Strategy,
            [
              registryAddress,
              tokenAddresses.UNISWAP_V3,
              tokenAddresses.UNISWAP_V3_QUOTER
            ],
            {
              initializer: "initialize",
              kind: "uups",
              ...deploymentConfig.gasOverrides
            }
          );
        } else {
          strategy = await deployProxyWithRetries(
            Strategy,
            [registryAddress],
            {
              initializer: "initialize",
              kind: "uups",
              ...deploymentConfig.gasOverrides
            }
          );
        }

        const strategyAddress = await strategy.getAddress();
        const strategyName = contractName.replace(/^Strategy/, "");
        
        const tx = await registry.addStrategy(strategyName, strategyAddress, deploymentConfig.gasOverrides);
        await tx.wait();
        
        console.log(`✅ Registered strategy: ${strategyName} at ${strategyAddress}`);
        strategyInfo[contractName] = strategyAddress;
      } catch (error) {
        console.error(`❌ Failed to deploy ${contractName}: ${error.message}`);
        // Continue with next strategy instead of failing the whole deployment
      }
    }

    // Save deployment info
    const deploymentInfo = {
      network,
      timestamp: new Date().toISOString(),
      Registry: registryAddress,
      StrategyExecutor: strategyExecutorAddress,
      FlashloanExecutor: flashloanExecutorAddress,
      PMMS: pmmsAddress,
      TokenAddresses: tokenAddresses,
      Strategies: strategyInfo
    };

    const deploymentPath = path.join(deploymentsDir, `deployment-${network}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`💾 Deployment info saved to ${deploymentPath}`);

    // Update .env
    const envUpdates = [
      `\n# PMMS Deployment (${network}) - ${new Date().toISOString()}`,
      `REGISTRY_ADDRESS=${registryAddress}`,
      `STRATEGY_EXECUTOR_ADDRESS=${strategyExecutorAddress}`,
      `FLASHLOAN_EXECUTOR_ADDRESS=${flashloanExecutorAddress}`,
      `PMMS_ADDRESS=${pmmsAddress}`,
      ...Object.entries(tokenAddresses).map(([key, value]) => `${key}_ADDRESS=${value}`),
      ...Object.entries(strategyInfo).map(([key, value]) => `${key.toUpperCase()}_ADDRESS=${value}`)
    ];

    const envPath = path.join(__dirname, "../.env");
    fs.appendFileSync(envPath, envUpdates.join("\n"));
    console.log("🔧 .env file updated with contract addresses");

    console.log("✅ Deployment completed successfully!");
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main();