// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @title RedistributionVaultV2 - Manages ERC-20 deposits and yield forwarding for ZiG Ecosystem
contract RedistributionVaultV2 is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    struct Pool {
        address token;
        uint256 totalDeposited;
        uint256 totalYield;
    }

    mapping(address => Pool) public pools;
    EnumerableSet.AddressSet private poolTokens;
    address public yieldStrategy;
    address public authorizedMinter;

    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event YieldClaimed(address indexed token, uint256 yield);
    event StrategyUpdated(address newStrategy);

    modifier onlyAuthorizedMinter() {
        require(msg.sender == authorizedMinter, "Not authorized minter");
        _;
    }

    constructor(address _authorizedMinter) Ownable(msg.sender) {
        authorizedMinter = _authorizedMinter;
    }

    function registerToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(!poolTokens.contains(token), "Token already registered");
        poolTokens.add(token);
        pools[token] = Pool(token, 0, 0);
    }

    function depositFromMint(address token, uint256 amount) external onlyAuthorizedMinter {
        require(poolTokens.contains(token), "Unsupported token");
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        pools[token].totalDeposited += amount;
        emit Deposited(msg.sender, token, amount);
    }

    function withdrawToUser(address token, address user, uint256 amount) external onlyAuthorizedMinter {
        require(poolTokens.contains(token), "Unsupported token");
        require(pools[token].totalDeposited >= amount, "Insufficient balance");
        pools[token].totalDeposited -= amount;
        IERC20(token).transfer(user, amount);
        emit Withdrawn(user, token, amount);
    }

    function setYieldStrategy(address _strategy) external onlyOwner {
        require(_strategy != address(0), "Invalid strategy");
        yieldStrategy = _strategy;
        emit StrategyUpdated(_strategy);
    }

    function forwardToYield(address token, uint256 amount) external onlyOwner {
        require(poolTokens.contains(token), "Token not registered");
        require(yieldStrategy != address(0), "No strategy set");
        require(pools[token].totalDeposited >= amount, "Insufficient balance");

        IERC20(token).approve(yieldStrategy, amount);
        (bool success, ) = yieldStrategy.call(
            abi.encodeWithSignature("stake(address,uint256)", token, amount)
        );
        require(success, "Yield stake failed");

        pools[token].totalYield += amount;
        pools[token].totalDeposited -= amount;
        emit YieldClaimed(token, amount);
    }

    function getAllSupportedTokens() external view returns (address[] memory) {
        return poolTokens.values();
    }
}