// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IRegistry.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/ISwapRouter.sol";
import "../interfaces/IQuoter.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StrategyTriangularArbitrage is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    IRegistry public registry;
    address public usdc;
    address public dai;
    uint256 public slippageTolerance; // Basis points (50 = 0.5%)
    uint24 public poolFee; // e.g., 3000 = 0.3%
    uint160 public sqrtPriceLimitX96;

    event TriangularArbitrage(
        address indexed asset,
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
        usdc = registry.getAddress("USDC");
        dai = registry.getAddress("DAI");
        require(usdc != address(0), "USDC address not set");
        require(dai != address(0), "DAI address not set");
        slippageTolerance = 50; // 0.5%
        poolFee = 3000; // 0.3%
        sqrtPriceLimitX96 = 0;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function name() external pure override returns (string memory) {
        return "TriangularArbitrage";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        if (amount == 0 || (asset != usdc && asset != dai)) {
            return (0, "");
        }

        address uniswapRouter = registry.getAddress("UNISWAP_V3");
        address quoter = registry.getAddress("UNISWAP_V3_QUOTER");
        if (uniswapRouter == address(0) || quoter == address(0)) {
            return (0, "");
        }

        // Triangular path: asset -> USDC -> DAI -> asset
        address[] memory path = new address[](3);
        path[0] = asset;
        path[1] = asset == usdc ? dai : usdc;
        path[2] = asset;

        uint256 amountOut = amount;

        // Swap 1: asset -> intermediate token (USDC or DAI)
        (bool success1, bytes memory data1) = address(quoter).staticcall(
            abi.encodeWithSelector(
                IQuoter.quoteExactInputSingle.selector,
                path[0],
                path[1],
                poolFee,
                amountOut,
                sqrtPriceLimitX96
            )
        );
        if (success1) {
            try this.decodeQuote(data1) returns (uint256 quoteOut) {
                amountOut = quoteOut;
            } catch {
                return (0, "");
            }
        } else {
            return (0, "");
        }

        // Swap 2: intermediate token -> final token (DAI or USDC)
        (bool success2, bytes memory data2) = address(quoter).staticcall(
            abi.encodeWithSelector(
                IQuoter.quoteExactInputSingle.selector,
                path[1],
                path[2],
                poolFee,
                amountOut,
                sqrtPriceLimitX96
            )
        );
        if (success2) {
            try this.decodeQuote(data2) returns (uint256 quoteOut) {
                amountOut = quoteOut;
            } catch {
                return (0, "");
            }
        } else {
            return (0, "");
        }

        // Swap 3: final token -> asset
        (bool success3, bytes memory data3) = address(quoter).staticcall(
            abi.encodeWithSelector(
                IQuoter.quoteExactInputSingle.selector,
                path[2],
                path[0],
                poolFee,
                amountOut,
                sqrtPriceLimitX96
            )
        );
        if (success3) {
            try this.decodeQuote(data3) returns (uint256 quoteOut) {
                amountOut = quoteOut;
            } catch {
                return (0, "");
            }
        } else {
            return (0, "");
        }

        if (amountOut > amount) {
            profit = amountOut - amount;
            executionData = abi.encode(path, amountOut);
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
        (address[] memory path, uint256 expectedAmountOut) = abi.decode(executionData, (address[], uint256));
        require(path.length == 3, "Invalid path length");
        require(path[0] == path[2], "Path must start and end with same token");
        require(path[0] == usdc || path[0] == dai, "Invalid asset");
        require(path[1] == usdc || path[1] == dai, "Invalid intermediate token");

        address uniswapRouter = registry.getAddress("UNISWAP_V3");
        require(uniswapRouter != address(0), "Uniswap router not set");

        IERC20 tokenIn = IERC20(path[0]);
        require(tokenIn.balanceOf(address(this)) >= amount, "Insufficient balance");

        // Execute swap 1: path[0] -> path[1]
        uint256 amountOut1;
        uint256 minAmountOut1 = (amount * (10000 - slippageTolerance)) / 10000;
        tokenIn.approve(uniswapRouter, amount);
        try ISwapRouter(uniswapRouter).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: path[0],
                tokenOut: path[1],
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: amount,
                amountOutMinimum: minAmountOut1,
                sqrtPriceLimitX96: sqrtPriceLimitX96
            })
        ) returns (uint256 amountOut) {
            amountOut1 = amountOut;
        } catch {
            tokenIn.approve(uniswapRouter, 0);
            revert("Swap 1 failed");
        }
        tokenIn.approve(uniswapRouter, 0);

        // Execute swap 2: path[1] -> path[2]
        uint256 amountOut2;
        uint256 minAmountOut2 = (amountOut1 * (10000 - slippageTolerance)) / 10000;
        IERC20 tokenMid = IERC20(path[1]);
        require(tokenMid.balanceOf(address(this)) >= amountOut1, "Insufficient balance for swap 2");
        tokenMid.approve(uniswapRouter, amountOut1);
        try ISwapRouter(uniswapRouter).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: path[1],
                tokenOut: path[2],
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: amountOut1,
                amountOutMinimum: minAmountOut2,
                sqrtPriceLimitX96: sqrtPriceLimitX96
            })
        ) returns (uint256 amountOut) {
            amountOut2 = amountOut;
        } catch {
            tokenMid.approve(uniswapRouter, 0);
            revert("Swap 2 failed");
        }
        tokenMid.approve(uniswapRouter, 0);

        // Execute swap 3: path[2] -> path[0]
        uint256 finalAmount;
        uint256 minAmountOut3 = (expectedAmountOut * (10000 - slippageTolerance)) / 10000;
        IERC20 tokenFinal = IERC20(path[2]);
        require(tokenFinal.balanceOf(address(this)) >= amountOut2, "Insufficient balance for swap 3");
        tokenFinal.approve(uniswapRouter, amountOut2);
        try ISwapRouter(uniswapRouter).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: path[2],
                tokenOut: path[0],
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: amountOut2,
                amountOutMinimum: minAmountOut3,
                sqrtPriceLimitX96: sqrtPriceLimitX96
            })
        ) returns (uint256 amountOut) {
            finalAmount = amountOut;
        } catch {
            tokenFinal.approve(uniswapRouter, 0);
            revert("Swap 3 failed");
        }
        tokenFinal.approve(uniswapRouter, 0);

        finalProfit = finalAmount > amount + premium ? finalAmount - amount - premium : 0;
        require(finalProfit > 0, "Insufficient profit");

        emit TriangularArbitrage(path[0], amount, finalAmount, finalProfit, block.timestamp);

        return (true, abi.encode(finalAmount, finalProfit), finalProfit);
    }

    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    // Helper function for static call decoding
    function decodeQuote(bytes memory data) external pure returns (uint256 amountOut) {
        (amountOut) = abi.decode(data, (uint256));
    }
}