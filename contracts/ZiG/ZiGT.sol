// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
// import "./ZiG.sol";
// import "./ZiGOracleHub.sol";

// contract ZiGT is ERC20, Ownable {
//     ZiG public zig;
//     ZiGOracleHub public oracle;

//     constructor(address _zig, address _oracle) ERC20("ZiGT Stable Asset", "ZiGT") {
//         zig = ZiG(_zig);
//         oracle = ZiGOracleHub(_oracle);
//     }

//     function mint(uint256 amount) external {
//         uint256 zigRequired = oracle.getZigPerZiGT(amount);
//         require(zig.transferFrom(msg.sender, address(this), zigRequired), "ZIG transfer failed");
//         _mint(msg.sender, amount);
//     }

//     function burn(uint256 amount) external {
//         _burn(msg.sender, amount);
//         uint256 zigReturn = oracle.getZigPerZiGT(amount);
//         zig.transfer(msg.sender, zigReturn);
//     }

//     function decimals() public pure override returns (uint8) {
//         return 6;
//     }
// }
