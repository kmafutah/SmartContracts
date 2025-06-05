// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface IStrategy {
    function name() external view returns (string memory);
    function checkOpportunity(address asset, uint256 amount) external returns (uint256 profit, bytes memory executionData);
    function execute(bytes memory executionData, uint256 amount, uint256 premium) external returns (bool success, bytes memory result, uint256 finalAmount);
}