async function fixPriceCache() {
    const tokenAddresses = [
        "0x53366809039cA832E5250FfE335B4B19e7ED16C6", // MainZiGT
        "0x7231F9C31E18091A72Ce4b113AcF94336109b0ad", // SubZiGT
        "0xf0916A628fB9500EA693A36F34242621773039fC", // ZiG-KD
        "0x231c247f7Aa5c1490C8a69650EbF82b77bF9DD3e", // ZiG-RG
        "0xF428f2dB0c49AdDA443D97EA7462C0FD334ca6D5", // ZiG-KB
        "0xc14DB46aB89C36ccF1E307d3fAfdF417f914aE5C", // ZiG-UB
        "0x6C61585c7D4E8CaBCC25A812C94e7075348B1fe4", // ZiG-SF
        "0x0D393d21b5e26745593460CD58464BFb5fC72Bc7", // ZiG-PC
        "0xdcF7458e6af880933E22dbe3E5DDfcfd4DC6121f", // ZiG-MG
        "0x50df43944f7F9d570b866C96C9C5848CFF406162", // ZiG-SH
        "0x2B2E0E1F73FCbBc3b8925d01Cce5DB82a0C041C1", // ZiG-CD
        "0x41e2834863250955f380aa396cF0817b94AA4164", // ZiG-KU
        "0x73828Dbbb453E9D0191b9976e9ED292885f7c1F4", // ZiGTToken
        "0x067b911705cf2edC3ae94bdc9691b72B73FFE5c3", // ZiGUtilityToken
        "0xaba849b19D983EcA2804B9072574AAB02056e526", // ZiGMemeToken
        "0x9d541c3852A607C30e78bB34dc5Cd4D4E9fc318e", // ZiGNFT
        "0xAbe238E078b428D2CCf68B303D6a61909AfA9d1C", // ZiGSoulboundToken
        "0x8fbBfAc5Ac0850D0F2D49d8fBa352e513D0797F4", // ZiGGameFiToken
        "0xD3b721bC80541Fb3c4466de4de70593167A8FC01", // ZiGRWAToken
        "0x4D4aED6E1b5c4fce60a3006E4C8C3b3Cccf56755", // SoulReparationNFT
    ];

    // Common stablecoins on Polygon PoS, often bridged/wrapped to zkEVM.
    // **VERIFY THESE ADDRESSES ON POLYGON ZKEVM BLOCK EXPLORER!**
    // Search for "USDT", "USDC", "DAI" on https://zkevm.polygonscan.com/tokens
    const stablecoinAddresses = {
        "USDT": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // USDT on Polygon PoS (often bridged)
        "USDC": "0x3c499c542cAb585E319d4791438F842401fA2f0d", // USDC on Polygon PoS (often bridged)
        "DAI": "0x8f3Cf7ad23Cd3CaDbD9735Fd580221AeDcAbde20",  // DAI on Polygon PoS (often bridged)
        // Add other stablecoins if you deploy/use them on Polygon zkEVM
        // e.g., "FRAX": "0x..."
    };

    // Combine all token addresses
    const allTokenAddresses = [...tokenAddresses, ...Object.values(stablecoinAddresses)];

    // All the asset pairs your LiveBandFeed and CustomChainlinkOracle handle
    const assetPairsToUpdate = [
        "BTCUSD", "ETHUSD", "BNBUSD", "XAUUSD", "USDZAR",
        "USDXOF", "USDNGN", "USDEGP", "USDRUB", "USDTRY",
        "USDINR", "AUDUSD", "EURUSD", "GBPUSD", "USDCHF",
        "USDJPY", "NZDUSD", "CNYUSD", "CADUSD", "USDUSD", // USDUSD is crucial for stablecoins
        // You mentioned XAGUSD in initializePriceCache, adding it here for completeness
        "XAGUSD" 
    ];
    
    // Convert pairs to their keccak256 hash for updateCachedPrices
    const assetKeys = assetPairsToUpdate.map(k => ethers.keccak256(ethers.toUtf8Bytes(k)));

    console.log("\n📡 Updating cached prices for all ZiGT tokens and stablecoins...");
    const BATCH_SIZE = 5;

    for (const addr of allTokenAddresses) {
        console.log(`\nProcessing token at: ${addr}`);
        const token = await ethers.getContractAt("contracts/ZiGT_github/ZiGT.sol:ZiGT", addr);

        for (let i = 0; i < assetKeys.length; i += BATCH_SIZE) {
            const batch = assetKeys.slice(i, i + BATCH_SIZE);
            console.log(`  🔄 Updating price batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(assetKeys.length/BATCH_SIZE)} for ${addr}`);
            
            try {
                // *** INCREASE GAS LIMIT HERE SIGNIFICANTLY ***
                const tx = await token.updateCachedPrices(batch, {
                    gasLimit: 3_000_000 // Try 3 Million gas
                });
                await tx.wait();
                console.log(`  ✅ Batch updated for ${addr}`);
            } catch (batchError) {
                console.warn(`  ⚠️ Failed to update batch for ${addr}: ${batchError.message}`);
                if (batchError.data) {
                    console.error("    Revert reason data:", batchError.data);
                    try {
                        // Attempt to decode the revert reason if it's a string
                        const decodedReason = ethers.toUtf8String('0x' + batchError.data.substring(10));
                        console.error("    Decoded revert reason:", decodedReason);
                    } catch (decodeError) {
                        // Ignore if it's not a standard string revert
                    }
                }
                if (batchError.code) console.error("    Error code:", batchError.code);
                if (batchError.receipt) {
                    console.error("    Transaction Receipt Status:", batchError.receipt.status);
                    console.error("    Gas Used:", batchError.receipt.gasUsed.toString()); // Log actual gas used
                    console.error("    Transaction Hash:", batchError.receipt.hash); // Log tx hash for explorer
                }
            }
            
            // Add a small delay between batches
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    // Register XAUUSD in BandFeedRegistry (as per your original script)
    // Make sure deployedContracts.BandFeedRegistry and deployedContracts.LiveBandFeed are valid
    console.log(`\n🔗 Registering XAUUSD in BandFeedRegistry (if not already done)...`);
    const bandRegistry = await ethers.getContractAt("BandFeedRegistry", deployedContracts.BandFeedRegistry);
    await bandRegistry.setFeedAddress("XAUUSD", deployedContracts.LiveBandFeed);
    console.log(`✅ Registered XAUUSD in BandFeedRegistry`);
    
    // Also ensure other critical pairs are registered if this script is meant to be idempotent for setup
    for (const pair of assetPairsToUpdate) {
        if (pair !== "XAUUSD") {
            try {
                await bandRegistry.setFeedAddress(pair, deployedContracts.LiveBandFeed);
                console.log(`🔗 Registered ${pair} in BandFeedRegistry`);
            } catch (error) {
                // Don't error out the whole script if one registration fails, just warn
                console.warn(`⚠️ Failed to register ${pair} in BandFeedRegistry: ${error.message}`);
            }
        }
    }
}

// You MUST ensure 'deployedContracts' is loaded correctly here or passed into the function.
// For example:
// const fs = require("fs");
// const deployedContracts = JSON.parse(fs.readFileSync("path/to/your/latest/deployment_info.json")).contracts;

fixPriceCache().catch(console.error);