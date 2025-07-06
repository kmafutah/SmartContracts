// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract MockPoolAddressesProvider {
    address public pool;

    constructor(address _pool) {
        pool = _pool;
    }

    function getPool() external view returns (address) {
        return pool;
    }
}
