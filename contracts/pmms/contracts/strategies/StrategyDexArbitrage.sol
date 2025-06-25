// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IRegistry.sol";
import "../interfaces/IStrategy.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract StrategyDexArbitrage is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    address public registry;
    uint256 public slippageDenominator;
    uint256 public slippageTolerance; // 0.5%

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); // Prevent initialization during deployment
    }

    function initialize(address _registry) external initializer {
        require(_registry != address(0), "Invalid registry");
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        registry = _registry;
        slippageDenominator = 10000;
        slippageTolerance = 50; // 0.5%
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function name() external pure override returns (string memory) {
        return "DexArbitrage";
    }

    struct DexAddresses {
        address uniswap;
        address sushiswap;
        address weth;
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        DexAddresses memory dex = _getDexAddresses();
        
        uint256 uniOut = _getPrice(dex.uniswap, asset, dex.weth, amount);
        uint256 sushiOut = _getPrice(dex.sushiswap, asset, dex.weth, amount);

        if (uniOut > _applySlippage(sushiOut, true)) {
            profit = uniOut - sushiOut;
            executionData = abi.encode(asset, dex.uniswap, dex.sushiswap);
        } else if (sushiOut > _applySlippage(uniOut, true)) {
            profit = sushiOut - uniOut;
            executionData = abi.encode(asset, dex.sushiswap, dex.uniswap);
        }
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        returns (bool, bytes memory, uint256)
    {
        (address token, address buyDex, address sellDex) = abi.decode(executionData, (address, address, address));
        DexAddresses memory dex = _getDexAddresses();

        uint256 receivedAmount = _swapTokens(
            buyDex,
            token,
            dex.weth,
            amount,
            _applySlippage(amount, false)
        );

        uint256 finalAmount = _swapTokens(
            sellDex,
            dex.weth,
            token,
            receivedAmount,
            0
        );

        uint256 profit = finalAmount > amount + premium ? finalAmount - amount - premium : 0;
        require(profit > 0, "Insufficient profit");
        
        return (true, abi.encode(profit), profit);
    }

    function _getDexAddresses() internal view returns (DexAddresses memory) {
        return DexAddresses({
            uniswap: IRegistry(registry).getAddress("UNISWAP_V2"),
            sushiswap: IRegistry(registry).getAddress("SUSHISWAP"),
            weth: IRegistry(registry).getAddress("WETH")
        });
    }

    function _applySlippage(uint256 amount, bool isPositive) internal view returns (uint256) {
        return isPositive 
            ? (amount * (slippageDenominator + slippageTolerance)) / slippageDenominator
            : (amount * (slippageDenominator - slippageTolerance)) / slippageDenominator;
    }

    function _swapTokens(
        address router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) internal returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        IERC20(tokenIn).approve(router, amountIn);
        uint256[] memory amounts = IUniswapV2Router02(router).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            address(this),
            block.timestamp + 300
        );
        IERC20(tokenIn).approve(router, 0);

        return amounts[1];
    }

    function _getPrice(address dex, address from, address to, uint256 amountIn)
        internal
        view
        returns (uint256)
    {
        address[] memory path = new address[](2);
        path[0] = from;
        path[1] = to;
        uint256[] memory amounts = IUniswapV2Router02(dex).getAmountsOut(amountIn, path);
        return amounts[1];
    }

    function withdraw(address token, uint256 amount) external {
        require(msg.sender == registry, "Only registry can withdraw");
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}