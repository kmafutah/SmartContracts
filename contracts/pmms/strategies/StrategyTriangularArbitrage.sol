// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IRegistry.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/ISwapRouter.sol";
import "../interfaces/IQuoter.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract StrategyTriangularArbitrage is IStrategy {
    using SafeERC20 for IERC20;

    IRegistry public immutable registry;
    uint256 public constant SLIPPAGE_TOLERANCE = 50; // 0.5%
    uint24 public constant POOL_FEE = 3000; // 0.3% fee tier
    uint160 public constant SQRT_PRICE_LIMIT_X96 = 0;

    constructor(address _registry) {
        require(_registry != address(0), "Invalid registry address");
        registry = IRegistry(_registry);
    }

    function name() external pure override returns (string memory) {
        return "Triangular Arbitrage";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        override  // REMOVED view modifier
        returns (uint256 profit, bytes memory executionData)
    {
        address uniswapRouter = registry.getAddress("UNISWAP_V3");
        address quoter = registry.getAddress("UNISWAP_V3_QUOTER");
        address usdc = registry.getAddress("USDC");
        address dai = registry.getAddress("DAI");

        if (uniswapRouter == address(0) || quoter == address(0) || usdc == address(0) || dai == address(0)) {
            return (0, "");
        }

        // Triangular path: asset -> USDC -> DAI -> asset
        address[] memory path = new address[](3);
        path[0] = asset;
        path[1] = usdc;
        path[2] = dai;

        uint256 amountOut;
        
        // Swap 1: asset -> USDC
        amountOut = IQuoter(quoter).quoteExactInputSingle(
            path[0],
            path[1],
            POOL_FEE,
            amount,
            SQRT_PRICE_LIMIT_X96
        );

        // Swap 2: USDC -> DAI
        amountOut = IQuoter(quoter).quoteExactInputSingle(
            path[1],
            path[2],
            POOL_FEE,
            amountOut,
            SQRT_PRICE_LIMIT_X96
        );

        // Swap 3: DAI -> asset
        amountOut = IQuoter(quoter).quoteExactInputSingle(
            path[2],
            path[0],
            POOL_FEE,
            amountOut,
            SQRT_PRICE_LIMIT_X96
        );

        if (amountOut > amount) {
            profit = amountOut - amount;
            executionData = abi.encode(path);
        }
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        returns (bool success, bytes memory result, uint256 profit)
    {
        address uniswapRouter = registry.getAddress("UNISWAP_V3");
        require(uniswapRouter != address(0), "Uniswap router not set");

        address[] memory path = abi.decode(executionData, (address[]));
        require(path.length == 3, "Invalid path length");

        IERC20 tokenIn = IERC20(path[0]);
        tokenIn.forceApprove(uniswapRouter, amount);

        uint256 amountOutMinimum = amount * (10000 - SLIPPAGE_TOLERANCE) / 10000;

        // Execute swap 1: path[0] -> path[1]
        uint256 amountOut1 = ISwapRouter(uniswapRouter).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: path[0],
                tokenOut: path[1],
                fee: POOL_FEE,
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: amount,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: SQRT_PRICE_LIMIT_X96
            })
        );

        // Execute swap 2: path[1] -> path[2]
        uint256 amountOut2 = ISwapRouter(uniswapRouter).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: path[1],
                tokenOut: path[2],
                fee: POOL_FEE,
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: amountOut1,
                amountOutMinimum: amountOut1 * (10000 - SLIPPAGE_TOLERANCE) / 10000,
                sqrtPriceLimitX96: SQRT_PRICE_LIMIT_X96
            })
        );

        // Execute swap 3: path[2] -> path[0]
        uint256 finalAmount = ISwapRouter(uniswapRouter).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: path[2],
                tokenOut: path[0],
                fee: POOL_FEE,
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: amountOut2,
                amountOutMinimum: amountOut2 * (10000 - SLIPPAGE_TOLERANCE) / 10000,
                sqrtPriceLimitX96: SQRT_PRICE_LIMIT_X96
            })
        );

        profit = finalAmount > amount + premium ? finalAmount - amount - premium : 0;
        require(profit > 0, "Insufficient profit");

        return (true, abi.encode(finalAmount), profit);
    }

    function withdraw(address token, uint256 amount) external {
        require(msg.sender == address(registry), "Only registry can withdraw");
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}