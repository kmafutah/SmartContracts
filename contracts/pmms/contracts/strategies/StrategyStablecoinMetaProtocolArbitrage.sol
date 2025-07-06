// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IRegistry.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/ICurvePool.sol";
import "../interfaces/IConvexBooster.sol";
import "../interfaces/ISwapRouter.sol";
import "../interfaces/IQuoter.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StrategyStablecoinMetaProtocolArbitrage is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    IRegistry public registry;
    uint256 public slippageTolerance; // 0.5% (50 basis points)
    uint24 public uniswapV3Fee; // 0.3% fee tier

    event ArbitrageExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        bool isCurve,
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
        slippageTolerance = 50;
        uniswapV3Fee = 3000;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function name() external pure override returns (string memory) {
        return "StablecoinMetaProtocolArbitrage";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        address curvePool = registry.getAddress("CURVE_3POOL");
        address convexBooster = registry.getAddress("CONVEX");
        address usdc = registry.getAddress("USDC");
        address usdt = registry.getAddress("USDT");
        address uniswapRouter = registry.getAddress("UNISWAP_V3");
        address quoter = registry.getAddress("UNISWAP_V3_QUOTER");

        if (curvePool == address(0) || convexBooster == address(0) || usdc == address(0) || usdt == address(0) || uniswapRouter == address(0) || quoter == address(0) || asset != usdc || amount == 0) {
            return (0, "");
        }

        // Get Uniswap V3 quote (USDC -> USDT)
        uint256 expectedUsdtFromUniswap;
        (bool uniSuccess, bytes memory uniData) = address(quoter).staticcall(
            abi.encodeWithSelector(
                IQuoter.quoteExactInputSingle.selector,
                usdc,
                usdt,
                uniswapV3Fee,
                amount,
                0
            )
        );
        if (uniSuccess) {
            try this.decodeQuoteResult(uniData) returns (uint256 amountOut) {
                expectedUsdtFromUniswap = amountOut;
            } catch {
                expectedUsdtFromUniswap = 0;
            }
        }

        // Get Curve quote (USDC -> USDT)
        uint256 expectedUsdtFromCurve;
        int128 usdcIndex = _getCurveTokenIndex(curvePool, usdc);
        int128 usdtIndex = _getCurveTokenIndex(curvePool, usdt);
        if (usdcIndex >= 0 && usdtIndex >= 0) {
            (bool curveSuccess, bytes memory curveData) = address(curvePool).staticcall(
                abi.encodeWithSelector(
                    ICurvePool.get_dy.selector,
                    usdcIndex,
                    usdtIndex,
                    amount
                )
            );
            if (curveSuccess) {
                try this.decodeCurveResult(curveData) returns (uint256 amountOut) {
                    expectedUsdtFromCurve = amountOut;
                } catch {
                    expectedUsdtFromCurve = 0;
                }
            }
        }

        // Mock Convex yield check (simplified for SKALE)
        uint256 convexYieldEstimate = expectedUsdtFromCurve > 0 ? expectedUsdtFromCurve * 101 / 100 : 0; // Assume 1% yield

        // Compare paths: Uniswap vs. Curve + Convex
        if (convexYieldEstimate > expectedUsdtFromUniswap && convexYieldEstimate > amount) {
            profit = convexYieldEstimate - amount;
            executionData = abi.encode(curvePool, usdc, usdt, expectedUsdtFromCurve, true);
        } else if (expectedUsdtFromUniswap > amount) {
            profit = expectedUsdtFromUniswap - amount;
            executionData = abi.encode(uniswapRouter, usdc, usdt, expectedUsdtFromUniswap, false);
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
        (address protocolAddress, address tokenIn, address tokenOut, uint256 minOutExpected, bool isCurve) = abi.decode(
            executionData,
            (address, address, address, uint256, bool)
        );
        require(protocolAddress != address(0), "Invalid protocol");
        require(tokenIn != address(0) && tokenOut != address(0), "Invalid tokens");
        require(minOutExpected > 0, "Invalid minimum output");
        require(amount > 0, "Invalid amount");

        IERC20 tokenInContract = IERC20(tokenIn);
        require(tokenInContract.balanceOf(address(this)) >= amount, "Insufficient balance");

        uint256 finalAmountReceived;
        if (isCurve) {
            address curvePool = protocolAddress;
            address usdc = registry.getAddress("USDC");
            address usdt = registry.getAddress("USDT");
            address curve3PoolToken = registry.getAddress("CURVE_3POOL_TOKEN");
            address convex = registry.getAddress("CONVEX");

            require(usdc == tokenIn && usdt == tokenOut, "Invalid Curve tokens");
            require(curve3PoolToken != address(0) && convex != address(0), "Invalid Curve/Convex config");

            int128 usdcIndex = _getCurveTokenIndex(curvePool, usdc);
            int128 usdtIndex = _getCurveTokenIndex(curvePool, usdt);
            require(usdcIndex >= 0 && usdtIndex >= 0, "Invalid Curve indices");

            // Swap USDC to USDT on Curve
            uint256 minDy = (minOutExpected * (10000 - slippageTolerance)) / 10000;
            tokenInContract.approve(curvePool, amount);
            uint256 usdtReceived;
            try ICurvePool(curvePool).exchange(usdcIndex, usdtIndex, amount, minDy) returns (uint256 out) {
                usdtReceived = out;
            } catch {
                tokenInContract.approve(curvePool, 0);
                revert("Curve swap failed");
            }
            tokenInContract.approve(curvePool, 0);

            // Add USDT to Curve 3pool
            IERC20 usdtContract = IERC20(usdt);
            usdtContract.approve(curvePool, usdtReceived);
            uint256[3] memory amounts = [0, 0, usdtReceived];
            uint256 lpReceived;
            try ICurvePool(curvePool).add_liquidity(amounts, 0) returns (uint256 out) {
                lpReceived = out;
            } catch {
                usdtContract.approve(curvePool, 0);
                revert("Curve liquidity failed");
            }
            usdtContract.approve(curvePool, 0);

            // Deposit LP tokens to Convex
            IERC20 lpToken = IERC20(curve3PoolToken);
            lpToken.approve(convex, lpReceived);
            try IConvexBooster(convex).deposit(1, lpReceived, true) {
                finalAmountReceived = usdtReceived; // Use swap output for profit
            } catch {
                lpToken.approve(convex, 0);
                revert("Convex deposit failed");
            }
            lpToken.approve(convex, 0);
        } else {
            // Uniswap V3 swap
            address uniswapRouter = protocolAddress;
            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: uniswapV3Fee,
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: amount,
                amountOutMinimum: (minOutExpected * (10000 - slippageTolerance)) / 10000,
                sqrtPriceLimitX96: 0
            });

            tokenInContract.approve(uniswapRouter, amount);
            try ISwapRouter(uniswapRouter).exactInputSingle(params) returns (uint256 out) {
                finalAmountReceived = out;
            } catch {
                tokenInContract.approve(uniswapRouter, 0);
                revert("Uniswap V3 swap failed");
            }
            tokenInContract.approve(uniswapRouter, 0);
        }

        profit = finalAmountReceived > amount + premium ? finalAmountReceived - amount - premium : 0;
        require(profit > 0, "Insufficient profit");

        emit ArbitrageExecuted(tokenIn, tokenOut, amount, finalAmountReceived, isCurve, profit, block.timestamp);

        return (true, abi.encode(finalAmountReceived, profit), profit);
    }

    // Helper functions for static call decoding
    function decodeQuoteResult(bytes memory data) external pure returns (uint256 amountOut) {
        (amountOut) = abi.decode(data, (uint256));
    }

    function decodeCurveResult(bytes memory data) external pure returns (uint256 amountOut) {
        (amountOut) = abi.decode(data, (uint256));
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