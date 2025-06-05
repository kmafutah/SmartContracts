// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IStrategy.sol";
import "../interfaces/IRegistry.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "./StrategyExecutor.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract FlashloanExecutor is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    StrategyExecutor public executor;
    IPoolAddressesProvider public addressProvider;
    IPool public pool;
    
    event FlashLoanInitiated(address indexed asset, uint256 amount);
    event StrategyExecuted(address indexed asset, uint256 amount, uint256 premium, bool success);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        IPoolAddressesProvider _addressProvider,
        address _initialOwner,
        address _strategyExecutor
    ) public initializer {
        __Ownable_init(_initialOwner);
        __UUPSUpgradeable_init();
        
        require(_strategyExecutor != address(0), "Invalid executor address");
        addressProvider = _addressProvider;
        pool = IPool(_addressProvider.getPool());
        executor = StrategyExecutor(_strategyExecutor);
    }

    function initiateFlashLoan(
        address asset, 
        uint256 amount,
        bytes calldata executionParams
    ) external onlyOwner {
        require(amount > 0, "Invalid amount");
        bytes memory data = abi.encode(executionParams);
        pool.flashLoanSimple(address(this), asset, amount, data, 0);
        emit FlashLoanInitiated(asset, amount);
    }


    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address, // initiator
        bytes calldata params
    ) external returns (bool) {
        require(msg.sender == address(pool), "Only Aave POOL");
        
        (bool success, ) = address(executor).call(
            abi.encodeWithSignature(
                "findAndExecute(address,uint256,uint256,bytes)",
                asset,
                amount,
                premium,
                params
            )
        );

        require(success, "Strategy execution failed");
        
        uint256 totalOwed = amount + premium;
        ERC20Upgradeable(asset).approve(address(pool), totalOwed);

        emit StrategyExecuted(asset, amount, premium, success);
        return true;
    }

    function updateExecutor(address newExecutor) external onlyOwner {
        require(newExecutor != address(0), "Invalid address");
        executor = StrategyExecutor(newExecutor);
    }

    function updatePoolAddressesProvider(IPoolAddressesProvider newProvider) external onlyOwner {
        require(address(newProvider) != address(0), "Invalid provider");
        addressProvider = newProvider;
        pool = IPool(newProvider.getPool());
    }

    // SKALE-compatible token receiver
    function receiveTokens(address token, uint256 amount) external {
        ERC20Upgradeable(token).transferFrom(msg.sender, address(this), amount);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}