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
    DAI: "0xA6e8B242eC3F5Faee52e6F5E64C1cDce5D6C101D",
    USDT: "0xB74B54d37A097d0Aefc81c17902aC2D52b6Da16f",
    WETH: "0x4200000000000000000000000000000000000006",
    STETH: ZeroAddress,

    CURVE_3POOL: ZeroAddress,
    CURVE_3POOL_TOKEN: ZeroAddress,

    // ✅ Correct Aave Core Addresses
    AAVE_LENDING_POOL: "0xF07d5537c9d188dcE8b611BbDdf3A47F47e4F839", // Lending Pool (actual pool)
    AAVE_ADDRESSES_PROVIDER: "0xa97684ead0e402dc232d5a977953df7ecbab3cdb",
    AAVE_ORACLE: "0x02f7036dCb0bCd5F6C4d90C3A2fFd7e906CfDdaF",
    AAVE_PROTOCOL_DATA_PROVIDER: "0x9441B65EE553F70df9C77d45d3283B6BC24F222d",

    UNISWAP_V3: "0x0E0434DDf5273F71250A99c6fbcABfeCA301DE5F",
    UNISWAP_V3_QUOTER: "0xFDC32821e491759e680eb4582ec2e65e8F925239",

    CONVEX: ZeroAddress,
    SKALE_IMA_BRIDGE: ZeroAddress,
    GAS_ORACLE: ZeroAddress,

    // ✅ ZiG Ecosystem
    ZiG: "0x9d485613b48f6617E90B4Dfe664Bf52127572BBa",
    ZiGT: "0xEbcF9FF0868F57F08d86e6a94889A0DECB99D43b",
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


