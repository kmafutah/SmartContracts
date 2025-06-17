// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MultiOracle - A centralized, timestamped, verifiable oracle
/// @notice For use in cross-border token ecosystems, stablecoins, FX feeds, and experimentation.
/// @dev Not decentralized; should be secured behind multisig or DAO-controlled governance.

contract MultiOracle {
    struct OracleData {
        uint256 price;      // Price value with `decimals`
        uint8 decimals;     // Number of decimals used (e.g., 18)
        uint256 updatedAt;  // Last update timestamp
    }

    mapping(bytes32 => OracleData) internal data;
    address public owner;

    event PriceUpdated(
        string indexed pair,
        uint256 price,
        uint8 decimals,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "MultiOracle: not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Updates a price feed for a given pair
    function setPrice(
        string memory pair,
        uint256 price,
        uint8 _decimals
    ) external onlyOwner {
        bytes32 key = keccak256(bytes(pair));
        data[key] = OracleData(price, _decimals, block.timestamp);
        emit PriceUpdated(pair, price, _decimals, block.timestamp);
    }

    /// @notice Fetches latest price for a pair
    function latestAnswer(string memory pair) external view returns (int256) {
        bytes32 key = keccak256(bytes(pair));
        return int256(data[key].price);
    }

    /// @notice Returns decimals used for the pair
    function getDecimals(string memory pair) external view returns (uint8) {
        bytes32 key = keccak256(bytes(pair));
        return data[key].decimals;
    }

    /// @notice Returns last update timestamp for a pair
    function getUpdatedAt(string memory pair) external view returns (uint256) {
        bytes32 key = keccak256(bytes(pair));
        return data[key].updatedAt;
    }

    /// @notice Chainlink-compatible reader for integration
    function latestRoundData(string memory pair)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt_,
            uint80 answeredInRound
        )
    {
        bytes32 key = keccak256(bytes(pair));
        OracleData memory o = data[key];
        return (0, int256(o.price), 0, o.updatedAt, 0);
    }

    /// @notice Transfers ownership to a new address
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "MultiOracle: zero address");
        owner = newOwner;
    }
}
