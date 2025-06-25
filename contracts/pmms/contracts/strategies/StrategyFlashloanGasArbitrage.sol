// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IRegistry.sol";
import "../interfaces/IStrategy.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

// Mock interface for SKALE (replace Optimism gas oracle)
interface IGasPriceOracle {
    function getFee() external view returns (uint256);
}

// Mock WETH interface for SKALE (no ETH deposits)
interface IWETH {
    function mint(address to, uint256 amount) external; // Mock minting
    function balanceOf(address account) external view returns (uint256);
}

contract StrategyFlashloanGasArbitrage is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    address public registry;
    uint256 public slippageTolerance;
    address public gasOracle; // Mock or SKALE-specific oracle

    event GasArbitrageExecuted(address indexed asset, uint256 profit, uint256 timestamp);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); // Prevent initialization during deployment
    }

    function initialize(address _registry) external initializer {
        require(_registry != address(0), "Invalid registry");       
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();         
        __UUPSUpgradeable_init();
        registry = _registry;
        slippageTolerance = 50; // 0.5%
        gasOracle = IRegistry(_registry).getAddress("GAS_ORACLE"); // Fetch from Registry
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function name() external pure override returns (string memory) {
        return "FlashloanGasArbitrage";
    }

    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        override
        returns (uint256 profit, bytes memory executionData)
    {
        address usdc = IRegistry(registry).getAddress("USDC");
        if (asset != usdc) return (0, "");

        (address weth, address uniswapRouter) = _getAddresses();
        uint256 fee = _estimateFee();
        uint256 refund = fee / 2; // Mock refund amount

        uint256 wethOut = _simulateSwap(usdc, weth, amount, uniswapRouter);
        uint256 refundInWeth = _convertRefund(refund);

        if (wethOut + refundInWeth > amount) {
            profit = wethOut + refundInWeth - amount;
            executionData = abi.encode(weth, refund, uniswapRouter);
        }
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool success, bytes memory result, uint256 profit)
    {
        (address weth, uint256 refund, address uniswapRouter) = abi.decode(executionData, (address, uint256, address));
        address usdc = IRegistry(registry).getAddress("USDC");

        _validateAddresses(weth, uniswapRouter, usdc);
        require(IERC20(usdc).balanceOf(address(this)) >= amount, "Insufficient USDC");

        if (refund > 0) {
            // Mock WETH minting instead of ETH deposit
            IWETH(weth).mint(address(this), refund);
        }

        uint256 wethOut = _executeSwap(usdc, weth, amount, uniswapRouter);
        uint256 refundInWeth = _convertRefund(refund);
        profit = _calculateProfit(amount, premium, wethOut, refundInWeth);

        emit GasArbitrageExecuted(usdc, profit, block.timestamp);
        success = true;
        result = abi.encode(wethOut, refundInWeth, profit);
        return (success, result, profit);
    }

    function _getAddresses() internal view returns (address weth, address uniswapRouter) {
        return (
            IRegistry(registry).getAddress("WETH"),
            IRegistry(registry).getAddress("UNISWAP_V3")
        );
    }

    function _estimateFee() internal view returns (uint256) {
        // Mock fee estimation for SKALE
        try IGasPriceOracle(gasOracle).getFee() returns (uint256 fee) {
            return fee;
        } catch {
            return 0; // Default to zero if no oracle
        }
    }

    function _simulateSwap(address tokenIn, address tokenOut, uint256 amount, address router) internal returns (uint256) {
        try ISwapRouter(router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: 500,
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 amountOut) {
            return amountOut;
        } catch {
            return 0;
        }
    }

    function _convertRefund(uint256 refund) internal view returns (uint256) {
        address priceFeed = IRegistry(registry).getAddress("ETH_USD_FEED");
        (, int256 ethPrice, , , ) = AggregatorV3Interface(priceFeed).latestRoundData();
        return ethPrice > 0 ? (refund * uint256(ethPrice)) / 1e8 : 0;
    }

    function _validateAddresses(address weth, address router, address usdc) internal view {
        require(weth == IRegistry(registry).getAddress("WETH"), "Invalid WETH");
        require(router == IRegistry(registry).getAddress("UNISWAP_V3"), "Invalid router");
        require(usdc != address(0), "Invalid USDC");
    }

    function _executeSwap(address tokenIn, address tokenOut, uint256 amount, address router) internal returns (uint256) {
        IERC20(tokenIn).approve(router, amount);
        uint256 amountOut = ISwapRouter(router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: 500,
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: amount,
                amountOutMinimum: (amount * (10000 - slippageTolerance)) / 10000,
                sqrtPriceLimitX96: 0
            })
        );
        IERC20(tokenIn).approve(router, 0);
        return amountOut;
    }

    function _calculateProfit(uint256 amount, uint256 premium, uint256 wethOut, uint256 refund) internal pure returns (uint256) {
        uint256 totalValue = wethOut + refund;
        require(totalValue > amount + premium, "Insufficient profit");
        return totalValue - amount - premium;
    }
}