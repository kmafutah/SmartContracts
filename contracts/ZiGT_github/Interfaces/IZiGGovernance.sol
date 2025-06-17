// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IZiGGovernance {
    function governanceRole() external view returns (bytes32);
    function hasRole(address account, bytes32 role) external view returns (bool);
}