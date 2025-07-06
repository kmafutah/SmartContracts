// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IStrategy.sol";
import "../interfaces/IRegistry.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";

contract StrategyZiGTArbitrage is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    IRegistry public registry;
    uint256 public slippageTolerance; // 50 = 0.5%
    uint24 public poolFee; // 3000 = 0.3%
    uint160 public sqrtPriceLimitX96;
    
    // Supported ZiGT token symbols
    string[] private zigtSymbols = [
        "ZiG-R", "ZiG-N", "ZiG-RG", "ZiG-KB", 
        "ZiG-UB", "ZiG-SF", "ZiG-PC", "ZiG-MG",
        "ZiG-SH", "ZiG-CD", "ZiG-KU", "ZiG-KD",
        "ZiGT", "ZiG"
    ];
    
    // Supported stablecoins and WETH
    string[] private pairedTokens = ["USDC", "USDT", "DAI", "WETH"];
    
    event ZiGTArbitrageExecuted(
        address indexed zigtToken,
        address indexed pairedToken,
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
        slippageTolerance = 50; // 0.5%
        poolFee = 3000; // 0.3%
        sqrtPriceLimitX96 = 0;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function name() external pure override returns (string memory) {
        return "ZiGTArbitrage";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        // Check if the asset is a ZiGT token
        if (!_isZiGToken(asset)) return (0, "");
        
        address uniswapRouter = registry.getAddress("UNISWAP_V3");
        address quoter = registry.getAddress("UNISWAP_V3_QUOTER");
        
        if (uniswapRouter == address(0) || quoter == address(0)) {
            return (0, "");
        }

        // Find best arbitrage opportunity across all paired tokens
        for (uint i = 0; i < pairedTokens.length; i++) {
            address pairedToken = registry.getAddress(pairedTokens[i]);
            if (pairedToken == address(0)) continue;
            
            // Get direct swap quote (ZiGT -> Paired Token)
            uint256 directOut = _getUniswapV3Quote(
                quoter,
                asset,
                pairedToken,
                amount
            );
            
            // Get reverse swap quote (Paired Token -> ZiGT)
            uint256 reverseOut = _getUniswapV3Quote(
                quoter,
                pairedToken,
                asset,
                directOut
            );
            
            // Calculate potential profit
            if (reverseOut > amount) {
                uint256 potentialProfit = reverseOut - amount;
                if (potentialProfit > profit) {
                    profit = potentialProfit;
                    executionData = abi.encode(pairedToken, directOut, reverseOut);
                }
            }
        }
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool success, bytes memory result, uint256 profit)
    {
        (address pairedToken, uint256 expectedPairedOut, uint256 expectedZigtOut) = abi.decode(
            executionData,
            (address, uint256, uint256)
        );
        
        address zigtToken = msg.sender;
        address uniswapRouter = registry.getAddress("UNISWAP_V3");
        require(uniswapRouter != address(0), "Uniswap router not set");
        
        // Swap ZiGT -> Paired Token
        uint256 pairedOut = _executeSwap(
            zigtToken,
            pairedToken,
            amount,
            (expectedPairedOut * (10000 - slippageTolerance)) / 10000,
            uniswapRouter
        );
        
        // Swap Paired Token -> ZiGT
        uint256 finalZigtAmount = _executeSwap(
            pairedToken,
            zigtToken,
            pairedOut,
            (expectedZigtOut * (10000 - slippageTolerance)) / 10000,
            uniswapRouter
        );
        
        // Calculate profit after premium
        profit = finalZigtAmount > amount + premium ? finalZigtAmount - amount - premium : 0;
        require(profit > 0, "Insufficient profit");

        emit ZiGTArbitrageExecuted(
            zigtToken,
            pairedToken,
            amount,
            finalZigtAmount,
            profit,
            block.timestamp
        );

        return (true, abi.encode(finalZigtAmount, profit), profit);
    }

    // ========== Helper Functions ==========
    
    function _isZiGToken(address token) internal view returns (bool) {
        for (uint i = 0; i < zigtSymbols.length; i++) {
            address zigtAddr = registry.getAddress(zigtSymbols[i]);
            if (token == zigtAddr) {
                return true;
            }
        }
        return false;
    }
    
    function _getUniswapV3Quote(
        address quoter,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal view returns (uint256) {
        (bool success, bytes memory data) = quoter.staticcall(
            abi.encodeWithSelector(
                IQuoter.quoteExactInputSingle.selector,
                tokenIn,
                tokenOut,
                poolFee,
                amountIn,
                sqrtPriceLimitX96
            )
        );
        
        if (!success) return 0;
        
        try this.decodeQuoteResult(data) returns (uint256 amountOut) {
            return amountOut;
        } catch {
            return 0;
        }
    }
    
    function _executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address router
    ) internal returns (uint256) {
        IERC20(tokenIn).approve(router, amountIn);
        
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: poolFee,
            recipient: address(this),
            deadline: block.timestamp + 300,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: sqrtPriceLimitX96
        });
        
        uint256 amountOut = ISwapRouter(router).exactInputSingle(params);
        IERC20(tokenIn).approve(router, 0);
        
        return amountOut;
    }
    
    // Helper function for static call decoding
    function decodeQuoteResult(bytes memory data) external pure returns (uint256 amountOut) {
        (amountOut) = abi.decode(data, (uint256));
    }
    
    // Emergency withdraw function (owner only)
    function withdrawToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}