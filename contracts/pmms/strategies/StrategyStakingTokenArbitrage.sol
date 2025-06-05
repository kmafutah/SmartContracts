// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IRegistry.sol";
import "../interfaces/IStrategy.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StrategyStakingTokenArbitrage is IStrategy, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IRegistry public immutable registry;
    address public constant STETH = 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84;
    uint256 public constant SLIPPAGE_TOLERANCE = 50; // 0.5%
    uint24 public constant POOL_FEE = 3000; // 0.3% fee tier
    uint160 public constant SQRT_PRICE_LIMIT_X96 = 0;

    event StakingTokenArbitrageExecuted(address indexed asset, uint256 profit, uint256 timestamp);

    constructor(address _registry) {
        require(_registry != address(0), "Invalid registry address");
        registry = IRegistry(_registry);
    }

    function name() external pure override returns (string memory) {
        return "Staking Token Arbitrage";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        override // Removed view modifier
        returns (uint256 profit, bytes memory executionData)
    {
        if (asset != STETH) return (0, "");

        address uniswapRouter = registry.getAddress("UNISWAP_V3");
        address weth = registry.getAddress("WETH");
        address quoter = registry.getAddress("UNISWAP_V3_QUOTER");

        if (uniswapRouter == address(0) || weth == address(0) || quoter == address(0)) {
            return (0, "");
        }

        // Get quotes without try-catch since we're not in a view function anymore
        uint256 stethToWeth = IQuoter(quoter).quoteExactInputSingle(
            STETH,
            weth,
            POOL_FEE,
            amount,
            SQRT_PRICE_LIMIT_X96
        );

        uint256 wethToSteth = IQuoter(quoter).quoteExactInputSingle(
            weth,
            STETH,
            POOL_FEE,
            stethToWeth,
            SQRT_PRICE_LIMIT_X96
        );

        if (wethToSteth > amount) {
            profit = wethToSteth - amount;
            executionData = abi.encode(weth);
        } else {
            profit = 0;
            executionData = "";
        }
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool success, bytes memory result, uint256 finalProfit)
    {
        address weth = abi.decode(executionData, (address));
        require(weth == registry.getAddress("WETH"), "Invalid WETH address");
        address uniswapRouter = registry.getAddress("UNISWAP_V3");
        require(uniswapRouter != address(0), "Invalid Uniswap router");
        require(IERC20(STETH).balanceOf(address(this)) >= amount, "Insufficient stETH balance");

        // 1. Swap stETH -> WETH
        IERC20(STETH).approve(uniswapRouter, amount);
        uint256 minWethOut = amount * (10000 - SLIPPAGE_TOLERANCE) / 10000;
        
        uint256 wethOut = ISwapRouter(uniswapRouter).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: STETH,
                tokenOut: weth,
                fee: POOL_FEE,
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: amount,
                amountOutMinimum: minWethOut,
                sqrtPriceLimitX96: SQRT_PRICE_LIMIT_X96
            })
        );
        IERC20(STETH).approve(uniswapRouter, 0);

        // 2. Swap WETH -> stETH
        require(IERC20(weth).balanceOf(address(this)) >= wethOut, "Insufficient WETH");
        IERC20(weth).approve(uniswapRouter, wethOut);
        uint256 minStethOut = amount * (10000 - SLIPPAGE_TOLERANCE) / 10000;
        
        uint256 finalStethAmount = ISwapRouter(uniswapRouter).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: weth,
                tokenOut: STETH,
                fee: POOL_FEE,
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: wethOut,
                amountOutMinimum: minStethOut,
                sqrtPriceLimitX96: SQRT_PRICE_LIMIT_X96
            })
        );
        IERC20(weth).approve(uniswapRouter, 0);

        // Calculate profit
        finalProfit = finalStethAmount > amount + premium ? finalStethAmount - amount - premium : 0;
        require(finalProfit > 0, "Insufficient profit");

        emit StakingTokenArbitrageExecuted(STETH, finalProfit, block.timestamp);
        return (true, abi.encode(finalProfit), finalProfit);
    }

    function withdraw(address token, uint256 amount) external {
        require(msg.sender == address(registry), "Only registry can withdraw");
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}