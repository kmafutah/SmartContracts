// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {ZiGT} from "../contracts/economic_core/ZiGT.sol";

contract DeployZiGT is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();
        // Replace the following addresses with actual constructor arguments if needed
        address vault = address(0x123); // placeholder
        address oracleHub = address(0x456); // placeholder
        new ZiGT(vault, oracleHub);
        vm.stopBroadcast();
    }
} 