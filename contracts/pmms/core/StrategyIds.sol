// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

library StrategyIds {
    uint256 constant DEX_ARBITRAGE = 1;
    uint256 constant AAVE_LIQUIDATION = 2;
    uint256 constant YIELD_LOOP = 3;
    uint256 constant STABLECOIN_PEG_ARBITRAGE = 4;
    uint256 constant NFT_FLOOR_ARBITRAGE = 5;
    uint256 constant TRIANGULAR_ARBITRAGE = 6;
    uint256 constant CROSS_DEX_LENDING_ARBITRAGE = 7;
    uint256 constant GOVERNANCE_ARBITRAGE = 8;
    uint256 constant ORACLE_LAG_ARBITRAGE = 9;
    uint256 constant STABLECOIN_META_PROTOCOL_ARBITRAGE = 10;
    uint256 constant FLASH_MINT_ARBITRAGE = 11;
    uint256 constant LP_BURN_ARBITRAGE = 12;
    uint256 constant MEV_CAPTURE = 13;
    uint256 constant REBASE_TOKEN_ARBITRAGE = 14;
    uint256 constant BRIDGING_LATENCY_ARBITRAGE = 15;
    uint256 constant NFT_COLLATERAL_LIQUIDATION = 16;
    uint256 constant LIQUID_STAKING_TOKEN_ARBITRAGE = 17;
    uint256 constant FLASHLOAN_GAS_ARBITRAGE = 18;
}
