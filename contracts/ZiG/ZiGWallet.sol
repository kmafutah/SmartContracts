// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract ZiGWallet {
    address public owner;
    mapping(address => bool) public isApproved;

    constructor(address[] memory allowedTokens) {
        owner = msg.sender;
        for (uint256 i = 0; i < allowedTokens.length; i++) {
            isApproved[allowedTokens[i]] = true;
        }
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function deposit(address token, uint256 amount) external {
        require(isApproved[token], "Not allowed");
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }

    function withdraw(address token, address to, uint256 amount) external onlyOwner {
        require(isApproved[token], "Not allowed");
        require(IERC20(token).transferFrom(address(this), to, amount), "Transfer failed");
    }

    function setApproval(address token, bool allowed) external onlyOwner {
        isApproved[token] = allowed;
    }
}
