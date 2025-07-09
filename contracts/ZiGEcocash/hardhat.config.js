require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@openzeppelin/hardhat-upgrades");

const requiredEnvVars = ["PRIVATE_KEY", "ETHERSCAN_API_KEY"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing ${envVar} in .env`);
  }
}

module.exports = {
  solidity: {
    version: "0.8.29",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
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
  gasReporter: {
    enabled: true,
    currency: 'USD',
    token: 'ETH',
    gasPrice: 20,
    outputFile: 'gas-report.txt',
    noColors: false,
  },
  sourcify: { enabled: true },
  networks: {
    // 🚀 Zero Gas / Gasless
    skale: {
      url: process.env.SKALE_RPC_URL || "https://mainnet.skalenodes.com/v1/your-endpoint",
      accounts: [process.env.PRIVATE_KEY],
      chainId: parseInt(process.env.SKALE_CHAIN_ID || "2046399126"),
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 2.5,
      timeout: 1360000,
    },
    zero: {
      url: process.env.ZERO_RPC_URL || "https://rpc.zeronetwork.io",
      accounts: [process.env.PRIVATE_KEY],
      chainId: parseInt(process.env.ZERO_CHAIN_ID || "7560"),
    },
    sophon: {
      url: process.env.SOPHON_RPC_URL || "https://rpc.sophon.xyz",
      accounts: [process.env.PRIVATE_KEY],
      chainId: parseInt(process.env.SOPHON_CHAIN_ID || "8088"),
    },
    vite: {
      url: process.env.VITE_RPC_URL || "https://evm.vite.net", // Example
      accounts: [process.env.PRIVATE_KEY],
      chainId: parseInt(process.env.VITE_CHAIN_ID || "8725"),
    },
    oasis: {
      url: process.env.OASIS_RPC_URL || "https://emerald.oasis.dev",
      accounts: [process.env.PRIVATE_KEY],
      chainId: parseInt(process.env.OASIS_CHAIN_ID || "42262"),
    },

    // ✅ Low Gas or Sponsored Models
    base: {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 8453,
    },
    celo: {
      url: process.env.CELO_RPC_URL || "https://forno.celo.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 42220,
    },

    // 🔒 Secure zk-Rollup hub
    polygon_zkevm: {
      url: process.env.POLYGON_ZKEVM_RPC_URL || "https://zkevm-rpc.com",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 1101,
      gasPrice: 0,
    },

    // 🧬 DAG / Emerging
    iota_evm: {
      url: process.env.IOTA_EVM_RPC_URL || "https://json-rpc.evm.iotaledger.net",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 8822,
    },
    iota_evm_testnet: {
      url: process.env.IOTA_EVM_TESTNET_RPC_URL || "https://json-rpc.evm.testnet.iotaledger.net",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 1075,
    },

    // 👨‍💻 Dev/Test
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // sepolia: {
    //   url: process.env.SEPOLIA_RPC_URL,
    //   accounts: [process.env.PRIVATE_KEY],
    //   chainId: 11155111,
    // },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY,
      polygon_zkevm: process.env.POLYGON_ZKEVM_API_KEY,
      base: process.env.BASE_API_KEY || "dummy",
      celo: process.env.CELO_API_KEY || "dummy",
      skale: "dummy",
      zero: "dummy",
      sophon: "dummy",
      vite: "dummy",
      oasis: "dummy",
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
        network: "polygon_zkevm",
        chainId: 1101,
        urls: {
          apiURL: "https://api-zkevm.polygonscan.com/api",
          browserURL: "https://zkevm.polygonscan.com",
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
        network: "zero",
        chainId: 7560,
        urls: {
          apiURL: "https://explorer.zeronetwork.io/api",
          browserURL: "https://explorer.zeronetwork.io",
        },
      },
      {
        network: "sophon",
        chainId: 8088,
        urls: {
          apiURL: "https://sophon-explorer.com/api",
          browserURL: "https://sophon-explorer.com",
        },
      },
      {
        network: "vite",
        chainId: 8725,
        urls: {
          apiURL: "https://vite-explorer.io/api",
          browserURL: "https://vite-explorer.io",
        },
      },
      {
        network: "oasis",
        chainId: 42262,
        urls: {
          apiURL: "https://explorer.emerald.oasis.dev/api",
          browserURL: "https://explorer.emerald.oasis.dev",
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
