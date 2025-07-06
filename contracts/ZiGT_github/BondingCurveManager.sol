// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ZiGBondingCurve} from "./ZiGBondingCurve.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// This file is deprecated. All BondingCurve management is now handled by the DAO (ZiGGovernance).
// Do not use this file in production or tests.

contract BondingCurveManager is Ownable {
    ZiGBondingCurve public curve;

    constructor(address _curve, address initialOwner) Ownable(initialOwner) {
        curve = ZiGBondingCurve(_curve);
    }

    function mintOnCurve(uint256 amount) external payable onlyOwner {
        curve.mint{value: msg.value}(amount);
    }

    function burnOnCurve(uint256 amount) external onlyOwner {
        curve.burn(amount);
    }
}
