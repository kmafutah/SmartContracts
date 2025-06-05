const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
    
  console.log("Deploying ZiG Ecosystem with account:", deployer.address);
    
  // Environment variables from .env
  const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS;
  const CHAIN_ID = process.env.CHAIN_ID;

  if (!ROUTER_ADDRESS) {
    throw new Error("ROUTER_ADDRESS not set in .env");
  }
  if (!CHAIN_ID) {
    throw new Error("CHAIN_ID not set in .env");
  }

  // Helper function for deployment with error handling
  const deployContract = async (contractName, args = [], isUpgradeable = false) => {
    try {
      const Factory = await ethers.getContractFactory(contractName);
      let contract;
      let contractAddress;
            
      if (isUpgradeable) {
        contract = await upgrades.deployProxy(Factory, args);
        await contract.waitForDeployment(); // Wait for deployment
        contractAddress = await contract.target; // Use .target for Ethers v6
      } else {
        contract = await Factory.deploy(...args);
        await contract.waitForDeployment(); // Wait for deployment
        contractAddress = await contract.target; // Use .target for Ethers v6
      }
            
      console.log(`${contractName} deployed to:`, contractAddress);
      
      // Attempt verification
      try {
        // Hardhat's verify task needs to be run using `hre.run`
        await hre.run("verify:verify", {
          address: contractAddress,
          constructorArguments: args,
          // For upgradeable contracts, proxy verification needs additional config if not automatically detected
          // If this fails for proxies, you might need to specify contract path or `proxy: true`
        });
        console.log(`Contract ${contractName} verified successfully.`);
      } catch (verifyError) {
        console.error(`Verification failed for ${contractName}:`, verifyError.message);
      }

      return { contract, address: contractAddress }; // Return both contract and address
    } catch (error) {
      console.error(`Error deploying ${contractName}:`, error);
      throw error;
    }
  };

  // Helper function for deploying ZiGT tokens (from Foundry script logic)
  const deployZiGTToken = async (
    _router,
    _governance,
    _owner,
    _model, // StrategicDirection enum value (number)
    _ratio, // ReserveRatio struct object
    _name, // Name (for logging)
    _symbol // Symbol (for logging)
  ) => {
    const ZiGT = await ethers.getContractFactory("ZiGT");
    // Ensure the constructor arguments match ZiGT.sol
    const zigt = await ZiGT.deploy(_router, _governance, _owner, _model, _ratio);
    await zigt.waitForDeployment();
    const zigtAddress = zigt.target;

    console.log(`Deployed ZiGT (${_symbol}): ${zigtAddress}`);

    // Attempt initialization if the contract has an initialize function
    // For non-upgradeable contracts, `initialize` might not be present or needed.
    // The generated ZiGT.sol doesn't have an initialize function, so this will likely log the else branch.
    try {
      const hasInitialize = zigt.interface.hasFunction('initialize');
      if (hasInitialize) {
        const tx = await zigt.initialize(_model); // Assuming initialize takes model if present
        await tx.wait();
        console.log(`Initialized strategy for ${_symbol}`);
      } else {
        console.log(`ZiGT (${_symbol}) does not have an 'initialize' function or it's not exposed.`);
      }
    } catch (initError) {
      console.error(`Error initializing strategy for ${_symbol}:`, initError.message);
    }

    // Verify the ZiGT contract
    try {
      await hre.run("verify:verify", {
        address: zigtAddress,
        constructorArguments: [_router, _governance, _owner, _model, _ratio],
      });
      console.log(`ZiGT (${_symbol}) verified successfully.`);
    } catch (verifyError) {
      console.error(`Verification failed for ZiGT (${_symbol}):`, verifyError.message);
    }
    return zigtAddress;
  };

  // Define StrategicDirection enum values (verify these against your ZiGT.sol contract)
  // These values must match the enum in ZiGT.sol and ReparationsModel.sol
  const StrategicDirection = {
    ZiGMirrorModel: 0,
    Famous8PlusZAR: 1,
    PanAfroEurasianModel: 2,
    G20ReserveModel: 3,
    ReparationsModel: 4, 
  };

  // Store all deployed contract addresses
  const deployedContracts = {};

  // --- Deployments from original Hardhat script (ZiG Ecosystem) ---

  // 1. Deploy FeedRegistry (Now deployed as upgradeable)
  const { address: feedRegistryAddress } = await deployContract("FeedRegistry", [], true);
  deployedContracts.FeedRegistry = feedRegistryAddress;
    
  // 2. Deploy AccessVerifier (upgradeable)
  const { address: accessVerifierAddress } = await deployContract("AccessVerifier", [], true);
  deployedContracts.AccessVerifier = accessVerifierAddress;
    
  // 3. Deploy Governance Token (upgradeable) - This is ZiGGovernanceToken
  const { contract: governanceToken, address: governanceTokenAddress } = await deployContract("ZiGGovernanceToken", [
    deployer.address, // Treasury
    ethers.parseEther("1000000"), // Initial supply
    deployer.address // Initial owner
  ], true);
  deployedContracts.GovernanceToken = governanceTokenAddress;
    
  // Debug: Log governanceToken address
  console.log("ZiGGovernanceToken address:", governanceTokenAddress);
  if (!governanceTokenAddress || !ethers.isAddress(governanceTokenAddress)) {
    throw new Error("Invalid governanceToken address");
  }

  // 4. Deploy RedistributionVault (upgradeable)
  // It expects an ERC20 token address in its constructor. We use the newly deployed governanceTokenAddress.
  const { address: redistributionVaultAddress } = await deployContract("RedistributionVault", [
    governanceTokenAddress, // ERC20 token address for the vault to manage
    deployer.address, // Pan-African Treasury
    deployer.address, // Diaspora Development Pool
    deployer.address, // Historical Restitution Fund
    2500 // 25% min share
  ], true);
  deployedContracts.RedistributionVault = redistributionVaultAddress;
    
  // 5. Deploy Main ZiGT Token (non-upgradeable)
  // The ZiGT contract's constructor requires: _router, _governance, _owner, _model, _ratio
  const { contract: ziGT, address: ziGTAddress } = await deployContract("ZiGT", [
    ROUTER_ADDRESS, // CCIP Router from .env
    deployer.address, // Governance (placeholder for now, replace with actual ZiGGovernance address if known before this step)
    deployer.address, // Owner
    StrategicDirection.ReparationsModel, // REPARATIONS_MODEL strategy
    { metals: 6000, fiat: 3000, crypto: 1000 } // Reserve ratio
  ]);
  deployedContracts.ZiGT = ziGTAddress;
    
  // 6. Deploy Additional Modules (non-upgradeable)
  const { address: soulNFTAddress } = await deployContract("SoulReparationNFT", [deployer.address]);
  deployedContracts.SoulReparationNFT = soulNFTAddress;

  const { address: rwaTokenAddress } = await deployContract("ZiGRWAToken", [
    ethers.parseEther("1000000") // Initial supply
  ]);
  deployedContracts.ZiGRWAToken = rwaTokenAddress;

  // --- Deployments from Foundry script (DeployAndVerifyAll.s.sol) ---

  // Deploy ZiGGovernance (distinct from ZiGGovernanceToken)
  // ZiGGovernance constructor expects: _router, _name, _symbol, _version
  const { contract: ziggovernance, address: ziggovernanceAddress } = await deployContract("ZiGGovernance", [
    ROUTER_ADDRESS,
    "ZiG Governance",
    "ZGTGOV",
    "1.0"
  ]);
  deployedContracts.ZiGGovernance = ziggovernanceAddress;

  // Deploy All Strategic Models with Reserve Ratios (ZiGT variants)
  // These will use the `deployZiGTToken` helper
  const zigtTokens = [];
  zigtTokens.push(await deployZiGTToken(ROUTER_ADDRESS, ziggovernanceAddress, deployer.address, StrategicDirection.ZiGMirrorModel, { metals: 5000, fiat: 4000, crypto: 1000 }, "ZiG Stablecoin", "ZiG-S"));
  zigtTokens.push(await deployZiGTToken(ROUTER_ADDRESS, ziggovernanceAddress, deployer.address, StrategicDirection.Famous8PlusZAR, { metals: 6000, fiat: 3000, crypto: 1000 }, "Stability-Oriented ZiG", "ZiG-SO"));
  zigtTokens.push(await deployZiGTToken(ROUTER_ADDRESS, ziggovernanceAddress, deployer.address, StrategicDirection.Famous8PlusZAR, { metals: 4000, fiat: 3000, crypto: 3000 }, "Digital Forward ZiG", "ZiG-DF"));
  zigtTokens.push(await deployZiGTToken(ROUTER_ADDRESS, ziggovernanceAddress, deployer.address, StrategicDirection.Famous8PlusZAR, { metals: 5000, fiat: 2000, crypto: 3000 }, "Geopolitical Hedge ZiG", "ZiG-GH"));
  zigtTokens.push(await deployZiGTToken(ROUTER_ADDRESS, ziggovernanceAddress, deployer.address, StrategicDirection.Famous8PlusZAR, { metals: 5500, fiat: 2500, crypto: 2000 }, "Afro-Centric ZiG", "ZiG-AC"));
  zigtTokens.push(await deployZiGTToken(ROUTER_ADDRESS, ziggovernanceAddress, deployer.address, StrategicDirection.PanAfroEurasianModel, { metals: 3500, fiat: 5500, crypto: 1000 }, "Afrocontinental ZiG", "ZiG-AF"));
  zigtTokens.push(await deployZiGTToken(ROUTER_ADDRESS, ziggovernanceAddress, deployer.address, StrategicDirection.G20ReserveModel, { metals: 4500, fiat: 4500, crypto: 1000 }, "G20 Reserve ZiG", "ZiG-G20"));
  zigtTokens.push(await deployZiGTToken(ROUTER_ADDRESS, ziggovernanceAddress, deployer.address, StrategicDirection.ReparationsModel, { metals: 10000, fiat: 0, crypto: 0 }, "Ma'at Reparations Token", "ZiG-MAAT"));

  zigtTokens.forEach((addr, index) => {
    deployedContracts[`ZiGT_Variant_${index}`] = addr;
  });

  // Deploy Pan-African Ecosystem Tokens (non-upgradeable)
  // ZiGUtilityToken constructor: _initialSupply, _owner
  const { address: utilityAddress } = await deployContract("ZiGUtilityToken", [ethers.parseEther("1000000"), deployer.address]);
  deployedContracts.ZiGUtilityToken = utilityAddress;

  // ZiGMemeToken constructor: _initialSupply
  const { address: memeAddress } = await deployContract("ZiGMemeToken", [ethers.parseEther("1000000")]);
  deployedContracts.ZiGMemeToken = memeAddress;

  // ZiGNFT constructor: initialOwner
  const { address: nftAddress } = await deployContract("ZiGNFT", [deployer.address]);
  deployedContracts.ZiGNFT = nftAddress;

  // ZiGSoulboundToken constructor: initialOwner
  const { address: sbtAddress } = await deployContract("ZiGSoulboundToken", [deployer.address]);
  deployedContracts.ZiGSoulboundToken = sbtAddress;

  // ZiGGameFiToken constructor: _initialSupply
  const { address: gamefiAddress } = await deployContract("ZiGGameFiToken", [ethers.parseEther("1000000")]);
  deployedContracts.ZiGGameFiToken = gamefiAddress;


  // --- Initialize Ecosystem Connections ---
  console.log("Initializing ecosystem connections...");
  
  // Get contract instances to call functions
  // Note: mainZiGTContract was already deployed above
  const mainZiGTContract = await ethers.getContractAt("ZiGT", ziGTAddress); 
  const redistributionVaultContract = await ethers.getContractAt("RedistributionVault", redistributionVaultAddress);
  const accessVerifierContract = await ethers.getContractAt("AccessVerifier", accessVerifierAddress);
  const governanceTokenContract = await ethers.getContractAt("ZiGGovernanceToken", governanceTokenAddress);
  
  // Important: If ReparationsModel was deployed before mainZiGTContract,
  // we need to set its paymentToken and zigtToken correctly.
  // The script currently deploys ReparationsModel indirectly via ZiGT's internal logic or via another model.
  // Let's assume there's a specific ReparationsModel instance to initialize.
  // If `ReparationsModel` is *also* deployed as a standalone contract, we'd need its address here.
  // Based on the script, `ReparationsModel` seems to be the strategy for `ZiGT`.
  // The `setReparationsModel` call on `mainZiGTContract` suggests ZiGT manages a link to a ReparationsModel.

  // The `ReparationsModel` contract itself is upgradeable and needs initialization.
  // We need to deploy `ReparationsModel` itself.
  // Assuming `ReparationsModel` is indeed a standalone upgradeable contract that will be linked.
  // It needs paymentToken and zigtToken for its constructor (which is minimal for upgradeable),
  // and then _zigtToken, _vault, _verifier, _dao, _oracleRouter for initialize.
  // Let's use governanceTokenAddress as a placeholder for paymentToken for now,
  // and ziGTAddress for zigtToken, and the newly deployed ZiGGovernance for DAO,
  // and ZiGOracleHub for oracleRouter.

  const { address: reparationsModelAddress } = await deployContract("ReparationsModel", [], true);
  deployedContracts.ReparationsModel = reparationsModelAddress;

  const reparationsModelContract = await ethers.getContractAt("ReparationsModel", reparationsModelAddress);
  const ziGOracleHubContract = await ethers.getContractAt("ZiGOracleHub", deployedContracts.ZiGOracleHub); // Assuming ZiGOracleHub is deployed later

  // Initialize ReparationsModel
  await reparationsModelContract.initialize(
    ziGTAddress, // _zigtToken
    redistributionVaultAddress, // _vault
    accessVerifierAddress, // _verifier
    ziggovernanceAddress, // _dao (Using ZiGGovernance as DAO placeholder)
    deployedContracts.ZiGOracleHub // _oracleRouter (Will be defined after ZiGOracleHub deployment)
  );
  console.log("ReparationsModel initialized.");


  const tx1 = await mainZiGTContract.setReparationsModel(reparationsModelAddress); // Use the actual ReparationsModel address
  await tx1.wait();
  console.log("Main ZiGT setReparationsModel transaction confirmed.");
    
  const tx2 = await accessVerifierContract.setAfrican(deployer.address, true);
  await tx2.wait();
  console.log("AccessVerifier setAfrican transaction confirmed.");
    
  const tx3 = await governanceTokenContract.mint(deployer.address, ethers.parseEther("50000"));
  await tx3.wait();
  console.log("GovernanceToken mint transaction confirmed.");

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    contracts: deployedContracts, // Save all deployed contracts
    deployer: deployer.address,
    timestamp: Date.now()
  };

  fs.writeFileSync("deployment.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });