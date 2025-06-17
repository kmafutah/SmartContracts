const { ethers } = require("hardhat");

async function verifyOracles() {
  const contracts = {
    BandFeedRegistry: "0x0920069E3F7C7d7701291ba97A80006cEB3d8870",
    LiveBandFeed: "0x6C7a137866e2d30F94904c4a6b7A89B4e2959619",
    OracleHub: "0x76C5FE327c0baE388cb8A1627651e375a336de56",
    MultiOracle: "0xEA41ADD3B34584eb7f21af42C06Ae65db984b4B6",
    MainZiGT: "0x53366809039cA832E5250FfE335B4B19e7ED16C6",
  };

  console.log("🔍 Verifying Oracle Contracts on Polygon zkEVM...");

  // Helper to check if address has code
  const hasCode = async (address, name) => {
    const code = await ethers.provider.getCode(address);
    if (code === "0x") {
      console.error(`❌ ${name} at ${address} has no bytecode!`);
      return false;
    }
    console.log(`✅ ${name} deployed at ${address}`);
    return true;
  };

  // Check deployment status
  for (const [name, address] of Object.entries(contracts)) {
    await hasCode(address, name);
  }

  // Check BandFeedRegistry
  const bandRegistryAbi = ["function getFeedAddress(string) view returns (address)"];
  const bandRegistry = await ethers.getContractAt(bandRegistryAbi, contracts.BandFeedRegistry);
  try {
    const xauFeed = await bandRegistry.getFeedAddress("XAUUSD");
    console.log(`✅ BandFeedRegistry XAUUSD feed: ${xauFeed}`);
  } catch (error) {
    console.warn(`⚠️ BandFeedRegistry getFeedAddress(XAUUSD) failed: ${error.message}`);
  }

  // Check LiveBandFeed
  const bandFeedAbis = [
    ["function getPrice(string) view returns (uint256)"],
    ["function getReferenceData(string) view returns (uint256 rate, uint256 lastUpdated)"],
    ["function getPrice(bytes32) view returns (uint256)"],
  ];
  for (let i = 0; i < bandFeedAbis.length; i++) {
    const liveBandFeed = await ethers.getContractAt(bandFeedAbis[i], contracts.LiveBandFeed);
    try {
      if (i === 0) {
        const price = await liveBandFeed.getPrice("XAUUSD");
        console.log(`✅ LiveBandFeed getPrice(XAUUSD): ${ethers.formatUnits(price, 18)} USD`);
      } else if (i === 1) {
        const data = await liveBandFeed.getReferenceData("XAUUSD");
        console.log(`✅ LiveBandFeed getReferenceData(XAUUSD):`, {
          rate: ethers.formatUnits(data.rate, 18),
          lastUpdated: new Date(Number(data.lastUpdated) * 1000).toISOString(),
        });
      } else if (i === 2) {
        const price = await liveBandFeed.getPrice(ethers.keccak256(ethers.toUtf8Bytes("XAUUSD")));
        console.log(`✅ LiveBandFeed getPrice(bytes32 XAUUSD): ${ethers.formatUnits(price, 18)} USD`);
      }
      break;
    } catch (error) {
      console.warn(`⚠️ LiveBandFeed ABI ${i} failed: ${error.message}`);
    }
  }

  // Check MultiOracle
  const oracleAbis = [
    ["function getPrice(string) view returns (uint256)"],
    ["function latestPrice(string) view returns (uint256)"],
    ["function getPrice(bytes32) view returns (uint256)"],
  ];
  for (let i = 0; i < oracleAbis.length; i++) {
    const multiOracle = await ethers.getContractAt(oracleAbis[i], contracts.MultiOracle);
    try {
      if (i === 0) {
        const price = await multiOracle.getPrice("XAUUSD");
        console.log(`✅ MultiOracle getPrice(XAUUSD): ${ethers.formatUnits(price, 18)} USD`);
      } else if (i === 1) {
        const price = await multiOracle.latestPrice("XAUUSD");
        console.log(`✅ MultiOracle latestPrice(XAUUSD): ${ethers.formatUnits(price, 18)} USD`);
      } else if (i === 2) {
        const price = await multiOracle.getPrice(ethers.keccak256(ethers.toUtf8Bytes("XAUUSD")));
        console.log(`✅ MultiOracle getPrice(bytes32 XAUUSD): ${ethers.formatUnits(price, 18)} USD`);
      }
      break;
    } catch (error) {
      console.warn(`⚠️ MultiOracle ABI ${i} failed: ${error.message}`);
    }
  }

  // Check OracleHub
  for (let i = 0; i < oracleAbis.length; i++) {
    const oracleHub = await ethers.getContractAt(oracleAbis[i], contracts.OracleHub);
    try {
      if (i === 0) {
        const price = await oracleHub.getPrice("XAUUSD");
        console.log(`✅ OracleHub getPrice(XAUUSD): ${ethers.formatUnits(price, 18)} USD`);
      } else if (i === 1) {
        const price = await oracleHub.latestPrice("XAUUSD");
        console.log(`✅ OracleHub latestPrice(XAUUSD): ${ethers.formatUnits(price, 18)} USD`);
      } else if (i === 2) {
        const price = await oracleHub.getPrice(ethers.keccak256(ethers.toUtf8Bytes("XAUUSD")));
        console.log(`✅ OracleHub getPrice(bytes32 XAUUSD): ${ethers.formatUnits(price, 18)} USD`);
      }
      break;
    } catch (error) {
      console.warn(`⚠️ OracleHub ABI ${i} failed: ${error.message}`);
    }
  }

  // Check MainZiGT configuration
  const zigtAbi = [
    "function bandFeedRegistry() view returns (address)",
    "function assetOracles(bytes32) view returns (address oracle, uint256 maxPriceAge, uint8 decimals, string memory name, bool isTrusted)",
  ];
  const mainZiGT = await ethers.getContractAt(zigtAbi, contracts.MainZiGT);
  try {
    const bandFeedAddr = await mainZiGT.bandFeedRegistry();
    console.log(`✅ MainZiGT BandFeedRegistry: ${bandFeedAddr}`);
    if (bandFeedAddr.toLowerCase() !== contracts.BandFeedRegistry.toLowerCase()) {
      console.warn(`⚠️ MainZiGT BandFeedRegistry mismatch! Expected: ${contracts.BandFeedRegistry}`);
    }
  } catch (error) {
    console.warn(`⚠️ MainZiGT bandFeedRegistry() failed: ${error.message}`);
  }

  const assetKey = ethers.keccak256(ethers.toUtf8Bytes("XAUUSD"));
  try {
    const oracle = await mainZiGT.assetOracles(assetKey);
    console.log(`✅ MainZiGT XAUUSD Oracle:`, {
      oracle: oracle.oracle,
      maxPriceAge: oracle.maxPriceAge.toString(),
      decimals: oracle.decimals.toString(),
      name: oracle.name,
      isTrusted: oracle.isTrusted,
    });
  } catch (error) {
    console.warn(`⚠️ MainZiGT assetOracles(XAUUSD) failed: ${error.message}`);
  }
}

verifyOracles().catch(console.error);