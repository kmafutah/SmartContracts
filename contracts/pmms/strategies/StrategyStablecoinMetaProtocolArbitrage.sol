// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IRegistry.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/ICurvePool.sol";
import "../interfaces/IConvexBooster.sol";
import "../interfaces/ISwapRouter.sol"; // For potential Uniswap V3
import "../interfaces/IQuoter.sol";     // For Uniswap V3 price quoting
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; // Explicitly import for SafeERC20 usage

contract StrategyStablecoinMetaProtocolArbitrage is IStrategy, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IRegistry public registry;
    uint256 public constant SLIPPAGE_TOLERANCE = 50; // 0.5%
    uint24 public constant UNISWAP_V3_FEE = 3000; // 0.3% fee tier (example)

    constructor(address _registry) {
        require(_registry != address(0), "Invalid registry address");
        registry = IRegistry(_registry);
    }

    function name() external pure override returns (string memory) {
        return "Stablecoin Meta Protocol Arbitrage";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        // view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        // This is a simplified check. A real strategy would:
        // 1. Get current prices/yields from Curve pools.
        // 2. Get current yields/LP token value from Convex for corresponding pools.
        // 3. Compare potential profits from swapping on Curve vs. depositing into Convex vaults
        //    or arbitrage between the two.

        address curvePool = registry.getAddress("CURVE_3POOL");
        address convexBooster = registry.getAddress("CONVEX");
        address usdc = registry.getAddress("USDC");
        address usdt = registry.getAddress("USDT");
        address uniswapRouter = registry.getAddress("UNISWAP_V3"); // Assuming V3 for general swaps
        address quoter = registry.getAddress("UNISWAP_V3_QUOTER"); // Assuming Quoter address is also in registry

        if (curvePool == address(0) || convexBooster == address(0) || usdc == address(0) || usdt == address(0) || uniswapRouter == address(0) || quoter == address(0)) {
            return (0, ""); // Not all required addresses are set
        }

        // Example: Check direct swap on Uniswap V3 (e.g., USDC to USDT) vs. Curve
        // This is purely for demonstration of how to use Quoter, not the full arbitrage logic.
        uint256 expectedUsdtFromUniswap;
        try IQuoter(quoter).quoteExactInputSingle(usdc, usdt, UNISWAP_V3_FEE, amount, 0) returns (uint256 amountOut) {
            expectedUsdtFromUniswap = amountOut;
        } catch {
            expectedUsdtFromUniswap = 0; // Quoting failed
        }

        uint256 expectedUsdtFromCurve;
        try ICurvePool(curvePool).get_dy(1, 2, amount) returns (uint256 amountOut) { // Assuming USDC is index 1, USDT is index 2
            expectedUsdtFromCurve = amountOut;
        } catch {
            expectedUsdtFromCurve = 0; // Curve price check failed
        }

        // Simplified profit calculation: if Curve offers better price than Uniswap V3 (or vice-versa), consider it.
        // A real strategy would factor in Convex yields and LP token dynamics.
        if (expectedUsdtFromCurve > expectedUsdtFromUniswap && expectedUsdtFromCurve > amount) {
            profit = expectedUsdtFromCurve - amount;
            executionData = abi.encode(curvePool, usdc, usdt, expectedUsdtFromCurve, true); // true for Curve
        } else if (expectedUsdtFromUniswap > expectedUsdtFromCurve && expectedUsdtFromUniswap > amount) {
            profit = expectedUsdtFromUniswap - amount;
            executionData = abi.encode(uniswapRouter, usdc, usdt, expectedUsdtFromUniswap, false); // false for Uniswap
        } else {
            profit = 0;
            executionData = "";
        }
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool success, bytes memory result, uint256)
    {
        (address protocolAddress, address tokenIn, address tokenOut, uint256 minOutExpected, bool isCurve) = abi.decode(executionData, (address, address, address, uint256, bool));
        require(protocolAddress != address(0), "Invalid protocol address");
        require(minOutExpected > 0, "No minimum output specified");

        // Ensure sufficient tokenIn balance
        require(IERC20(tokenIn).balanceOf(address(this)) >= amount, "Insufficient tokenIn balance");

        uint256 finalAmountReceived = 0;

        if (isCurve) {
            address curvePool = protocolAddress;
            address usdc = registry.getAddress("USDC");
            address usdt = registry.getAddress("USDT");
            address curve3PoolToken = registry.getAddress("CURVE_3POOL_TOKEN");

            require(usdc == tokenIn && usdt == tokenOut, "Curve execution expects USDC to USDT");

            // 1. Swap USDC to USDT on Curve
            IERC20(usdc).approve(curvePool, amount);
            uint256 minDy = (minOutExpected * (10000 - SLIPPAGE_TOLERANCE)) / 10000;
            uint256 usdtReceived = ICurvePool(curvePool).exchange(1, 2, amount, minDy); // Assuming USDC (1) to USDT (2)
            IERC20(usdc).approve(curvePool, 0); // Revoke approval

            // 2. Add USDT to Curve 3pool to get LP tokens
            IERC20(usdt).approve(curvePool, usdtReceived);
            uint256[3] memory amounts = [uint256(0), uint256(0), usdtReceived]; // DAI, USDC, USDT
            uint256 lpReceived = ICurvePool(curvePool).add_liquidity(amounts, 0);
            IERC20(usdt).approve(curvePool, 0); // Revoke approval

            // 3. Deposit LP tokens to Convex
            address convex = registry.getAddress("CONVEX");
            require(lpReceived > 0, "No LP tokens received");
            require(convex != address(0), "Convex address not set in Registry");
            IERC20(curve3PoolToken).approve(convex, lpReceived);
            require(IConvexBooster(convex).deposit(0, lpReceived, true), "Convex deposit failed"); // Assuming poolid 0, stake = true
            IERC20(curve3PoolToken).approve(convex, 0); // Revoke approval

            finalAmountReceived = usdtReceived; // For profit calculation, consider the intermediate swap output
        } else {
            // Example: Execute on Uniswap V3 (if Uniswap was chosen as best path)
            address uniswapRouter = protocolAddress;
            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: UNISWAP_V3_FEE, // Replace with dynamic fee or specific fee
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: amount,
                amountOutMinimum: (minOutExpected * (10000 - SLIPPAGE_TOLERANCE)) / 10000,
                sqrtPriceLimitX96: 0
            });

            IERC20(tokenIn).approve(uniswapRouter, amount);
            finalAmountReceived = ISwapRouter(uniswapRouter).exactInputSingle(params);
            IERC20(tokenIn).approve(uniswapRouter, 0); // Revoke approval
        }

        uint256 profit = finalAmountReceived > amount + premium ? finalAmountReceived - amount - premium : 0;
        require(profit > 0, "Insufficient profit after trade");

        return (true, abi.encode(finalAmountReceived, profit), profit);
    }
}