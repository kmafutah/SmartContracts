// // SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.24;

// import "./ZiGBondingCurve.sol";

// contract TestBondingCurve is ZiGBondingCurve {
//     address public dao;

//     modifier onlyDAO() {
//         require(msg.sender == dao, "Only DAO can call");
//         _;
//     }

//     function initialize(address _dao) public override initializer {
//         __ZiGBondingCurve_init();
//         dao = _dao;
//         __governance = _dao;
//     }

//     function mint(uint256 amount) external payable override onlyDAO {
//         return ZiGBondingCurve.mint(amount);
//     }

//     function burn(uint256 amount) external override onlyDAO {
//         return ZiGBondingCurve.burn(amount);
//     }
// }
