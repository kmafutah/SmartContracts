// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface INftFloorOracle {
    function getFloorPrice(address nftContract) external view returns (uint256);
}
