// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract StrategyRegistry {
    mapping(string => address) public strategies;
    string[] private strategyNames;

    event StrategyRegistered(string indexed name, address indexed strategy);

    function registerStrategy(string calldata name, address strategy) external {
        require(strategies[name] == address(0), "Strategy already registered");
        strategies[name] = strategy;
        strategyNames.push(name);
        emit StrategyRegistered(name, strategy);
    }

    function getStrategy(string calldata name) external view returns (address) {
        return strategies[name];
    }

    function getStrategyNames() external view returns (string[] memory) {
        return strategyNames;
    }
}
