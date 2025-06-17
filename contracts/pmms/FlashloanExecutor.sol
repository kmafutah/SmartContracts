// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "./interfaces/IStrategy.sol";
import "./interfaces/IRegistry.sol";
import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract x_FlashloanExecutor is FlashLoanSimpleReceiverBase, Ownable {
    IRegistry public immutable registry;
    address public strategyExecutor;

    event FlashloanExecuted(address indexed asset, uint256 amount, uint256 premium, bool success);

    constructor(
        IPoolAddressesProvider provider,
        address _registry,
        address _strategyExecutor,
        address _owner
    ) FlashLoanSimpleReceiverBase(provider) Ownable(_owner) {
        require(_registry != address(0) && _strategyExecutor != address(0), "Invalid addresses");
        registry = IRegistry(_registry);
        strategyExecutor = _strategyExecutor;
    }

    function executeStrategy(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner {
        POOL.flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0
        );
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(POOL), "Unauthorized");
        require(initiator == address(this), "Invalid initiator");

        // Find and execute best strategy
        (bool success, bytes memory result) = strategyExecutor.call(
            abi.encodeWithSignature(
                "findAndExecute(address,uint256,uint256)",
                asset,
                amount,
                premium
            )
        );

        // Approve repayment
        uint256 totalAmount = amount + premium;
        IERC20(asset).approve(address(POOL), totalAmount);

        emit FlashloanExecuted(asset, amount, premium, success);
        return success;
    }

    function updateStrategyExecutor(address newExecutor) external onlyOwner {
        require(newExecutor != address(0), "Invalid executor address");
        strategyExecutor = newExecutor;
    }
}