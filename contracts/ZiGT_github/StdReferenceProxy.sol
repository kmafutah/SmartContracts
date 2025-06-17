// contracts/StdReferenceProxy.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface IBandStdReference {
  function getReferenceData(string memory base, string memory quote)
    external view returns (uint256 rate, uint256 lastUpdatedBase, uint256 lastUpdatedQuote);
}

contract StdReferenceProxy {
  IBandStdReference public bandOracle;

  constructor(address _bandOracle) {
    bandOracle = IBandStdReference(_bandOracle);
  }

  function getPrice(string memory base, string memory quote) external view returns (uint256) {
    (uint256 rate,,) = bandOracle.getReferenceData(base, quote);
    return rate;
  }
}