// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IStrategy.sol";
import "../interfaces/IRegistry.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";

interface IRebaseToken {
    function totalSupply() external view returns (uint256);
    function targetPrice() external view returns (uint256);
    function rebase() external returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function symbol() external view returns (string memory);
}

contract StrategyRebaseTokenArbitrage is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    IRegistry public registry;
    ISwapRouter public uniswapRouter;
    IQuoter public quoter;
    
    uint256 public slippageTolerance; // 0.5% (50 basis points)
    uint256 public minProfitMargin; // 1% (100 basis points)
    uint24 public poolFee; // 0.3% (3000)
    uint256 public deadlineExtension; // 300 seconds
    uint256 public pricePrecision; // 1e18

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

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _registry,
        address _uniswapRouter,
        address _quoter
    ) external initializer {
        require(_registry != address(0), "Invalid registry");
        require(_uniswapRouter != address(0), "Invalid router");
        require(_quoter != address(0), "Invalid quoter");        
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        registry = IRegistry(_registry);
        uniswapRouter = ISwapRouter(_uniswapRouter);
        quoter = IQuoter(_quoter);
        slippageTolerance = 50;
        minProfitMargin = 100;
        poolFee = 3000;
        deadlineExtension = 300;
        pricePrecision = 1e18;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function name() external pure override returns (string memory) {
        return "RebaseTokenArbitrage";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        address rebaseTokenAddr = registry.getAddress("REBASE_TOKEN");
        address weth = registry.getAddress("WETH");
        
        if (rebaseTokenAddr == address(0) || weth == address(0) || asset != rebaseTokenAddr || amount == 0) {
            return (0, "");
        }

        IRebaseToken rebaseToken = IRebaseToken(rebaseTokenAddr);
        uint256 targetPrice;
        try rebaseToken.targetPrice() returns (uint256 price) {
            targetPrice = price;
        } catch {
            return (0, "");
        }
        
        (bool success, uint256 currentMarketPrice) = _getMarketPrice(rebaseTokenAddr, weth, amount);
        if (!success || currentMarketPrice == 0) return (0, "");

        // Normalize targetPrice (assuming 18 decimals for targetPrice)
        targetPrice = targetPrice / 1e18; // Convert to WETH units
        if (currentMarketPrice > targetPrice + (targetPrice / 1000)) {
            profit = (currentMarketPrice - targetPrice) * amount / pricePrecision;
            executionData = abi.encode(ExecutionParams(rebaseTokenAddr, weth, true));
        } else if (currentMarketPrice < targetPrice - (targetPrice / 1000)) {
            profit = (targetPrice - currentMarketPrice) * amount / pricePrecision;
            executionData = abi.encode(ExecutionParams(rebaseTokenAddr, weth, false));
        } else {
            return (0, "");
        }

        if (profit < (amount * minProfitMargin / 10000)) {
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
        require(amount > 0, "Invalid amount");

        IERC20 tokenIn = IERC20(params.isSelling ? params.rebaseToken : params.pairedAsset);
        require(tokenIn.balanceOf(address(this)) >= amount, "Insufficient balance");

        ISwapRouter.ExactInputSingleParams memory swapParams = ISwapRouter.ExactInputSingleParams({
            tokenIn: params.isSelling ? params.rebaseToken : params.pairedAsset,
            tokenOut: params.isSelling ? params.pairedAsset : params.rebaseToken,
            fee: poolFee,
            recipient: address(this),
            deadline: block.timestamp + deadlineExtension,
            amountIn: amount,
            amountOutMinimum: _calculateMinAmountOut(amount),
            sqrtPriceLimitX96: 0
        });

        tokenIn.approve(address(uniswapRouter), amount);
        uint256 amountOut;
        try uniswapRouter.exactInputSingle(swapParams) returns (uint256 out) {
            amountOut = out;
        } catch {
            tokenIn.approve(address(uniswapRouter), 0);
            revert("Swap failed");
        }
        tokenIn.approve(address(uniswapRouter), 0);

        finalProfit = _calculateProfit(amount, amountOut, premium);
        require(finalProfit >= (amount * minProfitMargin / 10000), "Insufficient profit");

        emit RebaseArbitrageExecuted(
            params.rebaseToken,
            finalProfit,
            amount,
            amountOut,
            block.timestamp
        );

        success = true;
        result = abi.encode(finalProfit);
        return (success, result, finalProfit);
    }

    function _getMarketPrice(address tokenIn, address tokenOut, uint256 amount)
        internal
        view
        returns (bool success, uint256 price)
    {
        // Use static call to ensure view compatibility
        (bool callSuccess, bytes memory data) = address(quoter).staticcall(
            abi.encodeWithSelector(
                IQuoter.quoteExactInputSingle.selector,
                tokenIn,
                tokenOut,
                poolFee,
                amount,
                0
            )
        );
        
        if (!callSuccess) {
            return (false, 0);
        }

        try this.decodeQuoteResult(data) returns (uint256 amountOut) {
            return (true, (amountOut * pricePrecision) / amount);
        } catch {
            return (false, 0);
        }
    }

    // External function to decode static call result
    function decodeQuoteResult(bytes memory data) external pure returns (uint256 amountOut) {
        (amountOut) = abi.decode(data, (uint256));
    }

    function _calculateMinAmountOut(uint256 amountIn) internal view returns (uint256) {
        return (amountIn * (10000 - slippageTolerance)) / 10000;
    }

    function _calculateProfit(uint256 amountIn, uint256 amountOut, uint256 premium) 
        internal
        pure
        returns (uint256) 
    {
        return amountOut > amountIn + premium ? amountOut - amountIn - premium : 0;
    }
}