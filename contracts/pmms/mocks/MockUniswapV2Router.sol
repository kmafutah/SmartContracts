// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockUniswapV2Router {
    function getAmountsOut(uint amountIn, address[] memory path) external view returns (uint[] memory amounts) {
        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn * 995 / 1000; // Simulate 0.5% slippage
        return amounts;
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        require(block.timestamp <= deadline, "Expired");
        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn * 995 / 1000;
        require(amounts[1] >= amountOutMin, "Insufficient output");
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        IERC20(path[1]).transfer(to, amounts[1]);
        return amounts;
    }
}