// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IBandFeedRegistry {
    function getFeedAddress(string memory assetPair) external view returns (address);
}