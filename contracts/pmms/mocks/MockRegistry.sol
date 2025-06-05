// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockRegistry {
    mapping(string => address) private addresses;
    mapping(string => address) private strategies;
    address public nftFloorOracle;

    function getAddress(string memory key) external view returns (address) {
        return addresses[key]; // Returns address(0) if unset
    }

    function setAddress(string memory key, address value) external {
        require(value != address(0), "Invalid address");
        addresses[key] = value;
    }

    function getStrategy(string memory name) external view returns (address) {
        return strategies[name];
    }

    function registerStrategy(string memory name, address strategyAddress) external {
        strategies[name] = strategyAddress;
    }

    function deregisterStrategy(string memory name) external {
        strategies[name] = address(0);
    }

    function setNftFloorOracle(address oracle) external {
        nftFloorOracle = oracle;
    }
}