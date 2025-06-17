// // SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.20;

// // import "forge-std/Script.sol";
// import "./ZiG.sol";
// import "./ZiGT.sol";
// import "./ZiGOracleHub.sol";
// import "./ZiGWallet.sol";
// import "./ZiGSoulID.sol";
// import "./ZiGVault.sol";
// import "./ZiGRedistribution.sol";

// contract DeployFullSystem is Script {
//     function run() external {
//         address admin = vm.envAddress("ADMIN");

//         vm.startBroadcast(admin);

//         ZiG zig = new ZiG(admin);
//         ZiGOracleHub oracle = new ZiGOracleHub();
//         ZiGT zigt = new ZiGT(address(zig), address(oracle));

//         address ;
//         allowed[0] = address(zig);
//         allowed[1] = address(zigt);
//         ZiGWallet wallet = new ZiGWallet(allowed);

//         ZiGSoulID soul = new ZiGSoulID(admin);
//         ZiGVault vault = new ZiGVault();
//         ZiGRedistribution dist = new ZiGRedistribution(admin, admin, admin);

//         vm.stopBroadcast();

//         console.log("ZiG: ", address(zig));
//         console.log("ZiGT: ", address(zigt));
//         console.log("Oracle: ", address(oracle));
//         console.log("Wallet: ", address(wallet));
//         console.log("SoulID: ", address(soul));
//         console.log("Vault: ", address(vault));
//         console.log("Redistribution: ", address(dist));
//     }
// }
