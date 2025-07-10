require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@openzeppelin/hardhat-upgrades");

// Validate environment variables
const requiredEnvVars = ["PRIVATE_KEY", "ETHERSCAN_API_KEY"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing ${envVar} in .env`);
  }
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.29",
    settings: {
      optimizer: {
        enabled: true, // Note: Consider enabling for production to reduce gas costs
        runs: 1_000,
        details: {
          yul: true,
          constantOptimizer: true,
          deduplicate: true,
          cse: true,
        },
      },
      viaIR: true,
    },
  gasReporter: {
    enabled: true, // set to false to disable
    currency: 'USD', // or 'ETH', 'EUR', etc.
    token: 'ETH', // or 'MATIC', 'BNB', etc. for the specific chain
    gasPrice: 20, // Example gas price in Gwei. You can fetch dynamically too.
    // coinmarketcap: process.env.COINMARKETCAP_API_KEY, // Optional: for USD conversion
    outputFile: 'gas-report.txt', // Optional: saves report to a file
    noColors: false, // Optional: disable colors if piping output
  },
  },
  sourcify: {
    enabled: true,
  },
  networks: {
    // Zero-gas networks
    skale: {
      url: process.env.SKALE_RPC_URL || "https://mainnet-proxy.skalenodes.com/v1/elated-tan-skat",
      accounts: [process.env.PRIVATE_KEY],
      chainId: process.env.SKALE_CHAIN_ID ? parseInt(process.env.SKALE_CHAIN_ID) : 2046399126,
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 2.5,
      timeout: 1360000,
    },
    skale_testnet: {
      url: process.env.SKALE_TESTNET_RPC_URL || "https://testnet.skalenodes.com/v1/juicy-low-small-testnet",
      accounts: [process.env.PRIVATE_KEY],
      chainId: process.env.SKALE_TESTNET_CHAIN_ID ? parseInt(process.env.SKALE_TESTNET_CHAIN_ID) : 1444673419,
      gasPrice: 100000000,
      gasMultiplier: 1.5,
      timeout: 120000,
    },
    polygon_zkevm: {
      url: process.env.POLYGON_ZKEVM_RPC_URL || "https://zkevm-rpc.com",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 1101,
      gasPrice: 0,
    },
    base: {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 8453,
      gasPrice: 0,
    },
    celo: {
      url: process.env.CELO_RPC_URL || "https://forno.celo.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 42220,
      gasPrice: 0,
    },
    // Standard networks
    mainnet: {
      url: process.env.INFURA_URL || "https://mainnet.infura.io/v3/823602bd19924aecad1d11e6ed6550af",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 1,
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
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/823602bd19924aecad1d11e6ed6550af",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155111,
    },
  iota_evm: {
    url: process.env.IOTA_EVM_RPC_URL || "https://json-rpc.evm.iotaledger.net", // Check IOTA docs
    accounts: [process.env.PRIVATE_KEY],
    chainId: 8822,
  },
  iota_evm_testnet: {
    url: process.env.IOTA_EVM_TESTNET_RPC_URL || "https://json-rpc.evm.testnet.iotaledger.net", // Check IOTA docs
    accounts: [process.env.PRIVATE_KEY],
    chainId: 1075,
  },  
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY || process.env.ETHERSCAN_API_KEY,
      optimisticEthereum: process.env.OPTIMISM_API_KEY || process.env.ETHERSCAN_API_KEY,
      polygon_zkevm: process.env.POLYGON_ZKEVM_API_KEY || process.env.ETHERSCAN_API_KEY,
      base: process.env.BASE_API_KEY || "dummy",
      celo: process.env.CELO_API_KEY || "dummy",
      skale: "dummy",
      skale_testnet: "dummy",
      sepolia: process.env.ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: "skale",
        chainId: 2046399126,
        urls: {
          apiURL: "https://internal-hubs.explorer.mainnet.skalenodes.com:10021/api",
          browserURL: "https://internal-hubs.explorer.mainnet.skalenodes.com",
        },
      },
      {
        network: "skale_testnet",
        chainId: 1444673419,
        urls: {
          apiURL: "https://internal.explorer.testnet.skalenodes.com:10011/api",
          browserURL: "https://juicy-low-small-testnet.explorer.testnet.skalenodes.com",
        },
      },
      {
        network: "polygon_zkevm",
        chainId: 1101,
        urls: {
          apiURL: "https://api-zkevm.polygonscan.com/api",
          browserURL: "https://zkevm.polygonscan.com/",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.celoscan.io/api",
          browserURL: "https://celoscan.io",
        },
      },
      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://api-sepolia.etherscan.io/api",
          browserURL: "https://sepolia.etherscan.io",
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
    contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
}; 