// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "./core/Registry.sol";
import "./core/FlashloanExecutor.sol";
import "./interfaces/IStrategy.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract ProfitMaximizerModularSystem is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    Registry public registry;
    FlashloanExecutor public flashloanExecutor;

    event StrategyExecuted(string indexed name, address indexed strategy, bool success);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _registry, address _flashloanExecutor, address _owner) external initializer {
        require(_registry != address(0) && _flashloanExecutor != address(0), "Invalid addresses");

        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        registry = Registry(_registry);
        flashloanExecutor = FlashloanExecutor(_flashloanExecutor);
    }

    function executeStrategy(
        string calldata name,
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner {
        address strategyAddress = registry.getStrategy(name);
        require(strategyAddress != address(0), "Strategy not found");

        flashloanExecutor.initiateFlashLoan(asset, amount, params);

        emit StrategyExecuted(name, strategyAddress, true);
    }

    function addStrategy(string calldata name, address strategyAddress) external onlyOwner {
        registry.registerStrategy(name, strategyAddress);
    }

    function removeStrategy(string calldata name) external onlyOwner {
        registry.deregisterStrategy(name);
    }

    function updateFlashloanExecutor(address newExecutor) external onlyOwner {
        require(newExecutor != address(0), "Invalid executor address");
        flashloanExecutor = FlashloanExecutor(newExecutor);
    }

    function setRegistryAddress(string calldata key, address value) external onlyOwner {
        registry.setAddress(key, value);
    }

    function setNftFloorOracle(address oracle) external onlyOwner {
        registry.setNftFloorOracle(oracle);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
