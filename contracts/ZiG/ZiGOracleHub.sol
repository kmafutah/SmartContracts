// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

// import "@openzeppelin/contracts/access/Ownable.sol";

// contract ZiGOracleHub is Ownable {
//     uint256 public ratio = 10000; // 1 ZiGT = 1 ZiG by default (1e4 for 4 decimals)

//     function getZigPerZiGT(uint256 zigtAmount) public view returns (uint256) {
//         return (zigtAmount * ratio) / 1e6;
//     }

//     function setRatio(uint256 newRatio) external onlyOwner {
//         ratio = newRatio;
//     }
// }
