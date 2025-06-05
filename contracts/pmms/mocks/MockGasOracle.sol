// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;
contract MockGasOracle {
    uint256 public gasPrice = 1000000000; // 1 gwei
    function getGasPrice() external view returns (uint256) {
        return gasPrice;
    }
    function setGasPrice(uint256 _gasPrice) external {
        gasPrice = _gasPrice;
    }
}