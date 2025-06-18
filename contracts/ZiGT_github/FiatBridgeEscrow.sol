// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// FiatBridgeEscrow.sol
contract FiatBridgeEscrow {
    address public paymentToken;
    address public owner;

    mapping(address => uint256) public pendingDeposits;

    event FiatDeposited(address indexed user, uint256 amount);
    event TokenIssued(address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor(address _paymentToken) {
        paymentToken = _paymentToken;
        owner = msg.sender;
    }

    function recordFiatDeposit(address user, uint256 amount) external onlyOwner {
        pendingDeposits[user] += amount;
        emit FiatDeposited(user, amount);
    }

    function issueToken(address tokenContract) external onlyOwner {
        uint256 amount = pendingDeposits[msg.sender];
        require(amount > 0, "No pending deposit");
        pendingDeposits[msg.sender] = 0;
        IZiGT(tokenContract).mint(msg.sender, amount);
        emit TokenIssued(msg.sender, amount);
    }
}

interface IZiGT {
    function mint(address to, uint256 amount) external;
}
