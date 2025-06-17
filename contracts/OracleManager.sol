// // SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.20;

// import "./ZiGTOptimized.sol";

// contract OracleManager {
//     ZiGTOptimized immutable zig;

//     constructor(address _zig) {
//         zig = ZiGTOptimized(_zig);
//     }

//     function configureXAUOracle() external {
//         zig.setOracleConfig(
//             keccak256("XAUUSD"),
//             0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6,
//             "XAU/USD",
//             8,
//             86400
//         );
//     }
// }