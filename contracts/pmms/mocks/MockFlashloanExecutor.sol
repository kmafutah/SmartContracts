// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

contract MockFlashloanExecutor is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    ISwapRouter public swapRouter;

    // Event to track strategy execution
    event StrategyExecuted(
        address indexed asset,
        uint256 amount,
        bytes params,
        bool success
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _swapRouter, address _owner) public initializer {
        require(_swapRouter != address(0) && _owner != address(0), "Invalid addresses");
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        swapRouter = ISwapRouter(_swapRouter);
    }

    function executeStrategy(address asset, uint256 amount, bytes calldata params) external {
        require(msg.sender == owner(), "Only owner can execute");
        require(asset != address(0), "Invalid asset");
        require(amount > 0, "Amount must be greater than 0");

        (address targetAsset) = abi.decode(params, (address));
        require(targetAsset != address(0), "Invalid target asset");

        // Simulate strategy
        uint256 mockProfit = amount / 100;
        emit StrategyExecuted(asset, amount, params, true);
    }

    function repayLoan(address asset, uint256 amount) external {
        emit StrategyExecuted(asset, amount, bytes("Loan repaid"), true);
    }

    // Optional dummy call
    function updateSwapRouter(address newRouter) external onlyOwner {
        emit StrategyExecuted(address(0), 0, bytes("Router updated"), true);
    }

    // Required by UUPSUpgradeable
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
