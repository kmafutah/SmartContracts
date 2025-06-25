// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
contract MockAaveLendingPool {
    mapping(address => mapping(address => uint256)) public deposits;
    mapping(address => mapping(address => uint256)) public borrows;
    function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        deposits[onBehalfOf][asset] += amount;
    }
    function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external {
        require(deposits[onBehalfOf][asset] >= amount, "Insufficient collateral");
        IERC20(asset).transfer(onBehalfOf, amount);
        borrows[onBehalfOf][asset] += amount;
    }
    function repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf) external returns (uint256) {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        borrows[onBehalfOf][asset] -= amount;
        return amount;
    }
    function getUserAccountData(address user)
        external
        view
        returns (
            uint256 totalCollateralETH,
            uint256 totalDebtETH,
            uint256 availableBorrowsETH,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        )
    {
        totalCollateralETH = deposits[user][address(0)] * 1e18;
        totalDebtETH = borrows[user][address(0)] * 1e18;
        availableBorrowsETH = (totalCollateralETH * 8000) / 10000 - totalDebtETH;
        currentLiquidationThreshold = 8500;
        ltv = 8000;
        healthFactor = totalDebtETH == 0 ? type(uint256).max : (totalCollateralETH * 8500) / totalDebtETH;
    }
}