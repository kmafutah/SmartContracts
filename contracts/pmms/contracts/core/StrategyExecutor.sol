// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IRegistry.sol";
import "../interfaces/IStrategy.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract StrategyExecutor is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    IRegistry public registry;
    address public flashloanExecutor;

    event StrategyExecuted(address indexed strategy, address indexed asset, uint256 profit);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _registry,
        address _flashloanExecutor,
        address _owner
    ) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        
        require(_registry != address(0) && _flashloanExecutor != address(0), "Invalid addresses");
        registry = IRegistry(_registry);
        flashloanExecutor = _flashloanExecutor;
    }

    function findAndExecute(
        address asset,
        uint256 amount,
        uint256 premium,
        bytes calldata params
    ) external returns (bool success, bytes memory result) {
        require(msg.sender == flashloanExecutor, "Unauthorized");

        string[] memory strategyNames = registry.getStrategyNames();
        uint256 bestProfit = 0;
        address bestStrategy;
        bytes memory bestExecutionData;

        for (uint256 i = 0; i < strategyNames.length; i++) {
            address strategyAddr = registry.getStrategy(strategyNames[i]);
            if (strategyAddr == address(0)) continue;

            (uint256 profit, bytes memory executionData) = IStrategy(strategyAddr).checkOpportunity(asset, amount);
            
            if (profit > bestProfit && profit > premium) {
                bestProfit = profit;
                bestStrategy = strategyAddr;
                bestExecutionData = executionData;
            }
        }

        if (bestStrategy != address(0)) {
            (bool executed, bytes memory strategyResult, uint256 finalAmount) = 
                IStrategy(bestStrategy).execute(bestExecutionData, amount, premium);
            
            if (executed && finalAmount > amount + premium) {
                emit StrategyExecuted(bestStrategy, asset, finalAmount - amount - premium);
                return (true, strategyResult);
            }
        }

        return (false, "No profitable strategy found");
    }

    function updateFlashloanExecutor(address newExecutor) external onlyOwner {
        require(newExecutor != address(0), "Invalid address");
        flashloanExecutor = newExecutor;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}