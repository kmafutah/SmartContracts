// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IChainlinkAggregator {
    function latestAnswer() external view returns (int256);
    function decimals() external view returns (uint8);
}

contract ZiGOracleHub is Ownable, ReentrancyGuard {
    struct OracleConfig {
        address source;        // Address of oracle (e.g., Chainlink aggregator)
        uint8 decimals;        // Decimals of the price feed
        bool isCustom;         // Is this a custom (non-Chainlink) feed?
        bool isInverse;        // If true, return 1 / rate
    }

    // Symbol => Oracle Config
    mapping(bytes32 => OracleConfig) public oracles;

    event OracleSet(bytes32 indexed symbol, address source, uint8 decimals, bool isCustom, bool isInverse);
    event OracleRemoved(bytes32 indexed symbol);

    // --- Modifiers ---
    modifier validSymbol(string memory symbol) {
        require(bytes(symbol).length > 0, "Symbol required");
        _;
    }

    // --- Constructor ---
    constructor(address initialOwner) Ownable(initialOwner) {}

    // --- Admin Functions ---
    function setOracle(
        string memory symbol,
        address source,
        uint8 decimals,
        bool isCustom,
        bool isInverse
    ) external onlyOwner validSymbol(symbol) {
        bytes32 key = keccak256(abi.encodePacked(symbol));
        oracles[key] = OracleConfig(source, decimals, isCustom, isInverse);
        emit OracleSet(key, source, decimals, isCustom, isInverse);
    }

    function removeOracle(string memory symbol) external onlyOwner validSymbol(symbol) {
        bytes32 key = keccak256(abi.encodePacked(symbol));
        delete oracles[key];
        emit OracleRemoved(key);
    }

    // --- Public View Functions ---
    function getRate(string memory symbol) public view validSymbol(symbol) returns (uint256 rate, uint8 decimals) {
        bytes32 key = keccak256(abi.encodePacked(symbol));
        OracleConfig memory config = oracles[key];
        require(config.source != address(0), "Oracle not found");

        if (config.isCustom) {
            // Add support for your custom logic here
            revert("Custom oracle logic not implemented");
        } else {
            int256 answer = IChainlinkAggregator(config.source).latestAnswer();
            require(answer > 0, "Invalid rate");
            rate = uint256(answer);

            if (config.isInverse) {
                rate = (10 ** (config.decimals * 2)) / rate; // e.g., 1 / rate
            }

            decimals = config.decimals;
        }
    }

    /// Triangulates FX rate using: rate(A/B) = rate(A/USD) / rate(B/USD)
    function getTriangulatedRate(
        string memory baseSymbol,
        string memory quoteSymbol
    ) external view returns (uint256 rate, uint8 decimals) {
        (uint256 baseRate, uint8 baseDecimals) = getRate(baseSymbol);
        (uint256 quoteRate, uint8 quoteDecimals) = getRate(quoteSymbol);

        require(quoteRate > 0, "Quote rate zero");
        require(baseDecimals == quoteDecimals, "Mismatched decimals");

        rate = (baseRate * (10 ** baseDecimals)) / quoteRate;
        decimals = baseDecimals;
    }
}
