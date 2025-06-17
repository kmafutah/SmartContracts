// interfaces/IBandStdReference.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IBandStdReference {
    function getReferenceData(string memory base, string memory quote) external view returns (
        uint256 rate,
        uint256 lastUpdatedBase,
        uint256 lastUpdatedQuote
    );
}