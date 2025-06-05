// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IRegistry.sol";

contract MockCurve3Pool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256 dy) {
        return dx * 997 / 1000; // Simulate 0.3% fee
    }

    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256) {
        uint256 dy = dx * 997 / 1000;
        require(dy >= min_dy, "Insufficient output");
        address tokenIn = i == 1 ? IRegistry(msg.sender).getAddress("USDC") : IRegistry(msg.sender).getAddress("USDT");
        address tokenOut = j == 1 ? IRegistry(msg.sender).getAddress("USDC") : IRegistry(msg.sender).getAddress("USDT");
        IERC20(tokenIn).transferFrom(msg.sender, address(this), dx);
        IERC20(tokenOut).transfer(msg.sender, dy);
        return dy;
    }
}