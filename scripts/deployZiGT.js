const { ethers, upgrades, network, hre } = require("hardhat");

// Network-specific Chainlink feed addresses
const chainlinkFeeds = {
  sepolia: {
    XAUUSD: "0xC5981F461d74c46eB4b0CF3e4c5D4D6c28d0A3B3", // Gold/USD
    BTCUSD: "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43", // BTC/USD
    ETHUSD: "0x694AA1769357215DE4FAC081bf1f309aDC325306", // ETH/USD
    AUDUSD: "0x79E3C9D160CEd6F49dB8686C5Db89F4D6666e676", // AUD/USD
    EURUSD: "0x1a81afB8146aeFfCFc5E50e8479e826E7D55b910", // EUR/USD (placeholder, verify)
    USDZAR: "0x0000000000000000000000000000000000000000", // No Sepolia feed
    GBPUSD: "0x91FAB41F0339503bCec3487742f1bC40727B4B4F", // GBP/USD
    USDCHF: "0x5e4D323C8EBB25b2d7D60e75E2A82C444E3fb8b6", // USD/CHF
    USDJPY: "0x853B4eE171A17C8A8fA420B2dD6BE2762CB7Ad13", // USD/JPY
    NZDUSD: "0x0000000000000000000000000000000000000000", // No Sepolia feed
    BNBUSD: "0x2fF1EB7B8ae4B6bC573b8fA776aAC565F3A0D5B2", // BNB/USD
  },
  mainnet: {
    XAUUSD: "0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6",
    BTCUSD: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c",
    ETHUSD: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    AUDUSD: "0x77F9710E7d0A19669A13c055F62cd80d313dF022",
    EURUSD: "0x1a81afB8146aeFfCFc5E50e8479e826E7D55b910",
    USDZAR: "0xDE1952A1bF53f8E558cc761ad2564884E55B2c6F",
    GBPUSD: "0x1692Bdd32F31b831caAc1b0c9fAF68613682813b",
    USDCHF: "0x449d117117838fF37B2a2d366AA2193cCF642690",
    USDJPY: "0xBcE206caE7f0ec07b5456536b7067702080554e1",
    NZDUSD: "0xB98CF9b4e2fCCF56B9fF0eB29A7E6c4fE0b11f4e",
    BNBUSD: "0x14e613ac84a31f709eAdbDf89c6cC390fDc29c9C",
  },
  // Add Skale, Polygon, etc., as needed
};

// Band Protocol feeds (placeholders)
const bandFeeds = {
  XAUUSD: "0x0000000000000000000000000000000000000000",
  BTCUSD: "0x0000000000000000000000000000000000000000",
  ETHUSD: "0x0000000000000000000000000000000000000000",
  AUDUSD: "0x0000000000000000000000000000000000000000",
  EURUSD: "0x0000000000000000000000000000000000000000",
  USDZAR: "0x0000000000000000000000000000000000000000",
  GBPUSD: "0x0000000000000000000000000000000000000000",
  USDCHF: "0x0000000000000000000000000000000000000000",
  USDJPY: "0x0000000000000000000000000000000000000000",
  NZDUSD: "0x0000000000000000000000000000000000000000",
  BNBUSD: "0x0000000000000000000000000000000000000000",
};

async function main() {
  // Configuration from your settings
  const settings = {
    ReserveModels: {
      "Stability-Oriented": { Metals: 0.6, Fiat: 0.3, Crypto: 0.1 },
      "Digital Forward": { Metals: 0.4, Fiat: 0.3, Crypto: 0.3 },
      "Geopolitical Hedge": { Metals: 0.5, Fiat: 0.2, Crypto: 0.3 },
      "Afro-centric Trust": { Metals: 0.55, Fiat: 0.25, Crypto: 0.2 },
      "ZiG Hybrid": { Metals: 0.5, Fiat: 0.4, Crypto: 0.1 },
    },
    StrategicModels: {
      "Famous 8 + ZAR": {
        feeds: {
          Metals: ["XAUUSD"],
          Fiat: ["AUDUSD", "EURUSD", "USDZAR", "GBPUSD", "USDCHF", "USDJPY", "NZDUSD"],
          Crypto: ["BTCUSD", "ETHUSD", "BNBUSD"],
        },
        formulas: {
          "Stability-Oriented": {
            Metals: { XAUUSD: 0.6 },
            Fiat: {
              AUDUSD: -0.04,
              EURUSD: 0.05,
              USDZAR: 0.06,
              GBPUSD: 0.05,
              USDCHF: -0.02,
              USDJPY: -0.02,
              NZDUSD: 0.04,
            },
            Crypto: { BTCUSD: 0.05, ETHUSD: 0.03, BNBUSD: 0.02 },
          },
          "Digital Forward": {
            Metals: { XAUUSD: 0.4 },
            Fiat: {
              AUDUSD: -0.04,
              EURUSD: 0.05,
              USDZAR: 0.06,
              GBPUSD: 0.05,
              USDCHF: -0.02,
              USDJPY: -0.02,
              NZDUSD: 0.04,
            },
            Crypto: { BTCUSD: 0.12, ETHUSD: 0.1, BNBUSD: 0.08 },
          },
          "Geopolitical Hedge": {
            Metals: { XAUUSD: 0.5 },
            Fiat: {
              AUDUSD: -0.03,
              EURUSD: 0.04,
              USDZAR: 0.05,
              GBPUSD: 0.03,
              USDCHF: -0.02,
              NZDUSD: 0.03,
            },
            Crypto: { BTCUSD: 0.15, ETHUSD: 0.09, BNBUSD: 0.06 },
          },
          "Afro-centric Trust": {
            Metals: { XAUUSD: 0.55 },
            Fiat: {
              AUDUSD: -0.03,
              EURUSD: 0.04,
              USDZAR: 0.06,
              GBPUSD: 0.04,
              USDCHF: -0.02,
            },
            Crypto: { BTCUSD: 0.08, ETHUSD: 0.07, BNBUSD: 0.05 },
          },
        },
      },
      "ZiG Mirror Model": {
        feeds: {
          Metals: ["XAUUSD"],
          Fiat: ["AUDUSD", "USDZAR", "EURUSD", "GBPUSD"],
          Crypto: ["BTCUSD", "ETHUSD", "BNBUSD"],
        },
        formulas: {
          "ZiG Hybrid": {
            Metals: { XAUUSD: 0.5 },
            Fiat: {
              AUDUSD: -0.1,
              USDZAR: 0.1,
              EURUSD: 0.1,
              GBPUSD: 0.05,
            },
            Crypto: { BTCUSD: 0.1, ETHUSD: 0.06, BNBUSD: 0.04 },
          },
        },
      },
    },
  };

  // Placeholder addresses (replace via .env)
  const paymentToken = process.env.PAYMENT_TOKEN || "0x0000000000000000000000000000000000000000";
  const maxPriceAge = 3600; // 1 hour
  const decimals = 8; // Standard for Chainlink price feeds

  // Validate network-specific feeds
  const feedsForNetwork = chainlinkFeeds[network.name] || chainlinkFeeds.sepolia;
  if (!feedsForNetwork) {
    throw new Error(`No Chainlink feeds configured for network: ${network.name}`);
  }

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Check balance for non-zero-gas networks
  if (["sepolia", "mainnet", "polygon", "optimism"].includes(network.name)) {
    const balance = await ethers.provider.getBalance(deployer.address);
    const minBalance = ethers.parseEther("0.01"); // Minimum 0.01 ETH for deployment
    if (balance < minBalance) {
      throw new Error(
        `Insufficient funds: ${ethers.formatEther(balance)} ETH, need at least ${ethers.formatEther(minBalance)} ETH`
      );
    }
    console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
  }

  // Deploy RedistributionVaultV2
  let vaultAddress = process.env.VAULT_ADDRESS || "0x0000000000000000000000000000000000000000";
  if (vaultAddress === "0x0000000000000000000000000000000000000000") {
    console.log("Deploying RedistributionVaultV2...");
    const RedistributionVaultV2 = await ethers.getContractFactory("RedistributionVaultV2");
    const vault = await RedistributionVaultV2.deploy(deployer.address); // Deployer is initial authorizedMinter
    vaultAddress = vault.address;
    console.log("RedistributionVaultV2 deployed to:", vaultAddress);

    // Register payment token in vault
    const vaultContract = await ethers.getContractAt("RedistributionVaultV2", vaultAddress);
    await vaultContract.registerToken(paymentToken);
    console.log(`Registered ${paymentToken} in vault`);
  } else {
    console.log("Using existing vault at:", vaultAddress);
  }

  // Deployments configuration
  const deployments = [
    {
      name: "Stability-Oriented",
      strategicModel: "Famous 8 + ZAR",
      reserveModel: "Stability-Oriented",
      tokenName: "ZiGT Stability Coin",
      tokenSymbol: "ZiGT-ST",
    },
    {
      name: "Digital Forward",
      strategicModel: "Famous 8 + ZAR",
      reserveModel: "Digital Forward",
      tokenName: "ZiGT Digital Token",
      tokenSymbol: "ZiGT-DF",
    },
    {
      name: "Geopolitical Hedge",
      strategicModel: "Famous 8 + ZAR",
      reserveModel: "Geopolitical Hedge",
      tokenName: "ZiGT Hedge Token",
      tokenSymbol: "ZiGT-GH",
    },
    {
      name: "Afro-centric Trust",
      strategicModel: "Famous 8 + ZAR",
      reserveModel: "Afro-centric Trust",
      tokenName: "ZiGT Trust Token",
      tokenSymbol: "ZiGT-AT",
    },
    {
      name: "ZiG Hybrid",
      strategicModel: "ZiG Mirror Model",
      reserveModel: "ZiG Hybrid",
      tokenName: "ZiGT Hybrid Coin",
      tokenSymbol: "ZiGT-HY",
    },
  ];

  for (const deployment of deployments) {
    const { name, strategicModel, reserveModel, tokenName, tokenSymbol } = deployment;
    console.log(`Deploying ${name} (${tokenSymbol}) on ${network.name}...`);

    // Gather feeds and weights
    const feeds = settings.StrategicModels[strategicModel].feeds;
    const formulas = settings.StrategicModels[strategicModel].formulas[reserveModel];

    // Filter out pairs with no Chainlink or Band feeds
    const pairs = [...feeds.Metals, ...feeds.Fiat, ...feeds.Crypto].filter(
      (pair) => feedsForNetwork[pair] !== "0x0000000000000000000000000000000000000000" || bandFeeds[pair] !== "0x0000000000000000000000000000000000000000"
    );
    const chainlinkFeedAddresses = pairs.map((pair) => feedsForNetwork[pair] || ethers.constants.AddressZero);
    const bandFeedAddresses = pairs.map((pair) => bandFeeds[pair] || ethers.constants.AddressZero);
    const weights = pairs.map((pair) => {
      if (formulas.Metals && formulas.Metals[pair]) return ethers.parseUnits(formulas.Metals[pair].toString(), 18);
      if (formulas.Fiat && formulas.Fiat[pair]) return ethers.parseUnits(formulas.Fiat[pair].toString(), 18);
      if (formulas.Crypto && formulas.Crypto[pair]) return ethers.parseUnits(formulas.Crypto[pair].toString(), 18);
      return ethers.parseUnits("0", 18);
    });
    const decimalsArray = pairs.map(() => decimals);
    const maxPriceAges = pairs.map(() => maxPriceAge);

    // Validate inputs
    if (pairs.length === 0) {
      console.warn(`Warning: No valid feeds for ${name}. Skipping deployment.`);
      continue;
    }
    if (chainlinkFeedAddresses.every((addr) => addr === ethers.constants.AddressZero)) {
      console.warn(`Warning: No valid Chainlink feeds for ${name}. Deployment may fail unless Band feeds are set.`);
    }
    if (paymentToken === "0x0000000000000000000000000000000000000000") {
      throw new Error("Missing PAYMENT_TOKEN in .env");
    }

    // Deploy contract
    try {
      const ZiGT_SuperGodmode = await ethers.getContractFactory("ZiGT_SuperGodmode");
      const contract = await upgrades.deployProxy(
        ZiGT_SuperGodmode,
        [paymentToken, vaultAddress, pairs, chainlinkFeedAddresses, bandFeedAddresses, weights, decimalsArray, maxPriceAges],
        {
          initializer: "initialize",
          kind: "uups",
        }
      );

      await contract.deployed();
      console.log(`${name} deployed to:`, contract.address);

      // Set contract as authorized minter in vault
      const vault = await ethers.getContractAt("RedistributionVaultV2", vaultAddress);
      await vault.setAuthorizedMinter(contract.address);
      console.log(`Set ${contract.address} as authorized minter for ${name} in vault`);

      // Set emergency admin
      await contract.setEmergencyAdmin(deployer.address, true);
      console.log(`Set ${deployer.address} as emergency admin for ${name}`);

      // Verify contract
      if (["mainnet", "sepolia", "polygon", "polygonZkevm", "base", "celo", "optimism"].includes(network.name)) {
        console.log(`Verifying ${name} on ${network.name}...`);
        try {
          await hre.run("verify:verify", {
            address: contract.address,
            constructorArguments: [],
          });
          console.log(`${name} verified successfully`);
        } catch (error) {
          console.warn(`Verification failed for ${name}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`Failed to deploy ${name}:`, error.message);
    }
  }

  console.log("All deployments complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });