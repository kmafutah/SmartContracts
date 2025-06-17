// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";

// contract ZiGRedistribution is Ownable {
//     address public diaspora;
//     address public treasury;
//     address public restitution;

//     constructor(address _diaspora, address _treasury, address _restitution) {
//         diaspora = _diaspora;
//         treasury = _treasury;
//         restitution = _restitution;
//     }

//     function distribute(address token, uint256 amount) external {
//         require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Funding failed");
//         uint256 share = amount / 3;
//         IERC20(token).transfer(diaspora, share);
//         IERC20(token).transfer(treasury, share);
//         IERC20(token).transfer(restitution, amount - 2 * share);
//     }

//     function updateRecipients(address d, address t, address r) external onlyOwner {
//         diaspora = d;
//         treasury = t;
//         restitution = r;
//     }
// }
