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
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoterV2.sol";

// SKALE IMA Bridge interface (simplified)
interface ISkaleIMABridge {
    function deposit(
        address token,
        uint256 amount,
        address receiver,
        bytes32 destinationChainId
    ) external;
    function withdraw(
        address token,
        uint256 amount,
        address receiver
    ) external;
}

contract StrategyBridgingLatencyArbitrage is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    address public registry;
    ISwapRouter public uniswapRouter; // Uniswap V3 on SKALE (Ruby Exchange) or Arbitrum
    IQuoterV2 public uniswapQuoter;   // For price quoting
    ISkaleIMABridge public skaleBridge;
    uint256 public constant SLIPPAGE_TOLERANCE = 50; // 0.5% (50 basis points)
    uint256 public constant DEADLINE_EXTENSION = 300; // 5 minutes
    uint24 public constant POOL_FEE = 3000; // Uniswap V3 0.3% fee tier
    bytes32 public constant ARBITRUM_CHAIN_ID = bytes32(uint256(42161)); // Arbitrum chain ID
    uint256 public constant MIN_PROFIT_MARGIN = 100; // 1% minimum profit
    bool public paused;

    // Supported assets (mapped to their Chainlink price feeds)
    mapping(address => address) public assetPriceFeeds; // asset => Chainlink feed
    address[] public supportedAssets;

    event ArbitrageExecuted(
        address indexed asset,
        uint256 amountIn,
        uint256 profit,
        bool buyOnSkale,
        uint256 timestamp
    );
    event AssetAdded(address indexed asset, address priceFeed);
    event Paused(bool paused);

    modifier whenNotPaused() {
        require(!paused, "Strategy paused");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); // Prevent initialization during deployment
    }

    function initialize(
        address _registry,
        address _uniswapRouter,
        address _uniswapQuoter,
        address _skaleBridge,
        address _initialOwner
    ) external initializer {
        __Ownable_init(_initialOwner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        registry = _registry;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        uniswapQuoter = IQuoterV2(_uniswapQuoter);
        skaleBridge = ISkaleIMABridge(_skaleBridge);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function name() external pure override returns (string memory) {
        return "BridgingLatencyArbitrage";
    }

    function addSupportedAsset(address asset, address priceFeed) external onlyOwner {
        require(asset != address(0) && priceFeed != address(0), "Invalid addresses");
        require(assetPriceFeeds[asset] == address(0), "Asset already supported");
        assetPriceFeeds[asset] = priceFeed;
        supportedAssets.push(asset);
        emit AssetAdded(asset, priceFeed);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        override
        whenNotPaused
        returns (uint256 profit, bytes memory executionData)
    {
        address priceFeed = assetPriceFeeds[asset];
        if (priceFeed == address(0)) return (0, "");

        (uint256 skalePrice,) = _getUniswapV3Price(asset, amount);
        uint256 arbitrumPrice = skalePrice * 102 / 100; // Placeholder: 2% higher

        bool buyOnSkale = skalePrice < arbitrumPrice;
        uint256 buyPrice = buyOnSkale ? skalePrice : arbitrumPrice;
        uint256 sellPrice = buyOnSkale ? arbitrumPrice : skalePrice;

        uint256 bridgeFee = _estimateBridgeFee(asset, amount);
        uint256 arbitrumGasCost = buyOnSkale ? _estimateArbitrumGasCost() : 0;

        if (sellPrice > buyPrice) {
            uint256 grossProfit = sellPrice - buyPrice;
            uint256 netProfit = grossProfit > (bridgeFee + arbitrumGasCost) ? grossProfit - (bridgeFee + arbitrumGasCost) : 0;
            uint256 profitMargin = (netProfit * 10000) / buyPrice;
            if (profitMargin >= MIN_PROFIT_MARGIN) {
                profit = netProfit;
                executionData = abi.encode(buyOnSkale);
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
        (bool buyOnSkale) = abi.decode(executionData, (bool));
        address asset = IRegistry(registry).getAddress("USDC");
        address weth = IRegistry(registry).getAddress("WETH");

        require(assetPriceFeeds[asset] != address(0), "Unsupported asset");
        require(amount > 0, "Invalid amount");
        IERC20 assetToken = IERC20(asset);
        require(assetToken.balanceOf(address(this)) >= amount, "Insufficient balance");

        uint256 wethOut;
        if (buyOnSkale) {
            wethOut = _swapOnSkale(asset, weth, amount);
            _bridgeToArbitrum(weth, wethOut);
        } else {
            _bridgeToArbitrum(asset, amount);
            wethOut = amount; // Simplified
        }

        uint256 usdcOut = _simulateSellSwap(weth, wethOut);
        require(usdcOut > amount + premium, "Insufficient profit");
        uint256 profit = usdcOut - amount - premium;

        emit ArbitrageExecuted(asset, amount, profit, buyOnSkale, block.timestamp);
        success = true;
        result = abi.encode(buyOnSkale, profit);
        return (success, result, profit);
    }

    function _swapOnSkale(address tokenIn, address tokenOut, uint256 amountIn)
        internal
        returns (uint256 amountOut)
    {
        IERC20(tokenIn).approve(address(uniswapRouter), amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: POOL_FEE,
            recipient: address(this),
            deadline: block.timestamp + DEADLINE_EXTENSION,
            amountIn: amountIn,
            amountOutMinimum: (amountIn * (10000 - SLIPPAGE_TOLERANCE)) / 10000,
            sqrtPriceLimitX96: 0
        });

        amountOut = uniswapRouter.exactInputSingle(params);
        IERC20(tokenIn).approve(address(uniswapRouter), 0);
        require(amountOut > 0, "Swap failed");
    }

    function _bridgeToArbitrum(address token, uint256 amount) internal {
        IERC20(token).approve(address(skaleBridge), amount);
        skaleBridge.deposit(token, amount, address(this), ARBITRUM_CHAIN_ID);
        IERC20(token).approve(address(skaleBridge), 0);
    }

    function _estimateBridgeFee(address, uint256) internal pure returns (uint256) {
        return 0; // SKALE IMA Bridge is typically free
    }

    function _estimateArbitrumGasCost() internal view returns (uint256) {
        address ethUsdFeed = IRegistry(registry).getAddress("ETH_USD_FEED");
        (, int256 ethPrice,,,) = AggregatorV3Interface(ethUsdFeed).latestRoundData();
        require(ethPrice > 0, "Invalid ETH price");
        uint256 gasPrice = 100 gwei;
        uint256 gasCostEth = (200_000 * gasPrice) / 1e18;
        return (gasCostEth * uint256(ethPrice)) / 1e8;
    }

    function _simulateSellSwap(address tokenIn, uint256 amountIn) internal pure returns (uint256) {
        return amountIn * 101 / 100; // Placeholder: 1% profit
    }

    function _getUniswapV3Price(address tokenIn, uint256 amountIn)
        internal
        returns (uint256 amountOut, bool valid)
    {
        try uniswapQuoter.quoteExactInputSingle(
            IQuoterV2.QuoteExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: IRegistry(registry).getAddress("WETH"),
                amountIn: amountIn,
                fee: POOL_FEE,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 quotedAmountOut, uint160, uint32, uint256) {
            amountOut = quotedAmountOut;
            valid = true;
        } catch {
            amountOut = 0;
            valid = false;
        }
    }
}