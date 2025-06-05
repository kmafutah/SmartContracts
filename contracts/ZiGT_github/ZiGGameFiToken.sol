// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ZiGGameFiToken is ERC20, Ownable {
    constructor(uint256 initialSupply) ERC20("ZiG GameFi Token", "ZiG-GAME") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    // Mint rewards for in-game achievements (onlyOwner or game contract)
    function rewardMint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit GameReward(to, amount);
    }

    // Burn tokens for in-game spending
    function gameBurn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
        emit GameSpent(from, amount);
    }

    event GameReward(address indexed to, uint256 amount);
    event GameSpent(address indexed from, uint256 amount);
}
