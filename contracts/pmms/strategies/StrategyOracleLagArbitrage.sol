// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IRegistry.sol";
import "../interfaces/IStrategy.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract StrategyOracleLagArbitrage is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    address public registry;
    uint256 public slippageTolerance; // 0.5% (50 basis points)

    event OracleLagArbitrageExecuted(address indexed asset, uint256 profit, uint256 timestamp);

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
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function name() external pure override returns (string memory) {
        return "OracleLagArbitrage";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        if (asset == address(0) || amount == 0) return (0, "");

        address priceFeed = IRegistry(registry).getAddress("ETH_USD_FEED");
        if (priceFeed == address(0)) return (0, "");

        int256 oraclePrice;
        try AggregatorV3Interface(priceFeed).latestRoundData() returns (uint80, int256 price, uint256, uint256, uint80) {
            oraclePrice = price;
        } catch {
            return (0, "");
        }
        if (oraclePrice <= 0) return (0, "");

        address uniswapRouter = IRegistry(registry).getAddress("UNISWAP_V2");
        address usdc = IRegistry(registry).getAddress("USDC");
        if (uniswapRouter == address(0) || usdc == address(0)) return (0, "");

        address[] memory path = new address[](2);
        path[0] = asset; // e.g., WETH
        path[1] = usdc; // USDC
        uint256[] memory amounts;
        try IUniswapV2Router02(uniswapRouter).getAmountsOut(amount, path) returns (uint256[] memory out) {
            amounts = out;
        } catch {
            return (0, "");
        }
        if (amounts.length < 2) return (0, "");
        uint256 dexPrice = amounts[1]; // USDC amount

        // Normalize prices (assuming 8 decimals for Chainlink ETH/USD feed)
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
        returns (bool success, bytes memory result, uint256 profit)
    {
        (address asset, uint256 dexPrice) = abi.decode(executionData, (address, uint256));
        require(asset != address(0), "Invalid asset");
        require(amount > 0, "Invalid amount");

        address uniswapRouter = IRegistry(registry).getAddress("UNISWAP_V2");
        address usdc = IRegistry(registry).getAddress("USDC");
        require(uniswapRouter != address(0) && usdc != address(0), "Invalid router or USDC");

        require(IERC20(asset).balanceOf(address(this)) >= amount, "Insufficient asset balance");

        // Approve Uniswap router
        IERC20(asset).approve(uniswapRouter, amount);

        // Swap asset for USDC
        address[] memory path = new address[](2);
        path[0] = asset;
        path[1] = usdc;
        uint256 minOut = (dexPrice * (10000 - slippageTolerance)) / 10000;
        uint256[] memory amounts;
        try IUniswapV2Router02(uniswapRouter).swapExactTokensForTokens(
            amount,
            minOut,
            path,
            address(this),
            block.timestamp + 300
        ) returns (uint256[] memory out) {
            amounts = out;
        } catch {
            IERC20(asset).approve(uniswapRouter, 0);
            revert("Swap failed");
        }

        // Reset allowance
        IERC20(asset).approve(uniswapRouter, 0);

        uint256 finalAmount = amounts[1];
        require(finalAmount > premium, "Insufficient profit");
        profit = finalAmount - premium;

        emit OracleLagArbitrageExecuted(asset, profit, block.timestamp);

        success = true;
        result = abi.encode(asset, profit);
        return (success, result, profit);
    }
}