// scripts/updateZiGTPrices_zkevm_polygon.js
const { ethers } = require("hardhat");
require("dotenv").config();

// Configuration for ZiG-T tokens and their oracle settings
// !!! IMPORTANT: Ensure these match your actual deployed ZiG-T token proxy addresses !!!
const ZIGT_TOKEN_CONFIGS = [
    { name: "ZiG-R", address: "0xe8fD1D1933b33b9c23E19F0a7FE7e7d3513181d8" },
    { name: "ZiG-N", address: "0x0C29a92536FCBad97BdE6F32c1C828B7372D614F" },
    { name: "ZiG-RG", address: "0x3fb3FB12bBD92a72Ff6EE7943166c2141CC830f3" },
    { name: "ZiG-KB", address: "0x0FC1D3a789D4E0f34F818664a9cee3Eb36d7D4D3" },
    { name: "ZiG-UB", address: "0xB7908962811106b7AD624273D7B22634099E8B44" },
    { name: "ZiG-SF", address: "0x632612061BA979dFef4E2702d858667bBf04698e" },
    { name: "ZiG-PC", address: "0xa5E5822167F4A6272717Bf0338A2f6805B5f20c5" },
    { name: "ZiG-MG", address: "0x58Ba1Ff84E7e35546A4A879ad1EBf3a819a4c8F9" },
    { name: "ZiG-SH", address: "0x0ADa5965b949716dD7d956049E35FD86fD385467" },
    { name: "ZiG-CD", address: "0xB3637907ae9bFEB13Bfd3c952b4f57Be1Cc7eca3" },
    { name: "ZiG-KU", address: "0x506C1302ECc7B00A25003Df36b12409a5A80aA6d" },
    { name: "ZiG-KD", address: "0x76A5E52b6ad5cdeFf9aE80C239fcf544Bd370Be2" },
];

// !!! IMPORTANT: Replace with your actual LiveBandFeed contract address !!!
const LIVE_BAND_FEED_ADDRESS = "0xcAd7b94C70fa4d7A8A63103D9508ea1AC6224716"; 
const MAX_PRICE_AGE = 3600; // 1 hour in seconds, adjust as needed

// Asset configurations for price updates
const ASSET_CONFIGS = [
    { key: "BTCUSD", decimals: 18 }, // LiveBandFeed normalizes to 18 internally
    { key: "ETHUSD", decimals: 18 },
    { key: "BNBUSD", decimals: 18 },
    { key: "XAUUSD", decimals: 18 }, // Gold
    { key: "USDZAR", decimals: 18 },
    { key: "USDXOF", decimals: 18 },
    { key: "USDNGN", decimals: 18 },
    { key: "USDEGP", decimals: 18 },
    { key: "USDRUB", decimals: 18 },
    { key: "USDTRY", decimals: 18 },
    { key: "USDINR", decimals: 18 },
    { key: "AUDUSD", decimals: 18 },
    { key: "EURUSD", decimals: 18 },
    { key: "GBPUSD", decimals: 18 },
    { key: "USDCHF", decimals: 18 },
    { key: "USDJPY", decimals: 18 },
    { key: "NZDUSD", decimals: 18 },
    { key: "CNYUSD", decimals: 18 },
    { key: "CADUSD", decimals: 18 },
    { key: "USDUSD", decimals: 18 }, // Base rate for USD/USD, often 1.0 (18 decimals)
    { key: "XAGUSD", decimals: 18 }, // Silver
];

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`\n🚀 Running price cache update script with account: ${deployer.address}`);

    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH"); // Corrected to ETH

    // if (parseFloat(ethers.formatEther(balance)) === 0) {
    //     console.error("\n❌ ERROR: Deployer account has 0 ETH. Transactions will fail due to insufficient funds.");
    //     console.error("Please fund your account (0xE0282D77cF60BA484e13d24fd5686A6618F09A3B) with ETH on Polygon zkEVM testnet and try again.");
    //     process.exit(1); // Exit if no funds
    // }

    // Get the ZiGT contract factory
    // Ensure this path matches your ZiGT.sol file location
    const ZiGTFactory = await ethers.getContractFactory("contracts/ZiGT_github/ZiGT.sol:ZiGT");

    for (const tokenInfo of ZIGT_TOKEN_CONFIGS) {
        console.log(`\n--- Processing ${tokenInfo.name} (${tokenInfo.address}) ---`);
        try {
            const zigtToken = ZiGTFactory.attach(tokenInfo.address);

            // Step 1: Set Oracles for each asset key in the ZiGT token contract
            for (const assetConfig of ASSET_CONFIGS) {
                const assetKeyBytes32 = ethers.keccak256(ethers.toUtf8Bytes(assetConfig.key));
                
                const oracleStruct = {
                    oracle: LIVE_BAND_FEED_ADDRESS,
                    maxPriceAge: MAX_PRICE_AGE,
                    decimals: assetConfig.decimals, // This decimal is for ZiGT's config, not LiveBandFeed's output
                    name: assetConfig.key,
                    isTrusted: true
                };

                // Check if oracle is already correctly set to avoid unnecessary transactions
                const currentOracleConfig = await zigtToken.assetOracles(assetKeyBytes32);
                if (
                    currentOracleConfig.oracle === oracleStruct.oracle &&
                    currentOracleConfig.maxPriceAge === BigInt(oracleStruct.maxPriceAge) &&
                    currentOracleConfig.decimals === oracleStruct.decimals &&
                    ethers.toUtf8String(currentOracleConfig.name) === oracleStruct.name &&
                    currentOracleConfig.isTrusted === oracleStruct.isTrusted
                ) {
                    console.log(`  ✅ Oracle for ${assetConfig.key} already correctly set.`);
                } else {
                    console.log(`  ⚙️ Setting oracle for ${assetConfig.key}...`);
                    try {
                        // Estimate gas for setOracle
                        const setOracleGasEstimate = await zigtToken.setOracle.estimateGas(
                            assetKeyBytes32,
                            oracleStruct
                        );
                        console.log(`    📊 Estimated gas for setOracle(${assetConfig.key}): ${setOracleGasEstimate.toString()} gas units`);
                        
                        const tx = await zigtToken.setOracle(
                            assetKeyBytes32,
                            oracleStruct
                        );
                        await tx.wait(); // Wait for transaction to be mined
                        console.log(`  ✅ Oracle set for ${assetConfig.key}.`);
                    } catch (estimateError) {
                        console.error(`  ❌ Error estimating or setting oracle for ${assetConfig.key}:`, estimateError.message);
                        // You might want to break here or handle more robustly
                    }
                }
            }

            // Step 2: Update the price cache
            // Step 2: Update the price cache
            console.log(`  🔄 Updating price cache for ${tokenInfo.name}...`);
            const keysToUpdate = ASSET_CONFIGS.map(config => ethers.keccak256(ethers.toUtf8Bytes(config.key)));
            
            try {
                // Estimate gas for updateCachedPrices
                const updatePricesGasEstimate = await zigtToken.updateCachedPrices.estimateGas(keysToUpdate);
                console.log(`    📊 Estimated gas for updateCachedPrices: ${updatePricesGasEstimate.toString()} gas units`);
                for (const assetConfig of ASSET_CONFIGS) {
                    const key = ethers.keccak256(ethers.toUtf8Bytes(assetConfig.key));
                    const oracle = await zigtToken.assetOracles(key);
                    console.log(`🔎 ${assetConfig.key} => Oracle: ${oracle.oracle}, Trusted: ${oracle.isTrusted}`);
                }

                const txUpdate = await zigtToken.updateCachedPrices(keysToUpdate);
                await txUpdate.wait(); // Wait for transaction to be mined
                console.log(`  ✅ Price cache updated for ${tokenInfo.name}.`);

                // Optional: Verify a sample cached price
                const sampleKey = ethers.keccak256(ethers.toUtf8Bytes("BTCUSD"));
                const cachedPrice = await zigtToken.cachedPrices(sampleKey);
                if (cachedPrice > 0) {
                     console.log(`  📈 Sample cached price for BTCUSD: ${ethers.formatUnits(cachedPrice, 18)}`);
                } else {
                    console.log(`  ⚠️ BTCUSD price not cached or is zero.`);
                }
            } catch (updateError) {
                console.error(`  ❌ Error updating price cache for ${tokenInfo.name}:`);
                // --- THIS IS THE KEY PART ---
                if (updateError.reason) {
                    console.error(`    Reason: ${updateError.reason}`);
                } else if (updateError.data && updateError.data.message) {
                    // Sometimes the revert reason is buried in .data.message
                    console.error(`    Reason (data): ${updateError.data.message}`);
                } else if (updateError.code === 'CALL_EXCEPTION' && updateError.data) {
                    // For ethers v6 and some RPCs, data might hold the revert reason
                    const decodedReason = ethers.AbiCoder.defaultAbiCoder().decode(['string'], ethers.dataSlice(updateError.data, 4));
                    console.error(`    Decoded Revert Reason: ${decodedReason[0]}`);
                }
                else {
                    console.error(`    Full error object:`, updateError); // Log the full error object for more detail
                }
                // --- END KEY PART ---
            }

        } catch (error) {
            console.error(`  ❌ General error processing ${tokenInfo.name}:`, error.message);
        }
    }

    console.log("\n--- Price cache update script finished ---");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });