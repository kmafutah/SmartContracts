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

interface IAaveLendingPool {
    function liquidationCall(address collateral, address debt, address user, uint256 debtToCover, bool receiveAToken) external;
}

contract StrategyAaveLiquidation is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuard {
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
        return "AaveLiquidation";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        address aave = IRegistry(registry).getAddress("AAVE_LENDING_POOL");
        address collateral = IRegistry(registry).getAddress("WETH");
        uint256 collateralValue = 1 ether; // Placeholder
        if (collateralValue > amount) {
            profit = collateralValue - amount;
            executionData = abi.encode(collateral, asset, amount);
        }
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool success, bytes memory result, uint256)
    {
        (address collateral, address debtAsset, uint256 debt) = abi.decode(executionData, (address, address, uint256));
        address aave = IRegistry(registry).getAddress("AAVE_LENDING_POOL");
        IERC20 debtToken = IERC20(debtAsset);
        require(debtToken.balanceOf(address(this)) >= debt, "Insufficient balance");

        debtToken.forceApprove(aave, debt);
        try IAaveLendingPool(aave).liquidationCall(collateral, debtAsset, address(this), debt, false) {
            // Liquidation successful
        } catch {
            revert("Liquidation failed");
        }
        debtToken.forceApprove(aave, 0);

        uint256 collateralValue = 1 ether; // Placeholder
        uint256 profit = collateralValue - debt;
        require(profit > premium, "Profit too low");

        success = true;
        result = abi.encode(collateral, profit);
        return (success, result, profit - premium);
    }
}