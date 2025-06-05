// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface ICompound {
    function supply(address asset, uint256 amount) external returns (uint256);
    function getSupplyRate(address asset) external view returns (uint256);
    function mint(uint256 mintAmount) external returns (uint256);
    function supplyRatePerBlock() external view returns (uint256);
}