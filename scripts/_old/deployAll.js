const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");

async function main() {
  // Validate environment variables
  const INITIAL_OWNER = process.env.OWNER_ADDRESS;
  if (!INITIAL_OWNER) {
    throw new Error("Missing OWNER_ADDRESS in .env");
  }
  if (!process.env.PRIVATE_KEY) {
    throw new Error("Missing PRIVATE_KEY in .env");
  }

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  if (deployer.address.toLowerCase() !== "0xe0282d77cf60ba484e13d24fd5686a6618f09a3b") {
    console.warn("WARNING: Deployer address does not match expected 0xE0282D77...");
  }

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
  if (balance === 0n) {
    throw new Error("Deployer has no ETH for gas");
  }

  // Deploy mocks for localhost
  let usdtAddress, usdcAddress, UNISWAP_V2_ROUTER, CURVE_3POOL;
  if (hre.network.name === "localhost") {
    console.log("Deploying MockUSDT...");
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy({ gasLimit: 3000000 });
    await mockUSDT.waitForDeployment();
    usdtAddress = await mockUSDT.getAddress();
    console.log("MockUSDT deployed to:", usdtAddress);

    console.log("Deploying MockUSDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy({ gasLimit: 3000000 });
    await mockUSDC.waitForDeployment();
    usdcAddress = await mockUSDC.getAddress();
    console.log("MockUSDC deployed to:", usdcAddress);

    console.log("Deploying MockUniswapV2Router...");
    const UniswapRouter = await ethers.getContractFactory("MockUniswapV2Router");
    const uniswapRouter = await UniswapRouter.deploy({ gasLimit: 3000000 });
    await uniswapRouter.waitForDeployment();
    UNISWAP_V2_ROUTER = await uniswapRouter.getAddress();
    console.log("MockUniswapV2Router deployed to:", UNISWAP_V2_ROUTER);

    console.log("Deploying MockCurve3Pool...");
    const CurvePool = await ethers.getContractFactory("MockCurve3Pool");
    const curvePool = await CurvePool.deploy({ gasLimit: 3000000 });
    await curvePool.waitForDeployment();
    CURVE_3POOL = await curvePool.getAddress();
    console.log("MockCurve3Pool deployed to:", CURVE_3POOL);
  } else {
    usdtAddress = process.env.USDT_ADDRESS;
    usdcAddress = process.env.USDC_ADDRESS;
    UNISWAP_V2_ROUTER = process.env.UNISWAP_V2_ROUTER;
    CURVE_3POOL = process.env.CURVE_3POOL;
    if (!usdtAddress || !usdcAddress || !UNISWAP_V2_ROUTER || !CURVE_3POOL) {
      throw new Error("Missing Skale addresses in .env (USDT_ADDRESS, USDC_ADDRESS, UNISWAP_V2_ROUTER, CURVE_3POOL)");
    }
  }

  // Deploy Registry
  console.log("Deploying Registry...");
  const Registry = await ethers.getContractFactory(
    hre.network.name === "localhost" ? "MockRegistry" : "Registry"
  );
  const registry = await Registry.deploy({ gasLimit: 3000000 });
  console.log("Registry deployment tx:", registry.deployTransaction.hash);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("Registry deployed to:", registryAddress);

  // Register addresses in Registry
  console.log("Registering addresses in Registry...");
  const registryContract = await ethers.getContractAt(
    hre.network.name === "localhost" ? "MockRegistry" : "Registry",
    registryAddress
  );
  const addresses = {
    USDC: usdcAddress,
    USDT: usdtAddress,
    UNISWAP_V2: UNISWAP_V2_ROUTER,
    CURVE_3POOL: CURVE_3POOL,
  };
  for (const [key, addr] of Object.entries(addresses)) {
    if (!addr || addr === "0x0000000000000000000000000000000000000000") {
      throw new Error(`Invalid address for ${key}: ${addr}`);
    }
    try {
      const tx = await registryContract.setAddress(key, addr, { gasLimit: 1000000 });
      await tx.wait();
      console.log(`Registered ${key}: ${addr}`);
    } catch (error) {
      console.error(`Failed to register ${key}:`, error.message);
      throw error;
    }
  }

  // Verify registry addresses
  console.log("Verifying registry addresses...");
  for (const key of ["USDC", "USDT", "UNISWAP_V2", "CURVE_3POOL"]) {
    const addr = await registryContract.getAddress(key);
    console.log(`${key}: ${addr}`);
    if (addr === "0x0000000000000000000000000000000000000000") {
      throw new Error(`Registry address for ${key} is zero`);
    }
  }

  // Deploy FlashloanExecutor
  console.log("Deploying FlashloanExecutor...");
  const FlashloanExecutor = await ethers.getContractFactory(
    hre.network.name === "localhost" ? "MockFlashloanExecutor" : "FlashloanExecutor"
  );
  const flashloanExecutor = await FlashloanExecutor.deploy(UNISWAP_V2_ROUTER, INITIAL_OWNER, { gasLimit: 3000000 });
  console.log("FlashloanExecutor deployment tx:", flashloanExecutor.deployTransaction.hash);
  await flashloanExecutor.waitForDeployment();
  const executorAddress = await flashloanExecutor.getAddress();
  console.log("FlashloanExecutor deployed to:", executorAddress);

  // Deploy StrategyStablecoinPegArbitrage
  console.log("Deploying StrategyStablecoinPegArbitrage...");
  const Strategy = await ethers.getContractFactory("StrategyStablecoinPegArbitrage");
  let strategy;
  try {
    strategy = await Strategy.deploy(registryAddress, { gasLimit: 3000000 });
    console.log("Strategy deployment tx:", strategy.deployTransaction.hash);
    await strategy.waitForDeployment();
  } catch (error) {
    console.error("Strategy deployment failed:", error.message);
    throw error;
  }
  const strategyAddress = await strategy.getAddress();
  console.log("StrategyStablecoinPegArbitrage deployed to:", strategyAddress);

  // Update .env
  const envUpdate = `
REGISTRY_ADDRESS=${registryAddress}
FLASHLOAN_EXECUTOR_ADDRESS=${executorAddress}
PROFIT_MAXIMIZER_STRATEGY_ADDRESS=${strategyAddress}
USDT_ADDRESS=${usdtAddress}
USDC_ADDRESS=${usdcAddress}
UNISWAP_V2_ROUTER=${UNISWAP_V2_ROUTER}
CURVE_3POOL=${CURVE_3POOL}
`;
  fs.writeFileSync(".env", envUpdate, { flag: "a" });
  console.log("Updated .env with addresses");

  // Deploy ProfitMaximizerModularSystem
  console.log("Deploying ProfitMaximizerModularSystem...");
  const ProfitMaximizer = await ethers.getContractFactory("ProfitMaximizerModularSystem");
  const profitMaximizer = await ProfitMaximizer.deploy(
    registryAddress,
    executorAddress,
    INITIAL_OWNER,
    { gasLimit: 5000000 }
  );
  console.log("ProfitMaximizer deployment tx:", profitMaximizer.deployTransaction.hash);
  await profitMaximizer.waitForDeployment();
  const profitAddress = await profitMaximizer.getAddress();
  console.log("ProfitMaximizer deployed to:", profitAddress);

  // Verify contract address
  if (!ethers.isAddress(profitAddress)) {
    throw new Error("Invalid ProfitMaximizer address");
  }

  // Attach to deployed contract
  const deployedContract = await ethers.getContractAt("ProfitMaximizerModularSystem", profitAddress);
  console.log("Attached to ProfitMaximizer at:", deployedContract.target);

  // Register strategy
  console.log("Registering StablecoinPegArbitrage strategy...");
  await deployedContract.addStrategy("StablecoinPegArbitrage", strategyAddress, { gasLimit: 1000000 });
  console.log("Strategy registered");

  // Save deployed bytecode
  const deployedBytecode = await ethers.provider.getCode(profitAddress);
  console.log("ProfitMaximizer Bytecode:", deployedBytecode);

  // Save deployment info
  const saveDeploymentInfo = (contractName, contractInstance, networkName) => {
    const deploymentInfo = {
      address: contractInstance.target,
      abi: contractInstance.interface.formatJson(),
      bytecode: deployedBytecode,
      network: networkName,
    };
    const filePath = `./deployments/${contractName}-${networkName}.json`;
    fs.mkdirSync("./deployments", { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`Deployment info saved to ${filePath}`);
  };
  saveDeploymentInfo("ProfitMaximizer", deployedContract, hre.network.name);

  // Update .env
  fs.writeFileSync(".env", `\nPROFIT_MAXIMIZER_ADDRESS=${profitAddress}`, { flag: "a" });
  console.log("Updated .env with PROFIT_MAXIMIZER_ADDRESS");

  // Verify contracts on Blockscout
  if (hre.network.name !== "localhost") {
    console.log("Verifying contracts on Blockscout...");
    try {
      await hre.run("verify:verify", {
        address: registryAddress,
        constructorArguments: [],
      });
      console.log("Registry verified successfully.");

      await hre.run("verify:verify", {
        address: executorAddress,
        constructorArguments: [UNISWAP_V2_ROUTER, INITIAL_OWNER],
      });
      console.log("FlashloanExecutor verified successfully.");

      await hre.run("verify:verify", {
        address: strategyAddress,
        constructorArguments: [registryAddress],
      });
      console.log("StrategyStablecoinPegArbitrage verified successfully.");

      await hre.run("verify:verify", {
        address: profitAddress,
        constructorArguments: [registryAddress, executorAddress, INITIAL_OWNER],
      });
      console.log("ProfitMaximizer verified successfully.");
    } catch (error) {
      console.error("Verification failed:", error.message);
    }
  }

  // Event listener
  console.log("Setting up event listener for StrategyExecuted...");
  deployedContract.on("StrategyExecuted", (name, strategy, success, event) => {
    console.log(`StrategyExecuted Event:
      Name: ${name}
      Strategy: ${strategy}
      Success: ${success}
      Block: ${event.blockNumber}`);
  });

  console.log("Event listeners active. Keeping script running...");
  await new Promise(() => {});
}

main()
  .then(() => console.log("Deployment and verification completed"))
  .catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });