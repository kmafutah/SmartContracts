// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IRegistry.sol";
import "../interfaces/IStrategy.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

interface IUniswapV2Pair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
}

contract StrategyMEVCapture is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public registry;
    uint256 public slippageTolerance; // 0.5% (50 basis points)
    uint256 public minProfit; // 1% (100 basis points)

    event MEVArbitrageExecuted(address indexed token, uint256 profit, uint256 timestamp);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); // Prevent initialization during deployment
    }

    function initialize(address _registry) external initializer {
        require(_registry != address(0), "Invalid registry");
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        registry = _registry;
        slippageTolerance = 50; // 0.5%
        minProfit = 100; // 1%
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function name() external pure override returns (string memory) {
        return "MEVCapture";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        if (asset == address(0)) return (0, "");

        address weth = IRegistry(registry).getAddress("WETH");
        address router = IRegistry(registry).getAddress("UNISWAP_V2");
        address pair = IRegistry(registry).getAddress("UNISWAP_V2_PAIR");
        if (weth == address(0) || router == address(0) || pair == address(0)) return (0, "");

        (uint256 reserveAsset, uint256 reserveWeth) = _getReserves(pair, asset);
        if (reserveAsset == 0 || reserveWeth == 0) return (0, "");

        uint256 wethOut;
        try this._getAmountOut(amount, reserveAsset, reserveWeth) returns (uint256 out) {
            wethOut = out;
        } catch {
            return (0, "");
        }

        uint256 assetOut;
        try this._getAmountOut(wethOut, reserveWeth, reserveAsset) returns (uint256 out) {
            assetOut = out;
        } catch {
            return (0, "");
        }

        profit = assetOut > amount ? assetOut - amount : 0;
        if (profit >= _minProfit(amount)) {
            executionData = abi.encode(asset, weth, router);
        }
    }

    function execute(bytes calldata executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool success, bytes memory result, uint256 profit)
    {
        (address asset, address weth, address router) = abi.decode(executionData, (address, address, address));
        _validate(asset, weth, router, amount);

        uint256 wethReceived = _swap(router, asset, weth, amount);
        uint256 assetReceived = _swap(router, weth, asset, wethReceived);
        profit = _calculateProfit(assetReceived, amount, premium);

        emit MEVArbitrageExecuted(asset, profit, block.timestamp);
        success = true;
        result = abi.encode(profit);
        return (success, result, profit);
    }

    function _getReserves(address pair, address asset) internal view returns (uint256, uint256) {
        try IUniswapV2Pair(pair).getReserves() returns (uint112 reserve0, uint112 reserve1, uint32) {
            return IUniswapV2Pair(pair).token0() == asset ? (reserve0, reserve1) : (reserve1, reserve0);
        } catch {
            return (0, 0);
        }
    }

    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) external pure returns (uint256) {
        if (reserveIn == 0 || reserveOut == 0) return 0;
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        return numerator / denominator;
    }

    function _validate(address asset, address weth, address router, uint256 amount) internal view {
        require(asset != address(0) && weth != address(0) && router != address(0), "Invalid addresses");
        require(IERC20(asset).balanceOf(address(this)) >= amount, "Insufficient balance");
    }

    function _swap(address router, address tokenIn, address tokenOut, uint256 amount) internal returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        IERC20(tokenIn).approve(router, amount);
        uint256[] memory amounts;
        try IUniswapV2Router(router).swapExactTokensForTokens(
            amount,
            _minAmountOut(amount),
            path,
            address(this),
            block.timestamp + 300
        ) returns (uint256[] memory out) {
            amounts = out;
        } catch {
            revert("Swap failed");
        }
        IERC20(tokenIn).approve(router, 0);
        return amounts[1];
    }

    function _minProfit(uint256 amount) internal view returns (uint256) {
        return amount * minProfit / 10000;
    }

    function _minAmountOut(uint256 amount) internal view returns (uint256) {
        return amount * (10000 - slippageTolerance) / 10000;
    }

    function _calculateProfit(uint256 received, uint256 amount, uint256 premium) internal pure returns (uint256) {
        require(received > amount + premium, "Insufficient profit");
        return received - amount - premium;
    }
}