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
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract StrategyGovernanceArbitrage is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    address public registry;
    uint256 public minProfitMargin; // 10% (1000 basis points)

    event ArbitrageExecuted(address indexed asset, address indexed governanceToken, uint256 profit, uint256 timestamp);

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
        minProfitMargin = 1000; // 10%
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function name() external pure override returns (string memory) {
        return "GovernanceArbitrage";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        address governanceToken = IRegistry(registry).getAddress("GOV_TOKEN");
        address uniswapRouter = IRegistry(registry).getAddress("UNISWAP_V2");
        address usdc = IRegistry(registry).getAddress("USDC");
        if (asset != usdc) return (0, "");

        address[] memory path = new address[](2);
        path[0] = asset;
        path[1] = governanceToken;
        uint256[] memory amounts;
        try IUniswapV2Router02(uniswapRouter).getAmountsOut(amount, path) returns (uint256[] memory out) {
            amounts = out;
        } catch {
            return (0, "");
        }
        uint256 tokenAmount = amounts[1];

        address[] memory reversePath = new address[](2);
        reversePath[0] = governanceToken;
        reversePath[1] = asset;
        try IUniswapV2Router02(uniswapRouter).getAmountsOut(tokenAmount, reversePath) returns (uint256[] memory out) {
            amounts = out;
        } catch {
            return (0, "");
        }
        uint256 sellAmount = amounts[1];

        if (sellAmount > (amount * (10000 + minProfitMargin)) / 10000) {
            profit = sellAmount - amount;
            executionData = abi.encode(governanceToken);
        }
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool success, bytes memory result, uint256 profit)
    {
        address governanceToken = abi.decode(executionData, (address));
        address uniswapRouter = IRegistry(registry).getAddress("UNISWAP_V2");
        address usdc = IRegistry(registry).getAddress("USDC");

        require(IERC20(usdc).balanceOf(address(this)) >= amount, "Insufficient USDC balance");

        // Buy governance token
        address[] memory path = new address[](2);
        path[0] = usdc;
        path[1] = governanceToken;
        IERC20(usdc).approve(uniswapRouter, amount);
        uint256[] memory amounts = IUniswapV2Router02(uniswapRouter).swapExactTokensForTokens(
            amount,
            (amount * (10000 - minProfitMargin)) / 10000, // Slippage protection
            path,
            address(this),
            block.timestamp + 300
        );
        IERC20(usdc).approve(uniswapRouter, 0); // Reset allowance
        uint256 tokenAmount = amounts[1];

        // Sell governance tokens
        path[0] = governanceToken;
        path[1] = usdc;
        require(IERC20(governanceToken).balanceOf(address(this)) >= tokenAmount, "Insufficient gov token balance");
        IERC20(governanceToken).approve(uniswapRouter, tokenAmount);
        amounts = IUniswapV2Router02(uniswapRouter).swapExactTokensForTokens(
            tokenAmount,
            (amount * (10000 + minProfitMargin)) / 10000, // Ensure profit
            path,
            address(this),
            block.timestamp + 300
        );
        IERC20(governanceToken).approve(uniswapRouter, 0); // Reset allowance

        uint256 finalAmount = amounts[1];
        require(finalAmount > amount + premium, "Insufficient profit");
        profit = finalAmount - amount - premium;

        emit ArbitrageExecuted(usdc, governanceToken, profit, block.timestamp);
        success = true;
        result = abi.encode(governanceToken, profit);
        return (success, result, profit);
    }
}