// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface AccessVerifier {
    function isVerified(address _user) external view returns (bool);
}

/**
 * @title Ethical Guard
 * @dev Ensures ethical distribution and prevents exploitation
 */
contract EthicalGuard is Ownable {
    using Math for uint256;
    
    mapping(address => uint256) public lastClaimTime;
    mapping(address => uint256) public totalClaimed;
    mapping(address => bool) public blacklisted;
    
    uint256 public cooldownPeriod = 7 days; // Weekly claims
    uint256 public maxClaimPerWeek = 1000e18; // Max ZiG per week
    uint256 public maxTotalClaim = 50000e18; // Max lifetime claim
    
    address public accessVerifier;
    
    event ClaimApproved(address indexed user, uint256 amount);
    event UserBlacklisted(address indexed user);
    
    constructor(address _initialOwner, address _accessVerifier) Ownable(_initialOwner) {
        accessVerifier = _accessVerifier;
    }

    
    function validateClaim(address _user, uint256 _amount) internal view returns (bool) {
        if (blacklisted[_user]) return false;
        if (!AccessVerifier(accessVerifier).isVerified(_user)) return false;
        if (block.timestamp < lastClaimTime[_user] + cooldownPeriod) return false;
        if (_amount > maxClaimPerWeek) return false;
        if (totalClaimed[_user] + _amount > maxTotalClaim) return false;
        
        return true;
    }
    
    function recordClaim(address _user, uint256 _amount) external onlyOwner {
        require(validateClaim(_user, _amount), "EthicalGuard: Claim not valid");
        
        lastClaimTime[_user] = block.timestamp;
        totalClaimed[_user] += _amount;
        
        emit ClaimApproved(_user, _amount);
    }
    
    function blacklistUser(address _user) external onlyOwner {
        blacklisted[_user] = true;
        emit UserBlacklisted(_user);
    }
}