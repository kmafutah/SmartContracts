// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface IAavePool {
    function deposit(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);

    function getReserveData(
        address asset
    )
        external
        view
        returns (
            uint256 configuration,
            uint128 liquidityIndex,
            uint128 variableBorrowIndex,
            uint128 currentLiquidityRate,
            uint128 currentVariableBorrowRate,
            uint128 currentStableBorrowRate,
            uint40 lastUpdateTimestamp,
            address aTokenAddress,
            address stableDebtTokenAddress,
            address variableDebtTokenAddress,
            address interestRateStrategyAddress,
            uint8 id
        );

    function borrow(
    address asset,
    uint256 amount,
    uint256 interestRateMode,
    uint16 referralCode,
    address onBehalfOf
    ) external;
}