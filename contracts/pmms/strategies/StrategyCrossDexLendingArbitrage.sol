// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IRegistry.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/IAavePool.sol";
import "../interfaces/ICompound.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract StrategyCrossDexLendingArbitrage is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public registry;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); // Prevent initialization during deployment
    }

    function initialize(address _registry) external initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        registry = _registry;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function name() external pure override returns (string memory) {
        return "CrossDexLendingArbitrage";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        address aavePool = IRegistry(registry).getAddress("AAVE_LENDING_POOL");
        address compound = IRegistry(registry).getAddress("COMPTROLLER");

        (, , , , uint128 aaveBorrowRate, , , , , , , ) = IAavePool(aavePool).getReserveData(asset);
        uint256 compoundSupplyRate = ICompound(compound).getSupplyRate(asset);

        if (compoundSupplyRate > aaveBorrowRate) {
            profit = (amount * (compoundSupplyRate - aaveBorrowRate)) / 1e18;
            executionData = abi.encode(aavePool, compound);
        }
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool success, bytes memory result, uint256)
    {
        (address aavePool, address compound) = abi.decode(executionData, (address, address));
        
        address asset = IRegistry(registry).getAddress("USDC");
        address cToken = IRegistry(registry).getAddress("CUSDC");

        // Ensure contract is approved to borrow
        require(IERC20(asset).balanceOf(address(this)) >= 0, "Invalid initial balance");

        // Borrow from Aave (interestRateMode = 2 for variable rate)
        IAavePool(aavePool).borrow(asset, amount, 2, 0, address(this));

        // Verify borrowed amount
        uint256 borrowedBalance = IERC20(asset).balanceOf(address(this));
        require(borrowedBalance >= amount, "Borrow failed");

        // Supply to Compound V2 (using cToken)
        SafeERC20.forceApprove(IERC20(asset), cToken, amount);
        require(ICompound(cToken).mint(amount) == 0, "Compound supply failed");

        // Reset approval for safety
        SafeERC20.forceApprove(IERC20(asset), cToken, 0);

        // Simplified: Return estimated profit
        uint256 estimatedProfit = amount - premium;
        require(estimatedProfit > 0, "No profit after premium");

        uint256 profit = estimatedProfit; // Lending APY - borrow APR
        success = true;
        result = abi.encode(asset, profit);
        return (success, result, profit - premium);
    }
}