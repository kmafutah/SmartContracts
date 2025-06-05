// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IStrategy.sol";
import "../interfaces/IRegistry.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

// Uniswap V3 Quoter interface for SKALE (Ruby Exchange)
interface IQuoterV2 {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external view returns (uint256 amountOut, uint160 sqrtPriceNextX96, uint32 initializedTicksCrossed, uint256 gasEstimate);
}

// Generic flash mint protocol interface
interface IFlashMintProtocol {
    function flashMint(uint256 amount, bytes calldata data) external;
}

contract StrategyFlashMintArbitrage is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public registry;
    ISwapRouter public uniswapRouter; // Ruby Exchange (Uniswap V3-compatible)
    address public quoter; // Uniswap V3 Quoter for price estimation
    uint256 public slippageTolerance; // 0.5% (50 basis points)
    uint256 public minProfitMargin; // 1% minimum profit
    uint24 public poolFee; // Uniswap V3 0.3% fee tier
    uint256 public deadlineExtension; // 5 minutes
    bool public paused;

    // Supported flash mint tokens and protocols
    mapping(address => address) public flashMintProtocols; // token => protocol
    mapping(address => address) public priceFeeds; // token => Chainlink feed
    address[] public supportedTokens;

    event ArbitrageExecuted(
        address indexed token,
        address indexed outputToken,
        uint256 amountIn,
        uint256 profit,
        uint256 timestamp
    );
    event TokenAdded(address indexed token, address protocol, address priceFeed);
    event Paused(bool paused);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); // Prevent initialization during deployment
    }

    function initialize(
        address _registry,
        address _uniswapRouter,
        address _quoter,
        address _initialOwner
    ) external initializer {
        require(_registry != address(0) && _uniswapRouter != address(0) && _quoter != address(0) && _initialOwner != address(0), "Invalid addresses");
        __Ownable_init(_initialOwner);
        __UUPSUpgradeable_init();
        registry = _registry;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        quoter = _quoter;
        slippageTolerance = 50; // 0.5%
        minProfitMargin = 100; // 1%
        poolFee = 3000; // 0.3% fee tier
        deadlineExtension = 300; // 5 minutes
        paused = false;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    modifier whenNotPaused() {
        require(!paused, "Strategy paused");
        _;
    }

    function name() external pure override returns (string memory) {
        return "FlashMintArbitrage";
    }

    // Add supported flash mint token with its protocol and Chainlink price feed
    function addSupportedToken(address token, address protocol, address priceFeed) external onlyOwner {
        require(token != address(0) && protocol != address(0) && priceFeed != address(0), "Invalid addresses");
        require(flashMintProtocols[token] == address(0), "Token already supported");
        flashMintProtocols[token] = protocol;
        priceFeeds[token] = priceFeed;
        supportedTokens.push(token);
        emit TokenAdded(token, protocol, priceFeed);
    }

    // Pause or unpause the strategy
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        whenNotPaused
        returns (uint256 profit, bytes memory executionData)
    {
        // Validate flash mint token
        address protocol = flashMintProtocols[asset];
        if (protocol == address(0)) return (0, "");

        address skaleRouter = IRegistry(registry).getAddress("UNISWAP_V3");
        address weth = IRegistry(registry).getAddress("WETH");

        // Get price for token -> WETH
        (uint256 wethOut, bool valid) = _getUniswapV3Price(skaleRouter, asset, weth, amount);
        if (!valid) return (0, "");

        // Get price for WETH -> token
        (uint256 tokenOut, bool reverseValid) = _getUniswapV3Price(skaleRouter, weth, asset, wethOut);
        if (!reverseValid) return (0, "");

        // Calculate profit
        if (tokenOut > amount) {
            uint256 grossProfit = tokenOut - amount;
            uint256 gasCost = _estimateGasCost();
            profit = grossProfit > gasCost ? grossProfit - gasCost : 0;
            uint256 profitMargin = (profit * 10000) / amount;
            if (profitMargin >= minProfitMargin) {
                executionData = abi.encode(asset, protocol, weth);
            }
        }
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        whenNotPaused
        returns (bool success, bytes memory result, uint256)
    {
        (address token, address protocol, address weth) = abi.decode(executionData, (address, address, address));
        require(flashMintProtocols[token] == protocol, "Invalid protocol");
        require(priceFeeds[token] != address(0), "Unsupported token");

        // Encode flash mint data
        bytes memory flashData = abi.encode(token, weth, amount, premium);
        IFlashMintProtocol(protocol).flashMint(amount, flashData);

        // Verify final balance
        uint256 finalBalance = IERC20(token).balanceOf(address(this));
        require(finalBalance >= amount + premium, "Insufficient profit");
        uint256 profit = finalBalance - amount - premium;

        emit ArbitrageExecuted(token, weth, amount, profit, block.timestamp);
        success = true;
        result = abi.encode(token, weth, profit);
        return (success, result, profit);
    }

    // Callback for flash mint
    function onFlashMintCallback(bytes calldata data) external nonReentrant {
        (address token, address weth, uint256 amount, uint256 premium) = abi.decode(data, (address, address, uint256, uint256));
        address protocol = flashMintProtocols[token];
        require(msg.sender == protocol, "Unauthorized caller");

        // Verify flash minted balance
        IERC20 tokenContract = IERC20(token);
        require(tokenContract.balanceOf(address(this)) >= amount, "Insufficient flash minted balance");

        // Swap token -> WETH
        uint256 wethOut = _swapOnSkale(token, weth, amount);

        // Swap WETH -> token
        uint256 tokenOut = _swapOnSkale(weth, token, wethOut);

        // Repay flash mint (assuming no fee for simplicity)
        require(tokenOut >= amount + premium, "Insufficient tokens to repay");
        tokenContract.safeTransfer(protocol, amount);

        // Profit is retained in the contract
    }

    // Swap on SKALE (Ruby Exchange, Uniswap V3-compatible)
    function _swapOnSkale(address tokenIn, address tokenOut, uint256 amountIn)
        internal
        returns (uint256 amountOut)
    {
        IERC20(tokenIn).approve(address(uniswapRouter), amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: poolFee,
            recipient: address(this),
            deadline: block.timestamp + deadlineExtension,
            amountIn: amountIn,
            amountOutMinimum: (amountIn * (10000 - slippageTolerance)) / 10000,
            sqrtPriceLimitX96: 0
        });

        amountOut = uniswapRouter.exactInputSingle(params);
        IERC20(tokenIn).approve(address(uniswapRouter), 0);
        require(amountOut > 0, "Swap failed");
    }

    // Get Uniswap V3 price using Quoter
    function _getUniswapV3Price(address router, address tokenIn, address tokenOut, uint256 amountIn)
        internal
        view
        returns (uint256 amountOut, bool valid)
    {
        try IQuoterV2(quoter).quoteExactInputSingle(tokenIn, tokenOut, poolFee, amountIn, 0) returns (
            uint256 out, uint160, uint32, uint256
        ) {
            amountOut = out;
            valid = true;
        } catch {
            amountOut = 0;
            valid = false;
        }
    }

    // Estimate gas cost (SKALE is gasless, but include for overhead)
    function _estimateGasCost() internal view returns (uint256) {
        address ethUsdFeed = IRegistry(registry).getAddress("ETH_USD_FEED");
        (, int256 ethPrice,,,) = AggregatorV3Interface(ethUsdFeed).latestRoundData();
        require(ethPrice > 0, "Invalid ETH price");
        uint256 gasPrice = 0; // SKALE is gasless
        uint256 gasCostEth = (150_000 * gasPrice) / 1e18; // 150k gas for overhead
        return (gasCostEth * uint256(ethPrice)) / 1e8; // Convert to USD
    }

    // Emergency withdraw function
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}