const { ethers } = require("ethers");

const ZeroAddress = ethers.ZeroAddress;

const networkConfig = {
  polygon: {
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    USDT: "0x3813e82e6f7098b9583FC0F33a962D02018B6803",
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    STETH: ZeroAddress,
    CURVE_3POOL: "0x445FE580eF8d70FF569aB36e80c647af338db351",
    CURVE_3POOL_TOKEN: "0x1AEf73d49Dedc4b1778d0706583995958Dc862e6",
    AAVE_LENDING_POOL: "0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf",
    UNISWAP_V3: ZeroAddress, // not on Polygon PoS (use Sushi/Quick)
    UNISWAP_V3_QUOTER: ZeroAddress,
    CONVEX: ZeroAddress,
    SKALE_IMA_BRIDGE: ZeroAddress,
    GAS_ORACLE: ZeroAddress,
  },

  polygon_zkevm: {
    USDC: "0xa8ce8aee21bc2a48a5ef670afcc9274c7bbbc035",
    DAI: ZeroAddress,
    USDT: ZeroAddress,
    WETH: "0x4200000000000000000000000000000000000006",
    STETH: ZeroAddress,
    CURVE_3POOL: ZeroAddress,
    CURVE_3POOL_TOKEN: ZeroAddress,
    AAVE_LENDING_POOL: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    UNISWAP_V3: "0x0E0434DDf5273F71250A99c6fbcABfeCA301DE5F",
    UNISWAP_V3_QUOTER: "0xFDC32821e491759e680eb4582ec2e65e8F925239",
    CONVEX: ZeroAddress,
    SKALE_IMA_BRIDGE: ZeroAddress,
    GAS_ORACLE: ZeroAddress,
  },

  skale: {},
  skale_testnet: {},
};

function getNetworkConfig(networkName) {
  const lowerName = networkName.toLowerCase();

  // default to mock for SKALE and unknowns
  if (lowerName.includes("skale") || lowerName.includes("mock")) {
    return {};
  }

  return networkConfig[lowerName] || {};
}

module.exports = {
  getNetworkConfig,
};
