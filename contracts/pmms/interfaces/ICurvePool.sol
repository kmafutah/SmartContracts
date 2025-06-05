// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface ICurvePool {
    function coins(uint256 i) external view returns (address);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function add_liquidity(uint256[3] memory amounts, uint256 min_mint_amount) external returns (uint256);
}