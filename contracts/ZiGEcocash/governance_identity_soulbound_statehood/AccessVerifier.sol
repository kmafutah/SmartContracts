// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Access Verifier
 * @dev ZKP-based verification for ancestry and access control
 */
contract AccessVerifier is Ownable {
    
    mapping(address => bool) public verifiedAncestry;
    mapping(address => uint256) public verificationLevel; // 1-5 levels
    mapping(address => bytes32) public ancestryHash; // ZKP hash
    
    address public soulboundToken;
    
    event AncestryVerified(address indexed user, uint256 level, bytes32 ancestryHash);
    
    constructor(address _soulboundToken) Ownable(msg.sender) {
        soulboundToken = _soulboundToken;
    }
    
    function verifyAncestry(
        address _user,
        uint256 _level,
        bytes32 _ancestryHash,
        bytes memory _zkProof
    ) external onlyOwner {
        // In production, this would verify the ZK proof
        // For now, we'll trust the owner's verification
        require(_level >= 1 && _level <= 5, "AccessVerifier: Invalid level");
        require(_user != address(0), "AccessVerifier: Invalid user address");
        
        verifiedAncestry[_user] = true;
        verificationLevel[_user] = _level;
        ancestryHash[_user] = _ancestryHash;
        
        emit AncestryVerified(_user, _level, _ancestryHash);
    }
    
    function hasAccess(address _user, uint256 _requiredLevel) external view returns (bool) {
        return verifiedAncestry[_user] && verificationLevel[_user] >= _requiredLevel;
    }
    
    function isVerified(address _user) external view returns (bool) {
        return verifiedAncestry[_user];
    }
    
    function revokeVerification(address _user) external onlyOwner {
        require(_user != address(0), "AccessVerifier: Invalid user address");
        require(verifiedAncestry[_user], "AccessVerifier: User not verified");
        
        verifiedAncestry[_user] = false;
        verificationLevel[_user] = 0;
        ancestryHash[_user] = bytes32(0);
    }
    
    function updateSoulboundToken(address _newSoulboundToken) external onlyOwner {
        require(_newSoulboundToken != address(0), "AccessVerifier: Invalid token address");
        soulboundToken = _newSoulboundToken;
    }
}