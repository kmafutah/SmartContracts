// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract BandFeedRegistry is Initializable, OwnableUpgradeable {
    // Mapping from asset pair (e.g., keccak256("XAUUSD")) to Band feed address
    mapping(bytes32 => address) public feedAddresses;

    // Event emitted when a feed address is updated
    event FeedAddressUpdated(bytes32 indexed assetKey, address feedAddress);

    // Initializer for upgradable contract
    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
    }

    // Set or update a Band feed address for an asset pair
    function setFeedAddress(string memory assetPair, address feedAddress) external onlyOwner {
        require(feedAddress != address(0), "Invalid feed address");
        bytes32 assetKey = keccak256(bytes(assetPair));
        feedAddresses[assetKey] = feedAddress;
        emit FeedAddressUpdated(assetKey, feedAddress);
    }

    // Lookup a Band feed address for an asset pair
    function getFeedAddress(string memory assetPair) public view returns (address) {
        bytes32 assetKey = keccak256(bytes(assetPair));
        address feedAddress = feedAddresses[assetKey];
        require(feedAddress != address(0), "Feed address not set");
        return feedAddress;
    }
}