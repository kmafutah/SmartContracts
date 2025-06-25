// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract DeFiStrategies {
        struct Strategy {
            uint256 id;
            string name;
            string description;
            string risk;
            string notes;
        }

        Strategy[] public strategies;

        constructor() {
            strategies.push(Strategy(1, "DEX Arbitrage", "Profit from token price discrepancies between decentralised exchanges", "Low", "Most basic, usually requires speed and liquidity"));
            strategies.push(Strategy(2, "Aave Liquidation", "Repay undercollateralised debt and receive a discounted asset", "Medium", "Requires accurate health factor monitoring; timing-sensitive"));
            strategies.push(Strategy(3, "Yield Loop (Leverage Farming)", "Deposit asset", " borrow against it", " redeposit etc., earning net yield,Medium,Profitable if APY > borrow rate; chain-specific opportunities"));
            strategies.push(Strategy(4, "Stablecoin Peg Arbitrage", "Arbitrage when stables (e.g. USDT/USDC/DAI) depeg on one DEX", "Low", "Very effective during market stress"));
            strategies.push(Strategy(5, "NFT Floor Arbitrage", "Buy NFT below floor price on one market", " sell higher on another", "Medium,Depends on floor oracle and timing"));
            strategies.push(Strategy(6, "Triangular Arbitrage", "e.g.", "ETH -> USDC -> DAI -> ETH", "Medium,Use Uniswap/Sushi/Balancer; works when paths are mispriced"));
            strategies.push(Strategy(7, "Cross-DEX Lending Arbitrage", "Borrow from one (low borrow rate)", " lend on another (high supply rate)", "High,Use Aave -> Compound / Morpho / Euler"));
            strategies.push(Strategy(8, "Governance Arbitrage", "Acquire tokens cheaply before snapshot", " vote or benefit", " dump after,High,Timing-critical; mostly DAO-reward based"));
            strategies.push(Strategy(9, "Oracle Lag Arbitrage", "When AMM price deviates before Chainlink updates", "Low", "Works especially on smaller tokens"));
            strategies.push(Strategy(10, "Stablecoin Meta-Protocol Arbitrage", "Curve pools (3Pool", " FraxBP)", " Meta Pools (Convex/Curve vaults),High,Requires deep Curve/Convex integration"));
            strategies.push(Strategy(11, "Flash-Mint Arbitrage", "Use protocols like FPI", " AMPL", " or tokens with built-in mint/redeem,High,Limited to tokens supporting flash mint"));
            strategies.push(Strategy(12, "LP Burn & Arbitrage", "Burn LP tokens to withdraw high value tokens (post-impermanent loss)", "Medium", "Time-sensitive post-shock"));
            strategies.push(Strategy(13, "MEV Capture (own mempool node)", "Detect pending tx and front-run for profit", "Very High", "Flashbots, RPC control"));
            strategies.push(Strategy(14, "Rebase Token Arbitrage", "e.g. AMPL or OHM forks before and after rebases", "Medium", "Oracle + Timing"));
            strategies.push(Strategy(15, "Bridging Latency Arbitrage", "Cross-chain token pricing (e.g.", " ETH price on Arbitrum vs ETH Mainnet)", "High,LayerZero, Wormhole"));
            strategies.push(Strategy(16, "NFT Collateral Liquidation", "Instant buyout of undercollateralised NFTs on platforms like BendDAO", "Medium", "NFT Pricing Oracle"));
            strategies.push(Strategy(17, "Liquid Staking Token Arbitrage", "Arbitrage between LSTs like stETH", " rETH", " cbETH,Medium,Market-dependent"));
            strategies.push(Strategy(18, "Flashloan Gas Arbitrage", "Arbitrage where users overpay for gas", " refund or resell via bundlers", "High,Requires bundler and custom RPC"));
        }
    }