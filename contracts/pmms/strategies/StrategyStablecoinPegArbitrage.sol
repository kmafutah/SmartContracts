// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IRegistry.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/ICurvePool.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract StrategyStablecoinPegArbitrage is IStrategy {
    using SafeERC20 for IERC20;

    address public immutable registry;
    address public USDC;
    address public USDT;
    address public CURVE_3POOL;
    address public UNISWAP_V2;
    uint256 public slippageTolerance = 100;

    event PegArbitrage(address indexed stableIn, address stableOut, uint256 amountIn, uint256 profit);

    constructor(address _registry) {
        require(_registry != address(0), "Invalid registry");
        registry = _registry;
        USDC = IRegistry(registry).getAddress("USDC");
        USDT = IRegistry(registry).getAddress("USDT");
        CURVE_3POOL = IRegistry(registry).getAddress("CURVE_3POOL");
        UNISWAP_V2 = IRegistry(registry).getAddress("UNISWAP_V2");
        require(USDC != address(0), "USDC address not set");
        require(USDT != address(0), "USDT address not set");
        require(CURVE_3POOL != address(0), "Curve 3Pool address not set");
        require(UNISWAP_V2 != address(0), "Uniswap V2 address not set");
    }

    function name() external pure override returns (string memory) {
        return "Stablecoin Peg Arbitrage";
    }

    function checkOpportunity(address asset, uint256 amount) external view override returns (uint256 profit, bytes memory executionData) {
        address otherStable = asset == USDC ? USDT : USDC;

        uint256 curveOut = getCurvePrice(asset, otherStable, amount);
        uint256 uniOut = _getUniPrice(asset, otherStable, amount);

        if (curveOut > (uniOut * (10000 + slippageTolerance)) / 10000) {
            profit = curveOut - uniOut;
            executionData = abi.encode(asset, otherStable, curveOut);
        } else if (uniOut > (curveOut * (10000 + slippageTolerance)) / 10000) {
            profit = uniOut - curveOut;
            executionData = abi.encode(otherStable, asset, uniOut);
        }
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium) external override returns (bool success, bytes memory result, uint256) {
        (address stableIn, address stableOut, uint256 expectedOut) = abi.decode(executionData, (address, address, uint256));
        
        IERC20(stableIn).approve(CURVE_3POOL, amount);
        uint256 minDy = (expectedOut * (10000 - slippageTolerance)) / 10000;
        uint256 received = ICurvePool(CURVE_3POOL).exchange(
            stableIn == USDC ? int128(1) : int128(2),
            stableOut == USDC ? int128(1) : int128(2),
            amount,
            minDy
        );

        address[] memory path = new address[](2);
        path[0] = stableOut;
        path[1] = stableIn;

        IERC20(stableOut).approve(UNISWAP_V2, received);
        uint256[] memory amounts = IUniswapV2Router02(UNISWAP_V2).swapExactTokensForTokens(
            received,
            (amount * (10000 - slippageTolerance)) / 10000,
            path,
            address(this),
            block.timestamp + 300
        );

        uint256 finalAmount = amounts[1];
        uint256 profit = finalAmount - amount - premium;
        
        emit PegArbitrage(stableIn, stableOut, amount, profit);
        return (true, abi.encode(profit), profit);
    }

    function getCurvePrice(address assetIn, address assetOut, uint256 amount) internal view returns (uint256) {
        int128 i = assetIn == USDC ? int128(1) : int128(2);
        int128 j = assetOut == USDC ? int128(1) : int128(2);
        return ICurvePool(CURVE_3POOL).get_dy(i, j, amount);
    }

    function _getUniPrice(address assetIn, address assetOut, uint256 amount) internal view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = assetIn;
        path[1] = assetOut;
        uint[] memory amounts = IUniswapV2Router02(UNISWAP_V2).getAmountsOut(amount, path);
        return amounts[1];
    }
}