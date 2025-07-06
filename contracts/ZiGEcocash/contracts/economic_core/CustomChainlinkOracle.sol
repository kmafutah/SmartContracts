// contracts/CustomChainlinkOracle.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface IChainlinkAggregator {
  function latestAnswer() external view returns (int256);
  function decimals() external view returns (uint8);
}

contract CustomChainlinkOracle is IChainlinkAggregator {
  int256 private price;
  uint8 public decimals;
  address public owner;

  constructor(uint8 _decimals) {
    decimals = _decimals;
    owner = msg.sender;
  }

  function setPrice(int256 _price) external {
    require(msg.sender == owner, "Not owner");
    price = _price;
  }

  function latestAnswer() external view override returns (int256) {
    return price;
  }
}