// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title ZiG Soulbound Token
 * @dev Identity token for the ZiG ecosystem
 */
contract ZiGSoulboundToken is ERC721, Ownable {
    using Math for uint256;
    
    struct SoulData {
        string ancestryProof;
        uint256 verificationLevel;
        uint256 issueDate;
        bool isActive;
    }
    
    mapping(uint256 => SoulData) public soulData;
    mapping(address => uint256) public ownerToTokenId;
    mapping(address => bool) public verifiers;
    
    uint256 private _tokenIdCounter;
    
    event SoulIssued(address indexed to, uint256 indexed tokenId, uint256 verificationLevel);
    event SoulRevoked(uint256 indexed tokenId);
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    
    constructor() ERC721("ZiG Soulbound Identity", "ZiGSoul") Ownable(msg.sender) {
        verifiers[msg.sender] = true;
    }
    
    modifier onlyVerifier() {
        require(verifiers[msg.sender], "ZiGSoul: Not authorized verifier");
        _;
    }
    
    function addVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "ZiGSoul: Invalid verifier address");
        verifiers[_verifier] = true;
        emit VerifierAdded(_verifier);
    }
    
    function removeVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "ZiGSoul: Invalid verifier address");
        require(_verifier != owner(), "ZiGSoul: Cannot remove owner as verifier");
        verifiers[_verifier] = false;
        emit VerifierRemoved(_verifier);
    }
    
    function issueSoul(
        address _to,
        string memory _ancestryProof,
        uint256 _verificationLevel
    ) external onlyVerifier {
        require(_to != address(0), "ZiGSoul: Invalid recipient address");
        require(ownerToTokenId[_to] == 0, "ZiGSoul: Address already has soul");
        require(bytes(_ancestryProof).length > 0, "ZiGSoul: Ancestry proof required");
        
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        
        _safeMint(_to, tokenId);
        
        soulData[tokenId] = SoulData({
            ancestryProof: _ancestryProof,
            verificationLevel: _verificationLevel,
            issueDate: block.timestamp,
            isActive: true
        });
        
        ownerToTokenId[_to] = tokenId;
        emit SoulIssued(_to, tokenId, _verificationLevel);
    }
    
    function revokeSoul(uint256 _tokenId) external onlyVerifier {
        require(_ownerOf(_tokenId) != address(0), "ZiGSoul: Token does not exist");
        require(soulData[_tokenId].isActive, "ZiGSoul: Soul already revoked");
        
        soulData[_tokenId].isActive = false;
        address owner = ownerOf(_tokenId);
        ownerToTokenId[owner] = 0;
        
        emit SoulRevoked(_tokenId);
    }
    
    // Override transfer functions to make soulbound
    function transferFrom(address from, address to, uint256 tokenId) public virtual override {
        revert("ZiGSoul: Soulbound tokens cannot be transferred");
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public pure virtual override {
        revert("ZiGSoul: Soulbound tokens cannot be transferred");
    }
    
    function approve(address to, uint256 tokenId) public virtual override {
        revert("ZiGSoul: Soulbound tokens cannot be approved");
    }
    
    function setApprovalForAll(address operator, bool approved) public virtual override {
        revert("ZiGSoul: Soulbound tokens cannot be approved");
    }
    
    function getSoulData(uint256 _tokenId) external view returns (SoulData memory) {
        require(_ownerOf(_tokenId) != address(0), "ZiGSoul: Token does not exist");
        return soulData[_tokenId];
    }
    
    function getUserSoul(address _user) external view returns (uint256, SoulData memory) {
        uint256 tokenId = ownerToTokenId[_user];
        require(tokenId != 0, "ZiGSoul: User has no soul token");
        return (tokenId, soulData[tokenId]);
    }
    
    function isVerifier(address _address) external view returns (bool) {
        return verifiers[_address];
    }
}