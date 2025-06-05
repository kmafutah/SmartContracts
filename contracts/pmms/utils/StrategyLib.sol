// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

library StrategyLib {
    function swapTokens(
        address router, 
        address[] memory path, 
        uint256 amount, 
        uint256 minOut
    ) internal returns (uint256) {
        uint256 deadline = block.timestamp + 300;
        IERC20(path[0]).approve(router, amount);
        uint[] memory amountsOut = IUniswapV2Router02(router).swapExactTokensForTokens(
            amount,
            minOut,
            path,
            address(this),
            deadline
        );
        return amountsOut[amountsOut.length - 1];
    }

    function _getPrice(
        address router, 
        address tokenIn, 
        address tokenOut, 
        uint256 amountIn
    ) internal view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        try IUniswapV2Router02(router).getAmountsOut(amountIn, path) returns (uint[] memory amounts) {
            return amounts[1];
        } catch {
            return 0;
        }
    }

    function getOnchainPrice(
        address tokenUsdFeed
    ) internal view returns (uint256 price, uint8 decimals) {
        (, int256 answer,,,) = AggregatorV3Interface(tokenUsdFeed).latestRoundData();
        decimals = AggregatorV3Interface(tokenUsdFeed).decimals();
        price = uint256(answer);
    }
}