const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("ZiGT Price Cache Initialization", function () {
    let deployer;
    let liveBandFeed;
    let zigtToken; // This will be the ZiGT proxy
    let zigtImpl; // This will be the ZiGT implementation

    // Mock/Placeholder Addresses (ensure these are valid addresses)
    const MOCK_BAND_FEED_REGISTRY_ADDRESS = "0x0000000000000000000000000000000000000001"; // Placeholder address
    const LIVE_BAND_FEED_MOCK_ADDRESS = "0xcAd7b94C70fa4d7A8A63103D9508ea1AC6224716"; // From your deploy script (if still used)
    const GOVERNANCE_ADDRESS = "0x538f4127eaCD752F65D918d82cBdc26C0366aBB6"; // From your deploy script
    const TREASURY_ADDRESS = "0xE0282D77cF60BA484e13d24fd5686A6618F09A3B"; // From your deploy script
    const ROUTER_ADDRESS = "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59"; // From your deploy script

    const ASSET_CONFIGS = [
        { key: "BTCUSD", decimals: 18, base: "BTC", quote: "USD", initialPrice: 70000 },
        { key: "ETHUSD", decimals: 18, base: "ETH", quote: "USD", initialPrice: 3500 },
        { key: "XAUUSD", decimals: 18, base: "XAU", quote: "USD", initialPrice: 2300 },
        { key: "USDZAR", decimals: 18, base: "USD", quote: "ZAR", initialPrice: 18.5 },
        { key: "USDXOF", decimals: 18, base: "USD", quote: "XOF", initialPrice: 600 },
        { key: "XAGUSD", decimals: 18, base: "XAG", quote: "USD", initialPrice: 29 },
        // IMPORTANT: Add ALL asset configs that ZiGT will try to update
        { key: "BNBUSD", decimals: 18, base: "BNB", quote: "USD", initialPrice: 600 },
        { key: "USDNGN", decimals: 18, base: "USD", quote: "NGN", initialPrice: 1500 },
        { key: "USDEGP", decimals: 18, base: "USD", quote: "EGP", initialPrice: 47 },
        { key: "USDRUB", decimals: 18, base: "USD", quote: "RUB", initialPrice: 90 },
        { key: "USDTRY", decimals: 18, base: "USD", quote: "TRY", initialPrice: 32 },
        { key: "USDINR", decimals: 18, base: "USD", quote: "INR", initialPrice: 83 },
        { key: "AUDUSD", decimals: 18, base: "AUD", quote: "USD", initialPrice: 0.66 },
        { key: "EURUSD", decimals: 18, base: "EUR", quote: "USD", initialPrice: 1.08 },
        { key: "GBPUSD", decimals: 18, base: "GBP", quote: "USD", initialPrice: 1.27 },
        { key: "USDCHF", decimals: 18, base: "USD", quote: "CHF", initialPrice: 0.90 },
        { key: "USDJPY", decimals: 18, base: "USD", quote: "JPY", initialPrice: 157 },
        { key: "NZDUSD", decimals: 18, base: "NZD", quote: "USD", initialPrice: 0.61 },
        { key: "CNYUSD", decimals: 18, base: "CNY", quote: "USD", initialPrice: 0.13 },
        { key: "CADUSD", decimals: 18, base: "CAD", quote: "USD", initialPrice: 0.73 },
        { key: "USDUSD", decimals: 18, base: "USD", quote: "USD", initialPrice: 1.0 }, // Special case for USD/USD
    ];
    const MAX_PRICE_AGE = 3600; // 1 hour

    before(async function () {
        [deployer] = await ethers.getSigners();

        // 1. Deploy LiveBandFeed
        const LiveBandFeedFactory = await ethers.getContractFactory("contracts/ZiGT_github/LiveBandFeed.sol:LiveBandFeed");
        liveBandFeed = await LiveBandFeedFactory.deploy();
        await liveBandFeed.waitForDeployment();
        const liveBandFeedAddress = await liveBandFeed.getAddress();
        console.log(`LiveBandFeed deployed at: ${liveBandFeedAddress}`);

        // Set initial prices in LiveBandFeed for testing ALL ASSETS
        for (const asset of ASSET_CONFIGS) {
            const pairName = asset.base + asset.quote;
            // LiveBandFeed internally normalizes to 18 decimals, so we parse to 18 here.
            await liveBandFeed.setPrice(pairName, ethers.parseUnits(asset.initialPrice.toString(), 18));
            console.log(`Set LiveBandFeed price for ${pairName}: ${asset.initialPrice}`);
        }

        // 2. Deploy ZiGT (as an upgradeable proxy)
        const ZiGTFactory = await ethers.getContractFactory("contracts/ZiGT_github/ZiGT.sol:ZiGT");

        // Use a placeholder address for bandFeedRegistryAddress for the test
        const bandFeedRegistryAddress = MOCK_BAND_FEED_REGISTRY_ADDRESS; 

        const ratioArray = [5000n, 2000n, 3000n]; // Ensure these are BigInts

        // Initialize arguments for ZiGT
        const initializerArgs = [
            ROUTER_ADDRESS,
            bandFeedRegistryAddress,
            GOVERNANCE_ADDRESS,
            TREASURY_ADDRESS,
            0, // direction (uint8)
            ratioArray // Pass the array directly for the tuple
        ];

        zigtToken = await upgrades.deployProxy(ZiGTFactory, initializerArgs, {
            kind: 'uups',
            initializer: "initialize(address,address,address,address,uint8,(uint256,uint256,uint256))",
        });
        await zigtToken.waitForDeployment();
        const zigtTokenAddress = await zigtToken.getAddress();
        zigtImpl = await upgrades.erc1967.getImplementationAddress(zigtTokenAddress);
        
        console.log(`ZiGT Proxy deployed at: ${zigtTokenAddress}`);
        console.log(`ZiGT Implementation at: ${zigtImpl}`);
    });

    it("should allow setting oracles and updating price cache without reverting", async function () {
        // Step 1: Set Oracles in the ZiGT token contract
        for (const assetConfig of ASSET_CONFIGS) {
            const assetKeyBytes32 = ethers.keccak256(ethers.toUtf8Bytes(assetConfig.key));
            
            const oracleStruct = {
                oracle: await liveBandFeed.getAddress(), // Use the actual deployed LiveBandFeed address
                maxPriceAge: MAX_PRICE_AGE,
                decimals: assetConfig.decimals, // This is the decimals ZiGT expects
                name: assetConfig.key,          // This is the string used by getReferenceData
                isTrusted: true
            };

            // Call setOracle and expect it not to revert
            const tx = await zigtToken.setOracle(
                assetKeyBytes32,
                oracleStruct
            );
            await tx.wait(); // Wait for confirmation
            console.log(`  ✅ Oracle set for ${assetConfig.key}`);
            
            // Optional: Verify the oracle was set correctly
            const storedOracle = await zigtToken.assetOracles(assetKeyBytes32);
            expect(storedOracle.oracle).to.equal(await liveBandFeed.getAddress());
            expect(storedOracle.decimals).to.equal(assetConfig.decimals);
            expect(storedOracle.name).to.equal(assetConfig.key); // CORRECTED: No ethers.toUtf8String here
            expect(storedOracle.isTrusted).to.be.true;
            expect(storedOracle.maxPriceAge).to.equal(BigInt(MAX_PRICE_AGE));
        }

        // Step 2: Update the price cache
        console.log(`\nAttempting to update price cache...`);
        const keysToUpdate = ASSET_CONFIGS.map(config => ethers.keccak256(ethers.toUtf8Bytes(config.key)));
        
        // This is the call that was reverting. We expect it to succeed now.
        const txUpdate = await zigtToken.updateCachedPrices(keysToUpdate);
        await txUpdate.wait(); // Wait for transaction to be mined
        console.log(`✅ Price cache updated successfully!`);

        // Verify sample cached prices
        for (const assetConfig of ASSET_CONFIGS) {
            const assetKeyBytes32 = ethers.keccak256(ethers.toUtf8Bytes(assetConfig.key));
            const cachedPrice = await zigtToken.cachedPrices(assetKeyBytes32);
            expect(cachedPrice).to.be.gt(0); // Expect a non-zero price
            console.log(`  📈 Cached ${assetConfig.key} price: ${ethers.formatUnits(cachedPrice, 18)}`);
        }
    });
});