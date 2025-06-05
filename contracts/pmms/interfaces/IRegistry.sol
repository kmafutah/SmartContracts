// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface IRegistry {
    function getAddress(string memory key) external view returns (address);
    function getNftFloorPrice(address nftContract) external view returns (uint256 floorPrice);
    function getStrategies() external view returns (address[] memory);
    function registerStrategy(string calldata name, address strategy) external;
    function deregisterStrategy(string calldata name) external;
    function getStrategy(string calldata name) external view returns (address);
    function getStrategyNames() external view returns (string[] memory);
}