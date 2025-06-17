// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IZiGOracle {
    function getRate(string memory symbol) external view returns (uint256 rate, uint8 decimals);
}