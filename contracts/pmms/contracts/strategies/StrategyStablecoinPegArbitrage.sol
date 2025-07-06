// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IRegistry.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/ICurvePool.sol";
import "../interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract StrategyStablecoinPegArbitrage is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    IRegistry public registry;
    address public usdc;
    address public usdt;
    address public curve3Pool;
    address public uniswapV2;
    uint256 public slippageTolerance; // Basis points (100 = 1%)

    event PegArbitrage(
        address indexed stableIn,
        address indexed stableOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _registry) external initializer {        
        require(_registry != address(0), "Invalid registry");
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        registry = IRegistry(_registry);
        usdc = IRegistry(_registry).getAddress("USDC");
        usdt = IRegistry(_registry).getAddress("USDT");
        curve3Pool = IRegistry(_registry).getAddress("CURVE_3POOL");
        uniswapV2 = IRegistry(_registry).getAddress("UNISWAP_V2");
        require(usdc != address(0), "USDC address not set");
        require(usdt != address(0), "USDT address not set");
        require(curve3Pool != address(0), "Curve 3Pool address not set");
        require(uniswapV2 != address(0), "Uniswap V2 address not set");
        slippageTolerance = 100; // 1%
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function name() external pure override returns (string memory) {
        return "StablecoinPegArbitrage";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        if (asset != usdc && asset != usdt || amount == 0) {
            return (0, "");
        }

        address stableIn = asset;
        address stableOut = asset == usdc ? usdt : usdc;

        // Get Curve price
        uint256 curveOut;
        int128 curveInIndex = _getCurveTokenIndex(curve3Pool, stableIn);
        int128 curveOutIndex = _getCurveTokenIndex(curve3Pool, stableOut);
        if (curveInIndex >= 0 && curveOutIndex >= 0) {
            (bool curveSuccess, bytes memory curveData) = address(curve3Pool).staticcall(
                abi.encodeWithSelector(
                    ICurvePool.get_dy.selector,
                    curveInIndex,
                    curveOutIndex,
                    amount
                )
            );
            if (curveSuccess) {
                try this.decodeCurveResult(curveData) returns (uint256 amountOut) {
                    curveOut = amountOut;
                } catch {
                    curveOut = 0;
                }
            }
        }

        // Get Uniswap V2 price
        uint256 uniOut;
        address[] memory path = new address[](2);
        path[0] = stableIn;
        path[1] = stableOut;
        (bool uniSuccess, bytes memory uniData) = address(uniswapV2).staticcall(
            abi.encodeWithSelector(
                IUniswapV2Router02.getAmountsOut.selector,
                amount,
                path
            )
        );
        if (uniSuccess) {
            try this.decodeUniResult(uniData) returns (uint256[] memory amounts) {
                uniOut = amounts[1];
            } catch {
                uniOut = 0;
            }
        }

        // Compare prices
        if (curveOut > (uniOut * (10000 + slippageTolerance)) / 10000 && curveOut > amount) {
            profit = curveOut - uniOut;
            executionData = abi.encode(stableIn, stableOut, curveOut, true); // Curve -> Uni
        } else if (uniOut > (curveOut * (10000 + slippageTolerance)) / 10000 && uniOut > amount) {
            profit = uniOut - curveOut;
            executionData = abi.encode(stableIn, stableOut, uniOut, false); // Uni -> Curve
        } else {
            return (0, "");
        }
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool success, bytes memory result, uint256 profit)
    {
        (address stableIn, address stableOut, uint256 expectedOut, bool useCurveFirst) = abi.decode(
            executionData,
            (address, address, uint256, bool)
        );
        require(stableIn == usdc || stableIn == usdt, "Invalid stableIn");
        require(stableOut == usdc || stableOut == usdt, "Invalid stableOut");
        require(stableIn != stableOut, "Same tokens");
        require(expectedOut > 0, "Invalid expected output");
        require(amount > 0, "Invalid amount");

        IERC20 stableInContract = IERC20(stableIn);
        require(stableInContract.balanceOf(address(this)) >= amount, "Insufficient balance");

        uint256 finalAmountReceived;
        if (useCurveFirst) {
            // Curve: stableIn -> stableOut
            int128 i = _getCurveTokenIndex(curve3Pool, stableIn);
            int128 j = _getCurveTokenIndex(curve3Pool, stableOut);
            require(i >= 0 && j >= 0, "Invalid Curve indices");

            uint256 minDy = (expectedOut * (10000 - slippageTolerance)) / 10000;
            stableInContract.approve(curve3Pool, amount);
            uint256 received;
            try ICurvePool(curve3Pool).exchange(i, j, amount, minDy) returns (uint256 out) {
                received = out;
            } catch {
                stableInContract.approve(curve3Pool, 0);
                revert("Curve swap failed");
            }
            stableInContract.approve(curve3Pool, 0);

            // Uniswap V2: stableOut -> stableIn
            address[] memory path = new address[](2);
            path[0] = stableOut;
            path[1] = stableIn;
            IERC20 stableOutContract = IERC20(stableOut);
            stableOutContract.approve(uniswapV2, received);
            uint256[] memory amounts;
            try IUniswapV2Router02(uniswapV2).swapExactTokensForTokens(
                received,
                (amount * (10000 - slippageTolerance)) / 10000,
                path,
                address(this),
                block.timestamp + 300
            ) returns (uint256[] memory out) {
                amounts = out;
            } catch {
                stableOutContract.approve(uniswapV2, 0);
                revert("Uniswap V2 swap failed");
            }
            stableOutContract.approve(uniswapV2, 0);
            finalAmountReceived = amounts[1];
        } else {
            // Uniswap V2: stableIn -> stableOut
            address[] memory path = new address[](2);
            path[0] = stableIn;
            path[1] = stableOut;
            stableInContract.approve(uniswapV2, amount);
            uint256 received;
            try IUniswapV2Router02(uniswapV2).swapExactTokensForTokens(
                amount,
                (expectedOut * (10000 - slippageTolerance)) / 10000,
                path,
                address(this),
                block.timestamp + 300
            ) returns (uint256[] memory out) {
                received = out[1];
            } catch {
                stableInContract.approve(uniswapV2, 0);
                revert("Uniswap V2 swap failed");
            }
            stableInContract.approve(uniswapV2, 0);

            // Curve: stableOut -> stableIn
            int128 i = _getCurveTokenIndex(curve3Pool, stableOut);
            int128 j = _getCurveTokenIndex(curve3Pool, stableIn);
            require(i >= 0 && j >= 0, "Invalid Curve indices");

            IERC20 stableOutContract = IERC20(stableOut);
            stableOutContract.approve(curve3Pool, received);
            try ICurvePool(curve3Pool).exchange(i, j, received, (amount * (10000 - slippageTolerance)) / 10000) returns (uint256 out) {
                finalAmountReceived = out;
            } catch {
                stableOutContract.approve(curve3Pool, 0);
                revert("Curve swap failed");
            }
            stableOutContract.approve(curve3Pool, 0);
        }

        profit = finalAmountReceived > amount + premium ? finalAmountReceived - amount - premium : 0;
        require(profit > 0, "Insufficient profit");

        emit PegArbitrage(stableIn, stableOut, amount, finalAmountReceived, profit, block.timestamp);

        return (true, abi.encode(finalAmountReceived, profit), profit);
    }

    function getCurvePrice(address assetIn, address assetOut, uint256 amount) internal view returns (uint256) {
        int128 i = _getCurveTokenIndex(curve3Pool, assetIn);
        int128 j = _getCurveTokenIndex(curve3Pool, assetOut);
        if (i < 0 || j < 0) return 0;
        (bool success, bytes memory data) = address(curve3Pool).staticcall(
            abi.encodeWithSelector(ICurvePool.get_dy.selector, i, j, amount)
        );
        if (!success) return 0;
        try this.decodeCurveResult(data) returns (uint256 amountOut) {
            return amountOut;
        } catch {
            return 0;
        }
    }

    function _getUniPrice(address assetIn, address assetOut, uint256 amount) internal view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = assetIn;
        path[1] = assetOut;
        (bool success, bytes memory data) = address(uniswapV2).staticcall(
            abi.encodeWithSelector(IUniswapV2Router02.getAmountsOut.selector, amount, path)
        );
        if (!success) return 0;
        try this.decodeUniResult(data) returns (uint256[] memory amounts) {
            return amounts[1];
        } catch {
            return 0;
        }
    }

    // Helper functions for static call decoding
    function decodeCurveResult(bytes memory data) external pure returns (uint256 amountOut) {
        (amountOut) = abi.decode(data, (uint256));
    }

    function decodeUniResult(bytes memory data) external pure returns (uint256[] memory amounts) {
        (amounts) = abi.decode(data, (uint256[]));
    }

    // Get Curve token index dynamically
    function _getCurveTokenIndex(address curvePool, address token) internal view returns (int128) {
        try ICurvePool(curvePool).coins(0) returns (address coin0) {
            if (coin0 == token) return 0;
        } catch {}
        try ICurvePool(curvePool).coins(1) returns (address coin1) {
            if (coin1 == token) return 1;
        } catch {}
        try ICurvePool(curvePool).coins(2) returns (address coin2) {
            if (coin2 == token) return 2;
        } catch {}
        return -1;
    }
}