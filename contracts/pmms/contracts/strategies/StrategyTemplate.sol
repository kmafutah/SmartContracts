// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IRegistry.sol";
import "../interfaces/IStrategy.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StrategyTemplate is IStrategy, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IRegistry public immutable registry;
    uint256 public constant SLIPPAGE_TOLERANCE = 50;
    uint24 public constant POOL_FEE = 3000;
    uint160 public constant SQRT_PRICE_LIMIT_X96 = 0;

    constructor(address _registry) {
        require(_registry != address(0), "Invalid registry");
        registry = IRegistry(_registry);
    }

    function name() external pure override returns (string memory) {
        return "Strategy Template";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        override
        returns (uint256 profit, bytes memory executionData)
    {
        address quoter = registry.getAddress("UNISWAP_V3_QUOTER");
        // Remove try-catch since not view anymore
        uint256 quotedAmount = IQuoter(quoter).quoteExactInputSingle(
            asset,
            registry.getAddress("WETH"), // Example token
            POOL_FEE,
            amount,
            SQRT_PRICE_LIMIT_X96
        );
        
        if (quotedAmount > amount) {
            profit = quotedAmount - amount;
            executionData = abi.encode(asset);
        }
    }

    function execute(bytes memory data, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool, bytes memory, uint256)
    {
        address router = registry.getAddress("UNISWAP_V3");
        address tokenIn = abi.decode(data, (address));
        
        // Use approve instead of safeApprove
        IERC20(tokenIn).approve(router, amount);
        
        uint256 amountOut = ISwapRouter(router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: registry.getAddress("WETH"),
                fee: POOL_FEE,
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: amount,
                amountOutMinimum: amount * (10000 - SLIPPAGE_TOLERANCE) / 10000,
                sqrtPriceLimitX96: SQRT_PRICE_LIMIT_X96
            })
        );
        
        // Reset approval
        IERC20(tokenIn).approve(router, 0);
        
        uint256 profit = amountOut > amount + premium ? amountOut - amount - premium : 0;
        return (true, abi.encode(amountOut), profit);
    }
}