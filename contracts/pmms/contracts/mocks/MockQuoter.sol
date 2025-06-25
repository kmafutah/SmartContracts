// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;
contract MockQuoter {
    uint256 public constant RATE = 1e18; // 1:1 for testing
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external view returns (uint256 amountOut) {
        return (amountIn * RATE) / 1e18;
    }
}