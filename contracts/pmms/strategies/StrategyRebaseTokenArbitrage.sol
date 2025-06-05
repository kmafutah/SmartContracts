// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IStrategy.sol";
import "../interfaces/IRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";

interface IRebaseToken {
    function totalSupply() external view returns (uint256);
    function targetPrice() external view returns (uint256);
    function rebase() external returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function symbol() external view returns (string memory);
}

contract StrategyRebaseTokenArbitrage is IStrategy, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IRegistry public immutable registry;
    ISwapRouter public immutable uniswapRouter;
    IQuoter public immutable quoter;
    
    uint256 public constant SLIPPAGE_TOLERANCE = 50;
    uint256 public constant MIN_PROFIT_MARGIN = 100;
    uint24 public constant POOL_FEE = 3000;
    uint256 public constant DEADLINE_EXTENSION = 300;
    uint256 public constant PRICE_PRECISION = 1e18;

    event RebaseArbitrageExecuted(
        address indexed token, 
        uint256 profit, 
        uint256 amountIn, 
        uint256 amountOut, 
        uint256 timestamp
    );

    struct ExecutionParams {
        address rebaseToken;
        address pairedAsset;
        bool isSelling;
    }

    constructor(
        address _registry, 
        address _uniswapRouter, 
        address _quoter, 
        address _initialOwner
    ) Ownable(_initialOwner) {
        require(_registry != address(0), "Invalid registry");
        require(_uniswapRouter != address(0), "Invalid router");
        require(_quoter != address(0), "Invalid quoter");
        
        registry = IRegistry(_registry);
        uniswapRouter = ISwapRouter(_uniswapRouter);
        quoter = IQuoter(_quoter);
    }

    function name() external pure override returns (string memory) {
        return "Rebase Token Arbitrage";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        override
        returns (uint256 profit, bytes memory executionData)
    {
        address rebaseTokenAddr = registry.getAddress("REBASE_TOKEN");
        address weth = registry.getAddress("WETH");
        
        if (rebaseTokenAddr == address(0)) return (0, "");
        if (weth == address(0)) return (0, "");
        if (asset != rebaseTokenAddr) return (0, "");

        IRebaseToken rebaseToken = IRebaseToken(rebaseTokenAddr);
        uint256 targetPrice = rebaseToken.targetPrice();
        
        (bool success, uint256 currentMarketPrice) = _getMarketPrice(rebaseTokenAddr, weth, amount);
        if (!success) return (0, "");

        if (currentMarketPrice > targetPrice + (targetPrice / 1000)) {
            profit = (currentMarketPrice - targetPrice) * amount / PRICE_PRECISION;
            executionData = abi.encode(ExecutionParams(rebaseTokenAddr, weth, true));
        } else if (currentMarketPrice < targetPrice - (targetPrice / 1000)) {
            profit = (targetPrice - currentMarketPrice) * amount / PRICE_PRECISION;
            executionData = abi.encode(ExecutionParams(rebaseTokenAddr, weth, false));
        }

        if (profit < (amount * MIN_PROFIT_MARGIN / 10000)) {
            return (0, "");
        }
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool success, bytes memory result, uint256 finalProfit)
    {
        ExecutionParams memory params = abi.decode(executionData, (ExecutionParams));
        require(params.rebaseToken != address(0), "Invalid token");
        require(params.pairedAsset != address(0), "Invalid paired asset");

        ISwapRouter.ExactInputSingleParams memory swapParams = ISwapRouter.ExactInputSingleParams({
            tokenIn: params.isSelling ? params.rebaseToken : params.pairedAsset,
            tokenOut: params.isSelling ? params.pairedAsset : params.rebaseToken,
            fee: POOL_FEE,
            recipient: address(this),
            deadline: block.timestamp + DEADLINE_EXTENSION,
            amountIn: amount,
            amountOutMinimum: _calculateMinAmountOut(amount),
            sqrtPriceLimitX96: 0
        });

        IERC20(swapParams.tokenIn).approve(address(uniswapRouter), amount);
        uint256 amountOut = uniswapRouter.exactInputSingle(swapParams);
        IERC20(swapParams.tokenIn).approve(address(uniswapRouter), 0);

        finalProfit = _calculateProfit(amount, amountOut, premium);
        require(finalProfit >= (amount * MIN_PROFIT_MARGIN / 10000), "Insufficient profit");

        emit RebaseArbitrageExecuted(
            params.rebaseToken,
            finalProfit,
            amount,
            amountOut,
            block.timestamp
        );

        return (true, abi.encode(finalProfit), finalProfit);
    }

    function _getMarketPrice(address tokenIn, address tokenOut, uint256 amount)
        internal
        returns (bool success, uint256 price)
    {
        try quoter.quoteExactInputSingle(tokenIn, tokenOut, POOL_FEE, amount, 0) 
        returns (uint256 amountOut) {
            return (true, (amountOut * PRICE_PRECISION) / amount);
        } catch {
            return (false, 0);
        }
    }

    function _calculateMinAmountOut(uint256 amountIn) internal pure returns (uint256) {
        return (amountIn * (10000 - SLIPPAGE_TOLERANCE)) / 10000;
    }

    function _calculateProfit(uint256 amountIn, uint256 amountOut, uint256 premium) 
        internal pure returns (uint256) 
    {
        return amountOut > amountIn + premium ? amountOut - amountIn - premium : 0;
    }

    function withdrawToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    receive() external payable {}
}