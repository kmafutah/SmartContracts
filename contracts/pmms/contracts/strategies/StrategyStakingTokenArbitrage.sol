// SPDX-License-License: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IRegistry.sol";
import "../interfaces/IStrategy.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";

contract StrategyStakingTokenArbitrage is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    IRegistry public registry;
    address public steth;
    address public weth;
    uint256 public slippageTolerance; // Basis points (50 = 0.5%)
    uint24 public poolFee; // e.g., 3000 = 0.3%
    uint160 public constant SQRT_PRICE_LIMIT_X96 = 0;

    event StakingTokenArbitrage(
        address indexed staking,
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
        require(_registry != address(0), "Invalid registry address");
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        registry = IRegistry(_registry);
        steth = registry.getAddress("STETH");
        weth = registry.getAddress("WETH");
        require(steth != address(0), "STETH address not set");
        require(weth != address(0), "WETH address not set");
        slippageTolerance = 50; // 0.5%
        poolFee = 3000; // 0.3%
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function name() external pure override returns (string memory) {
        return "StakingTokenArbitrage";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        if (asset != steth || amount == 0) {
            return (0, "");
        }

        address uniswapRouter = registry.getAddress("UNISWAP_V3");
        address quoter = registry.getAddress("UNISWAP_V3_QUOTER");
        if (uniswapRouter == address(0) || weth == address(0) || quoter == address(0)) {
            return (0, "");
        }

        // Get stETH -> WETH quote
        uint256 stethToWeth;
        (bool quoteSuccess, bytes memory quoteData) = address(quoter).staticcall(
            abi.encodeWithSelector(
                IQuoter.quoteExactInputSingle.selector,
                steth,
                weth,
                poolFee,
                amount,
                SQRT_PRICE_LIMIT_X96
            )
        );
        if (quoteSuccess) {
            try this.decodeQuote(quoteData) returns (uint256 amountOut) {
                stethToWeth = amountOut;
            } catch {
                stethToWeth = 0;
            }
        }

        // Get WETH -> stETH quote
        uint256 wethToSteth;
        if (stethToWeth > 0) {
            (bool wethQuoteSuccess, bytes memory wethQuoteData) = address(quoter).staticcall(
                abi.encodeWithSelector(
                    IQuoter.quoteExactInputSingle.selector,
                    weth,
                    steth,
                    poolFee,
                    stethToWeth,
                    SQRT_PRICE_LIMIT_X96
                )
            );
            if (wethQuoteSuccess) {
                try this.decodeQuote(wethQuoteData) returns (uint256 amountOut) {
                    wethToSteth = amountOut;
                } catch {
                    wethToSteth = 0;
                }
            }
        }

        if (wethToSteth > amount) {
            profit = wethToSteth - amount;
            executionData = abi.encode(weth, stethToWeth, wethToSteth);
        } else {
            return (0, "");
        }
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool success, bytes memory result, uint256 finalProfit)
    {
        (address wethToken, uint256 expectedWethOut, uint256 expectedStethOut) = abi.decode(
            executionData,
            (address, uint256, uint256)
        );
        require(wethToken == weth, "Invalid WETH address");
        address uniswapRouter = registry.getAddress("UNISWAP_V3");
        require(uniswapRouter != address(0), "Invalid Uniswap router");
        IERC20 stethContract = IERC20(steth);
        require(stethContract.balanceOf(address(this)) >= amount, "Insufficient stETH balance");

        // Swap stETH -> WETH
        uint256 minWethOut = (expectedWethOut * (10000 - slippageTolerance)) / 10000;
        stethContract.approve(uniswapRouter, amount);
        uint256 wethOut;
        try ISwapRouter(uniswapRouter).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: steth,
                tokenOut: weth,
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: amount,
                amountOutMinimum: minWethOut,
                sqrtPriceLimitX96: SQRT_PRICE_LIMIT_X96
            })
        ) returns (uint256 amountOut) {
            wethOut = amountOut;
        } catch {
            stethContract.approve(uniswapRouter, 0);
            revert("stETH to WETH swap failed");
        }
        stethContract.approve(uniswapRouter, 0);

        // Swap WETH -> stETH
        IERC20 wethContract = IERC20(weth);
        require(wethContract.balanceOf(address(this)) >= wethOut, "Insufficient WETH balance");
        uint256 minStethOut = (expectedStethOut * (10000 - slippageTolerance)) / 10000;
        wethContract.approve(uniswapRouter, wethOut);
        uint256 finalStethAmount;
        try ISwapRouter(uniswapRouter).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: weth,
                tokenOut: steth,
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: wethOut,
                amountOutMinimum: minStethOut,
                sqrtPriceLimitX96: SQRT_PRICE_LIMIT_X96
            })
        ) returns (uint256 amountOut) {
            finalStethAmount = amountOut;
        } catch {
            wethContract.approve(uniswapRouter, 0);
            revert("WETH to stETH swap failed");
        }
        wethContract.approve(uniswapRouter, 0);

        // Calculate profit
        finalProfit = finalStethAmount > amount + premium ? finalStethAmount - amount - premium : 0;
        require(finalProfit > 0, "Insufficient profit");

        emit StakingTokenArbitrage(steth, amount, finalStethAmount, finalProfit, block.timestamp);

        return (true, abi.encode(finalStethAmount, finalProfit), finalProfit);
    }

    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    // Helper function for static call decoding
    function decodeQuote(bytes memory data) external pure returns (uint256 amountOut) {
        (amountOut) = abi.decode(data, (uint256));
    }
}