// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

// import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// contract ZiGVault is Ownable {
//     event Funded(address indexed from, uint256 amount);
//     event Withdrawn(address indexed to, uint256 amount);

//     function fund(address token, uint256 amount) external {
//         require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
//         emit Funded(msg.sender, amount);
//     }

//     function withdraw(address token, address to, uint256 amount) external onlyOwner {
//         require(IERC20(token).transfer(to, amount), "Transfer failed");
//         emit Withdrawn(to, amount);
//     }
// }
