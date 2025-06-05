// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

interface IChainlinkAggregator {
    function latestAnswer() external view returns (int256);
}

contract FeedRegistry is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    mapping(bytes32 => address) public feeds;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }

    // --- ADMIN: Set a feed ---
    function setFeed(bytes32 symbol, address feedAddress) public onlyOwner {
        require(feedAddress != address(0), "Invalid feed address");
        feeds[symbol] = feedAddress;
    }

    function setFeedForString(string memory symbol, address feedAddress) external onlyOwner {
        bytes32 key = keccak256(bytes(symbol));
        feeds[key] = feedAddress;
    }

    // --- Get a feed address ---
    function getFeed(bytes32 symbol) external view returns (address) {
        return feeds[symbol];
    }

    // --- Get latest rate from feed ---
    function getRate(bytes32 symbol) public view returns (uint256) {
        address feed = feeds[symbol];
        require(feed != address(0), "Feed not set");

        int256 answer = IChainlinkAggregator(feed).latestAnswer();
        require(answer > 0, "Invalid feed rate");
        return uint256(answer);
    }

    function getRateForString(string memory symbol) external view returns (uint256) {
        return getRate(keccak256(bytes(symbol)));
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
