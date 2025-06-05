// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract MockUniswapV3Router {
    // Mock swap event
    event Swap(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    // Mock exactInputSingle function
    function exactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        address recipient,
        uint256 deadline,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Invalid amount");
        // Simulate a 1:1 swap with 0.3% fee
        amountOut = (amountIn * 997) / 1000;
        emit Swap(tokenIn, tokenOut, amountIn, amountOut);
        return amountOut;
    }
}