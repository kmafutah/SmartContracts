// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ZiGSoulID {
    mapping(address => bool) public isVerified;

    function verify(address user) external {
        // Admin only in real implementation
        isVerified[user] = true;
    }

    function isSoulBound(address user) external view returns (bool) {
        return isVerified[user];
    }
}
