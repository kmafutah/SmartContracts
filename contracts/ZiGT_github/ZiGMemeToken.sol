// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ZiGMemeToken is ERC20, Ownable {
    mapping(address => uint256) public lastFaucet;
    uint256 public faucetAmount = 1000 * 1e18;
    uint256 public faucetCooldown = 1 days;

    constructor(uint256 initialSupply) ERC20("ZiG Meme Coin", "ZiG-MEME") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    // Meme faucet: anyone can claim once per cooldown
    function claimFaucet() external {
        require(block.timestamp - lastFaucet[msg.sender] >= faucetCooldown, "Wait for cooldown");
        lastFaucet[msg.sender] = block.timestamp;
        _mint(msg.sender, faucetAmount);
        emit MemeClaimed(msg.sender, faucetAmount);
    }

    // Owner airdrop to multiple addresses
    function airdrop(address[] calldata recipients, uint256 amount) external onlyOwner {
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amount);
        }
        emit MemeAirdrop(recipients.length, amount);
    }

    event MemeClaimed(address indexed user, uint256 amount);
    event MemeAirdrop(uint256 numRecipients, uint256 amount);
}
