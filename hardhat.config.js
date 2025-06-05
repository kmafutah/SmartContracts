require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@openzeppelin/hardhat-upgrades");

// Validate environment variables
const requiredEnvVars = ["PRIVATE_KEY", "SKALE_RPC_URL", "SKALE_CHAIN_ID", "SKALE_TESTNET_RPC_URL", "SKALE_TESTNET_CHAIN_ID", "ETHERSCAN_API_KEY"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing ${envVar} in .env`);
  }
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.22", // Match StrategyStablecoinPegArbitrage.sol
    settings: {
      optimizer: {
        enabled: false,
        runs: 200,
        details: {
          yul: true,
          constantOptimizer: true,
          deduplicate: true,
          cse: true,
        },
      },
      viaIR: true,
    },
  },
  networks: {
    mainnet: {
      url: process.env.INFURA_URL || "https://mainnet.infura.io/v3/823602bd19924aecad1d11e6ed6550af",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 1,
    },
    skale: {
      url: process.env.SKALE_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: parseInt(process.env.SKALE_CHAIN_ID),
    },
    skale_testnet: {
      url: process.env.SKALE_TESTNET_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: parseInt(process.env.SKALE_TESTNET_CHAIN_ID),
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: [process.env.PRIVATE_KEY],
      chainId: parseInt(process.env.POLYGON_CHAIN_ID) || 137,
    },
    optimism: {
      url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      accounts: [process.env.PRIVATE_KEY],
      chainId: parseInt(process.env.OPTIMISM_CHAIN_ID) || 10,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: [process.env.PRIVATE_KEY], // Use .env PRIVATE_KEY
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
    customChains: [
      {
        network: "skale",
        chainId: 2046399126,
        urls: {
          apiURL: "https://elated-tan-skat.explorer.mainnet.skalenodes.com/api",
          browserURL: "https://elated-tan-skat.explorer.mainnet.skalenodes.com",
        },
      },
      {
        network: "skale_testnet",
        chainId: 1444673419,
        urls: {
          apiURL: "https://juicy-low-small-testnet.explorer.testnet.skalenodes.com/api",
          browserURL: "https://juicy-low-small-testnet.explorer.testnet.skalenodes.com",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
    cache: "./cache",
    tests: "./test",
  },
};