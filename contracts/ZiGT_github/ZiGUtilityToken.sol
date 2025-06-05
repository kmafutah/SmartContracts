// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/metatx/ERC2771Context.sol"; // Uncomment for meta-tx support

contract ZiGUtilityToken is ERC20, Ownable {
    constructor(uint256 initialSupply, address initialOwner)
        ERC20("ZiG Utility Token", "ZiG-UTIL")
        Ownable(initialOwner)
    {
        _mint(initialOwner, initialSupply);
    }

    // Modifier: only token holders can access certain features
    modifier onlyHolder() {
        require(balanceOf(msg.sender) > 0, "ZiG-UTIL: Not a token holder");
        _;
    }

    // Example: Utility function only accessible to holders
    function accessUtilityFeature() external onlyHolder {
        // Implement utility logic here
    }

    // Owner can mint more tokens (for upgrades, rewards, etc.)
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // Owner can airdrop tokens to multiple users
    function airdrop(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Mismatched input");
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }

    // Owner can reward ecosystem contributors (e.g. node runners)
    function rewardContributor(address contributor, uint256 amount) external onlyOwner {
        _mint(contributor, amount);
    }

    // Service payment: users pay a fee in Z-UTIL to access a service
    event ServicePaid(address indexed user, string service, uint256 fee);
    function payForService(string calldata service, uint256 fee) external {
        _burn(msg.sender, fee);
        emit ServicePaid(msg.sender, service, fee);
        // Add logic to grant access to the service if needed
    }

    // Uncomment and use _msgSender() for meta-tx support
    // function _msgSender() internal view override(Context, ERC2771Context) returns (address sender) {
    //     return ERC2771Context._msgSender();
    // }
    // function _msgData() internal view override(Context, ERC2771Context) returns (bytes calldata) {
    //     return ERC2771Context._msgData();
    // }
}
