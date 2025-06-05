// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IRegistry.sol";
import "../interfaces/INftFloorOracle.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract Registry is Initializable, IRegistry, OwnableUpgradeable, UUPSUpgradeable {
    mapping(string => address) public strategies;
    string[] private strategyNames;
    mapping(string => address) private addresses;
    address public nftFloorOracle;

    event StrategyRegistered(string indexed name, address indexed strategy);
    event StrategyDeregistered(string indexed name);
    event AddressSet(string indexed key, address indexed value);
    event NftFloorOracleUpdated(address indexed oracle);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }

    function registerStrategy(string calldata name, address strategy) external override onlyOwner {
        require(strategies[name] == address(0), "Strategy already registered");
        require(strategy != address(0), "Invalid strategy address");
        strategies[name] = strategy;
        strategyNames.push(name);
        emit StrategyRegistered(name, strategy);
    }

    function deregisterStrategy(string calldata name) external override onlyOwner {
        require(strategies[name] != address(0), "Strategy not found");
        delete strategies[name];
        emit StrategyDeregistered(name);
    }

    function getStrategy(string calldata name) external view override returns (address) {
        return strategies[name];
    }

    function getStrategies() external view override returns (address[] memory) {
        address[] memory strategyAddresses = new address[](strategyNames.length);
        for (uint i = 0; i < strategyNames.length; i++) {
            strategyAddresses[i] = strategies[strategyNames[i]];
        }
        return strategyAddresses;
    }

    function getStrategyNames() external view returns (string[] memory) {
        return strategyNames;
    }

    function setAddress(string memory key, address value) external onlyOwner {
        require(value != address(0), "Invalid address");
        addresses[key] = value;
        emit AddressSet(key, value);
    }

    function getAddress(string memory key) external view override returns (address) {
        return addresses[key];
    }

    function setNftFloorOracle(address oracle) external onlyOwner {
        require(oracle != address(0), "Invalid oracle address");
        nftFloorOracle = oracle;
        emit NftFloorOracleUpdated(oracle);
    }

    function getNftFloorPrice(address nftContract) external view override returns (uint256) {
        require(nftFloorOracle != address(0), "NFT floor oracle not set");
        return INftFloorOracle(nftFloorOracle).getFloorPrice(nftContract);
    }

    function addStrategy(string memory name, address strategy) external onlyOwner {
        require(strategy != address(0), "Invalid strategy address");
        strategies[name] = strategy;
        strategyNames.push(name);
        emit StrategyRegistered(name, strategy);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}