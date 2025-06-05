// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IStrategy.sol";
import "../interfaces/IRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

abstract contract BaseStrategy is IStrategy, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IRegistry public immutable registry;
    address public immutable executor;

    modifier onlyExecutor() {
        require(msg.sender == executor, "Only executor");
        _;
    }

    constructor(address _registry, address _executor) {
        require(_registry != address(0) && _executor != address(0), "Invalid addresses");
        registry = IRegistry(_registry);
        executor = _executor;
    }

    function name() external pure virtual override returns (string memory) {
        return "BaseStrategy";
    }

    function checkOpportunity(
        address asset,
        uint256 amount
    ) external view virtual override returns (uint256 profit, bytes memory executionData) {
        profit = 0;
        executionData = "";
    }

    function execute(
        bytes memory executionData,
        uint256 amount,
        uint256 premium
    ) external virtual override onlyExecutor nonReentrant returns (bool, bytes memory, uint256) {
        executionData; amount; premium; // Silence unused parameter warnings
        return (false, "", 0);
    }

    function _approveToken(address token, address spender, uint256 amount) internal {
        IERC20(token).forceApprove(spender, amount); // Using forceApprove instead
    }

    function emergencyWithdraw(address token) external onlyOwner {
        IERC20(token).safeTransfer(owner(), IERC20(token).balanceOf(address(this)));
    }
}