// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IRegistry.sol";
import "../interfaces/IStrategy.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StrategyLPBurnArbitrage is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    address public registry;
    uint256 public slippageTolerance; // 0.5% (50 basis points)

    event ArbitrageExecuted(address indexed pair, address indexed asset, uint256 profit, uint256 timestamp);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); // Prevent initialization during deployment
    }

    function initialize(address _registry) external initializer {
        require(_registry != address(0), "Invalid registry");        
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        registry = _registry;
        slippageTolerance = 50; // 0.5%
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function name() external pure override returns (string memory) {
        return "LPBurnArbitrage";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        address pair = IRegistry(registry).getAddress("UNISWAP_V2_PAIR"); // e.g., USDC/WETH
        address uniswapRouter = IRegistry(registry).getAddress("UNISWAP_V2");
        address usdc = IRegistry(registry).getAddress("USDC");
        if (asset != usdc || pair == address(0)) return (0, "");

        uint256 reserve0;
        uint256 reserve1;
        try IUniswapV2Pair(pair).getReserves() returns (uint112 r0, uint112 r1, uint32) {
            reserve0 = r0;
            reserve1 = r1;
        } catch {
            return (0, "");
        }
        address token0 = IUniswapV2Pair(pair).token0();
        address token1 = IUniswapV2Pair(pair).token1();
        uint256 totalSupply = IUniswapV2Pair(pair).totalSupply();
        if (totalSupply == 0) return (0, "");

        // Calculate amounts received from burning LP tokens
        uint256 amount0Out = (amount * reserve0) / totalSupply;
        uint256 amount1Out = (amount * reserve1) / totalSupply;
        if (amount0Out == 0 && amount1Out == 0) return (0, "");

        // Convert both tokens to `asset` (e.g., USDC)
        uint256 token0Value = 0;
        if (token0 != asset && amount0Out > 0) {
            address[] memory path = new address[](2);
            path[0] = token0;
            path[1] = asset;
            try IUniswapV2Router02(uniswapRouter).getAmountsOut(amount0Out, path) returns (uint256[] memory amounts) {
                token0Value = amounts[1];
            } catch {
                token0Value = 0;
            }
        } else if (token0 == asset) {
            token0Value = amount0Out;
        }

        uint256 token1Value = 0;
        if (token1 != asset && amount1Out > 0) {
            address[] memory path = new address[](2);
            path[0] = token1;
            path[1] = asset;
            try IUniswapV2Router02(uniswapRouter).getAmountsOut(amount1Out, path) returns (uint256[] memory amounts) {
                token1Value = amounts[1];
            } catch {
                token1Value = 0;
            }
        } else if (token1 == asset) {
            token1Value = amount1Out;
        }

        uint256 totalValue = token0Value + token1Value;
        if (totalValue > amount) {
            profit = totalValue - amount;
            executionData = abi.encode(pair, token0, token1);
        }
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool success, bytes memory result, uint256 profit)
    {
        (address pair, address token0, address token1) = abi.decode(executionData, (address, address, address));
        require(pair != address(0) && token0 != address(0) && token1 != address(0), "Invalid pair or tokens");
        address uniswapRouter = IRegistry(registry).getAddress("UNISWAP_V2");
        address asset = IRegistry(registry).getAddress("USDC");

        // Ensure sufficient LP token balance
        require(IERC20(pair).balanceOf(address(this)) >= amount, "Insufficient LP balance");

        // Burn LP tokens to receive token0 and token1
        IERC20(pair).approve(pair, amount);
        try IUniswapV2Pair(pair).burn(address(this)) {
            // Burn successful
        } catch {
            revert("LP burn failed");
        }
        IERC20(pair).approve(pair, 0); // Reset allowance

        // Get balances of token0 and token1
        uint256 token0Balance = IERC20(token0).balanceOf(address(this));
        uint256 token1Balance = IERC20(token1).balanceOf(address(this));
        require(token0Balance > 0 || token1Balance > 0, "No tokens received from burn");

        // Swap token0 to asset (if not already asset)
        uint256 assetReceived = 0;
        if (token0 != asset && token0Balance > 0) {
            IERC20(token0).approve(uniswapRouter, token0Balance);
            address[] memory path = new address[](2);
            path[0] = token0;
            path[1] = asset;
            uint256 minOut = (token0Balance * (10000 - slippageTolerance)) / 10000;
            try IUniswapV2Router02(uniswapRouter).swapExactTokensForTokens(
                token0Balance,
                minOut,
                path,
                address(this),
                block.timestamp + 300
            ) returns (uint256[] memory amounts) {
                assetReceived += amounts[1];
            } catch {
                revert("Token0 swap failed");
            }
            IERC20(token0).approve(uniswapRouter, 0); // Reset allowance
        } else if (token0 == asset) {
            assetReceived += token0Balance;
        }

        // Swap token1 to asset (if not already asset)
        if (token1 != asset && token1Balance > 0) {
            IERC20(token1).approve(uniswapRouter, token1Balance);
            address[] memory path = new address[](2);
            path[0] = token1;
            path[1] = asset;
            uint256 minOut = (token1Balance * (10000 - slippageTolerance)) / 10000;
            try IUniswapV2Router02(uniswapRouter).swapExactTokensForTokens(
                token1Balance,
                minOut,
                path,
                address(this),
                block.timestamp + 300
            ) returns (uint256[] memory amounts) {
                assetReceived += amounts[1];
            } catch {
                revert("Token1 swap failed");
            }
            IERC20(token1).approve(uniswapRouter, 0); // Reset allowance
        } else if (token1 == asset) {
            assetReceived += token1Balance;
        }

        // Calculate profit
        require(assetReceived > amount + premium, "Insufficient profit");
        profit = assetReceived - amount - premium;

        emit ArbitrageExecuted(pair, asset, profit, block.timestamp);
        success = true;
        result = abi.encode(pair, profit);
        return (success, result, profit);
    }
}