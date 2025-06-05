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
import "../utils/StrategyLib.sol";

// Mock gas price oracle interface for SKALE
interface IGasPriceOracle {
    function getGasPrice() external view returns (uint256);
}

contract StrategyGasRefundArbitrage is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public registry;
    uint256 public slippageTolerance;
    uint256 public estimatedGas;
    address public gasOracle; // Mock gas oracle for SKALE

    event GasArbitrageExecuted(address indexed asset, uint256 profit, uint256 timestamp);

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
        estimatedGas = 100000;
        gasOracle = IRegistry(_registry).getAddress("GAS_ORACLE"); // Fetch from Registry
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function name() external pure override returns (string memory) {
        return "GasRefundArbitrage";
    }

    struct ExecutionParams {
        address weth;
        uint256 refund;
        address router;
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        address usdc = IRegistry(registry).getAddress("USDC");
        if (asset != usdc) return (0, "");

        (address weth, address router, uint256 wethOut) = _getBestSwapRoute(usdc, amount);
        (uint256 ethPrice, uint8 decimals) = StrategyLib.getOnchainPrice(IRegistry(registry).getAddress("ETH_USD_FEED"));
        uint256 refundInWeth = _calculateRefundValue(ethPrice, decimals);

        if (wethOut + refundInWeth > amount) {
            profit = wethOut + refundInWeth - amount;
            executionData = abi.encode(ExecutionParams(weth, refundInWeth, router));
        }
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool, bytes memory, uint256)
    {
        ExecutionParams memory params = abi.decode(executionData, (ExecutionParams));
        address usdc = IRegistry(registry).getAddress("USDC");

        _validateExecution(params.weth, params.router, usdc, amount);
        uint256 wethOut = _executeSwap(usdc, params.weth, amount, params.router);
        uint256 profit = _calculateProfit(amount, premium, wethOut, params.refund);

        emit GasArbitrageExecuted(usdc, profit, block.timestamp);
        return (true, abi.encode(wethOut, params.refund, profit), profit);
    }

    function _getBestSwapRoute(address usdc, uint256 amount) internal view returns (address, address, uint256) {
        address weth = IRegistry(registry).getAddress("WETH");
        address uniswap = IRegistry(registry).getAddress("UNISWAP_V2");
        address sushiswap = IRegistry(registry).getAddress("SUSHISWAP");

        uint256 uniOut = StrategyLib._getPrice(uniswap, usdc, weth, amount);
        uint256 sushiOut = StrategyLib._getPrice(sushiswap, usdc, weth, amount);

        return uniOut >= sushiOut 
            ? (weth, uniswap, uniOut) 
            : (weth, sushiswap, sushiOut);
    }

    function _calculateRefundValue(uint256 ethPrice, uint8 decimals) internal view returns (uint256) {
        uint256 gasPrice;
        try IGasPriceOracle(gasOracle).getGasPrice() returns (uint256 price) {
            gasPrice = price;
        } catch {
            gasPrice = 0; // Default to zero for SKALE
        }
        uint256 gasCost = gasPrice * estimatedGas;
        uint256 refund = gasCost / 2;
        return (refund * ethPrice) / (10 ** decimals);
    }

    function _validateExecution(address weth, address router, address usdc, uint256 amount) internal view {
        require(weth == IRegistry(registry).getAddress("WETH"), "Invalid WETH");
        require(
            router == IRegistry(registry).getAddress("UNISWAP_V2") ||
            router == IRegistry(registry).getAddress("SUSHISWAP"),
            "Invalid router"
        );
        require(usdc != address(0), "Invalid USDC");
        require(IERC20(usdc).balanceOf(address(this)) >= amount, "Insufficient USDC");
    }

    function _executeSwap(address tokenIn, address tokenOut, uint256 amount, address router) internal returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        IERC20(tokenIn).approve(router, amount);
        uint256 amountOut = StrategyLib.swapTokens(
            router,
            path,
            amount,
            (amount * (10000 - slippageTolerance)) / 10000
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