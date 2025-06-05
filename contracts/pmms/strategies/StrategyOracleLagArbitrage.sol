// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IRegistry.sol";
import "../interfaces/IStrategy.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract StrategyOracleLagArbitrage is IStrategy, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public registry;
    uint256 public constant SLIPPAGE_TOLERANCE = 50; // 0.5%

    constructor(address _registry) {
        registry = _registry;
    }

    function name() external pure override returns (string memory) {
        return "Oracle Lag Arbitrage";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        address priceFeed = IRegistry(registry).getAddress("ETH_USD_FEED");
        (, int256 oraclePrice,,,) = AggregatorV3Interface(priceFeed).latestRoundData();
        require(oraclePrice > 0, "Invalid oracle price");

        address uniswapRouter = IRegistry(registry).getAddress("UNISWAP_V2");
        address usdc = IRegistry(registry).getAddress("USDC");

        address[] memory path = new address[](2);
        path[0] = asset; // e.g., WETH
        path[1] = usdc; // USDC
        uint256[] memory amounts = IUniswapV2Router02(uniswapRouter).getAmountsOut(amount, path);
        uint256 dexPrice = amounts[1]; // USDC amount

        // Normalize prices
        uint256 oraclePriceNormalized = (uint256(oraclePrice) * amount) / 1e8; // USDC amount
        if (oraclePriceNormalized > dexPrice) {
            profit = oraclePriceNormalized - dexPrice; // Profit in USDC
            executionData = abi.encode(asset, dexPrice);
        }
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool success, bytes memory result, uint256)
    {
        (address asset, uint256 dexPrice) = abi.decode(executionData, (address, uint256));
        (address token, address oracle) = abi.decode(executionData, (address, address));

        require(asset != address(0), "Invalid asset");
        address uniswapRouter = IRegistry(registry).getAddress("UNISWAP_V2");
        address usdc = IRegistry(registry).getAddress("USDC");
        

        // Ensure sufficient balance
        require(IERC20(asset).balanceOf(address(this)) >= amount, "Insufficient asset balance");
        address dex = IRegistry(registry).getAddress("UNISWAP_V3");
        // IERC20(token).forceApprove(dex, amount);
        // Approve Uniswap router
        IERC20(token).approve(dex, amount);

        // Swap asset for USDC
        address[] memory path = new address[](2);
        path[0] = asset;
        path[1] = usdc;
        uint256 minOut = (dexPrice * (10000 - SLIPPAGE_TOLERANCE)) / 10000;
        uint256[] memory amounts = IUniswapV2Router02(uniswapRouter).swapExactTokensForTokens(
            amount,
            minOut,
            path,
            address(this),
            block.timestamp + 300
        );

        // Reset allowance for safety
        IERC20(asset).approve(uniswapRouter, 0);

        uint256 finalAmount = amounts[1];
        require(finalAmount > premium, "Insufficient profit");

        // return finalAmount - premium;
        // Swap based on oracle lag
        uint256 profit = finalAmount - premium;// Sell price - buy price
        return (true, abi.encode(token, profit), profit - premium);    
    }
}