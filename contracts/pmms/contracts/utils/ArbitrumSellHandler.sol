// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract ArbitrumSellHandler is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    ISwapRouter public immutable uniswapRouter; // Uniswap V3 on Arbitrum
    address public immutable skaleStrategy; // SKALE strategy contract
    uint24 public constant POOL_FEE = 3000; // 0.3% fee tier
    uint256 public constant SLIPPAGE_TOLERANCE = 50; // 0.5%
    uint256 public constant DEADLINE_EXTENSION = 300; // 5 minutes

    event SellExecuted(address indexed tokenIn, uint256 amountIn, uint256 amountOut, uint256 timestamp);

    constructor(address _uniswapRouter, address _skaleStrategy, address _initialOwner) Ownable(_initialOwner) {
        uniswapRouter = ISwapRouter(_uniswapRouter);
        skaleStrategy = _skaleStrategy;
    }

    // Called by SKALE IMA Bridge or off-chain relayer after bridging
    function executeSell(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant {
        // In production, secure this with a signature or bridge authentication
        require(msg.sender == skaleStrategy, "Unauthorized");

        IERC20(tokenIn).approve(address(uniswapRouter), amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: POOL_FEE,
            recipient: skaleStrategy, // Send USDC back to SKALE strategy
            deadline: block.timestamp + DEADLINE_EXTENSION,
            amountIn: amountIn,
            amountOutMinimum: minAmountOut,
            sqrtPriceLimitX96: 0
        });

        uint256 amountOut = uniswapRouter.exactInputSingle(params);
        IERC20(tokenIn).approve(address(uniswapRouter), 0);

        emit SellExecuted(tokenIn, amountIn, amountOut, block.timestamp);

        // Bridge USDC back to SKALE
        // In production, use SKALE IMA Bridge to send USDC back
    }
}