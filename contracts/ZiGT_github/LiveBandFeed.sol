// LiveBandFeed.sol
// (No import "hardhat/console.sol"; or console.log lines here)

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "./Interfaces/IBandStdReference.sol";

contract LiveBandFeed is IBandStdReference {
    address public owner;
    mapping(string => uint256) public prices;
    mapping(string => uint256) public lastUpdated;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function setPrice(string memory pair, uint256 price) external onlyOwner {
        prices[pair] = price;
        lastUpdated[pair] = block.timestamp;
    }

    function getReferenceData(string memory base, string memory quote) external view returns (
        uint256 rate,
        uint256 lastUpdatedBase,
        uint256 lastUpdatedQuote
    ) {
        string memory pair = string(abi.encodePacked(base, quote));

        rate = prices[pair];
        // Change the require to an if-revert with a specific message
        if (rate == 0) { 
            revert(string(abi.encodePacked("LiveBandFeed: Price is zero for pair: ", pair))); 
        }

        uint256 lastUpdate = lastUpdated[pair];
        // Change the require to an if-revert with a specific message
        if (lastUpdate == 0) { 
            revert(string(abi.encodePacked("LiveBandFeed: Timestamp is zero for pair: ", pair)));
        }

        return (rate, lastUpdate, lastUpdate);
    }

    function setHighPrecisionPrice(string memory pair, uint256 price, uint8 decimals) external onlyOwner {
        // Normalize to 18 decimals internally for downstream compatibility
        require(decimals <= 30, "Too many decimals");
        if (decimals > 18) {
            uint256 factor = 10 ** (decimals - 18);
            prices[pair] = price / factor;
        } else {
            uint256 factor = 10 ** (18 - decimals);
            prices[pair] = price * factor;
        }
        lastUpdated[pair] = block.timestamp;
    }
}