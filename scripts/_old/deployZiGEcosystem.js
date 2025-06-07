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
        await hre.run("verify:verify", {
          address: contractAddress,
          constructorArguments: args,
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
    _name,
    _symbol
  ) => {
    const ZiGT = await ethers.getContractFactory("ZiGT");
    const zigt = await ZiGT.deploy(_router, _governance, _owner, _model, _ratio);
    await zigt.waitForDeployment();
    const zigtAddress = zigt.target;

    console.log(`Deployed ZiGT (${_symbol}): ${zigtAddress}`);

    // Attempt initialization if the contract has an initialize function
    try {
      // Check if the contract has an 'initialize' function before calling it
      const hasInitialize = zigt.interface.hasFunction('initialize');
      if (hasInitialize) {
        const tx = await zigt.initialize(_model);
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
  const StrategicDirection = {
    ZiGMirrorModel: 0,
    Famous8PlusZAR: 1,
    PanAfroEurasianModel: 2,
    G20ReserveModel: 3,
    ReparationsModel: 4, // This matches the existing ZiGT deployment in the original JS script
  };

  // Store all deployed contract addresses
  const deployedContracts = {};

  // --- Deployments from original Hardhat script (ZiG Ecosystem) ---

  // 1. Deploy FeedRegistry (non-upgradeable)
  const { address: feedRegistryAddress } = await deployContract("FeedRegistry");
  deployedContracts.FeedRegistry = feedRegistryAddress;
    
  // 2. Deploy AccessVerifier (upgradeable)
  const { address: accessVerifierAddress } = await deployContract("AccessVerifier", [], true);
  deployedContracts.AccessVerifier = accessVerifierAddress;
    
  // 3. Deploy Governance Token (upgradeable) - This is ZiGGovernanceToken, not ZiGGovernance
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
  const { address: redistributionVaultAddress } = await deployContract("RedistributionVault", [
    governanceTokenAddress, // Use the address directly
    deployer.address, // Pan-African Treasury
    deployer.address, // Diaspora Development Pool
    deployer.address, // Historical Restitution Fund
    2500 // 25% min share
  ], true);
  deployedContracts.RedistributionVault = redistributionVaultAddress;
    
  // 5. Deploy Main ZiGT Token (non-upgradeable) - This was already present, using REPARATIONS_MODEL
  const { contract: ziGT, address: ziGTAddress } = await deployContract("ZiGT", [
    ROUTER_ADDRESS, // CCIP Router from .env
    deployer.address, // Governance (placeholder, replace with actual governance address if different)
    deployer.address, // Owner (placeholder, replace with actual owner address if different)
    StrategicDirection.ReparationsModel, // REPARATIONS_MODEL strategy (using enum)
    { metals: 6000, fiat: 3000, crypto: 1000 } // Reserve ratio
  ]);
  deployedContracts.ZiGT = ziGTAddress;
    
  // 6. Deploy Additional Modules (non-upgradeable)
  const { address: soulNFTAddress } = await deployContract("SoulReparationNFT", [deployer.address]);
  deployedContracts.SoulReparationNFT = soulNFTAddress;

  const { address: rwaTokenAddress } = await deployContract("ZiGRWAToken", [
    ethers.parseEther("1000000")
  ]);
  deployedContracts.ZiGRWAToken = rwaTokenAddress;

  // --- Deployments from Foundry script (DeployAndVerifyAll.s.sol) ---

  // Deploy ZiGGovernance (distinct from ZiGGovernanceToken)
  const { contract: ziggovernance, address: ziggovernanceAddress } = await deployContract("ZiGGovernance", [
    ROUTER_ADDRESS,
    "ZiG Governance",
    "ZGTGOV",
    "1.0"
  ]);
  deployedContracts.ZiGGovernance = ziggovernanceAddress;

  // Deploy All Strategic Models with Reserve Ratios (ZiGT variants)
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
  const { address: utilityAddress } = await deployContract("ZiGUtilityToken", [ethers.parseEther("1000000"), deployer.address]);
  deployedContracts.ZiGUtilityToken = utilityAddress;

  // ZiGGovernanceToken is already deployed as upgradeable above, so we skip this non-upgradeable version
  // const { address: govAddress } = await deployContract("ZiGGovernanceToken", [deployer.address, ethers.parseEther("1000000"), deployer.address]);
  // deployedContracts.ZiGGovernanceToken = govAddress;

  const { address: memeAddress } = await deployContract("ZiGMemeToken", [ethers.parseEther("1000000")]);
  deployedContracts.ZiGMemeToken = memeAddress;

  const { address: nftAddress } = await deployContract("ZiGNFT", [deployer.address]);
  deployedContracts.ZiGNFT = nftAddress;

  const { address: sbtAddress } = await deployContract("ZiGSoulboundToken", [deployer.address]);
  deployedContracts.ZiGSoulboundToken = sbtAddress;

  // ZiGRWAToken is already deployed above, so we skip this duplicate
  // const { address: rwaAddress } = await deployContract("ZiGRWAToken", [ethers.parseEther("1000000")]);
  // deployedContracts.ZiGRWAToken = rwaAddress;

  const { address: gamefiAddress } = await deployContract("ZiGGameFiToken", [ethers.parseEther("1000000")]);
  deployedContracts.ZiGGameFiToken = gamefiAddress;


  // --- Initialize Ecosystem Connections (from original Hardhat script) ---
  console.log("Initializing ecosystem connections...");
  
  // Ensure ziGT and redistributionVault are available from their deployments
  // If ziGT was deployed with REPARATIONS_MODEL, its setReparationsModel call is relevant.
  // Assuming `ziGT` refers to the main ZiGT token deployed earlier in this script.
  const mainZiGTContract = await ethers.getContractAt("ZiGT", ziGTAddress); // Get contract instance by address
  const redistributionVaultContract = await ethers.getContractAt("RedistributionVault", redistributionVaultAddress);
  const accessVerifierContract = await ethers.getContractAt("AccessVerifier", accessVerifierAddress);
  const governanceTokenContract = await ethers.getContractAt("ZiGGovernanceToken", governanceTokenAddress);

  const tx1 = await mainZiGTContract.setReparationsModel(redistributionVaultAddress);
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