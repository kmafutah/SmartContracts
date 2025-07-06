// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;
contract MockConvexBooster {
    function deposit(uint256 _pid, uint256 _amount, bool _stake) external returns (bool) {
        return true;
    }
    function withdraw(uint256 _pid, uint256 _amount) external returns (bool) {
        return true;
    }
}