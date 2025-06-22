// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title Soul Reparation NFT
 * @dev NFT representing reparation claims and heritage
 */
contract SoulReparationNFT is ERC721, Ownable {
    using Math for uint256;
    
    struct ReparationData {
        string heritageProof;
        uint256 claimAmount;
        uint256 claimDate;
        bool isClaimed;
        string metadataURI;
    }
    
    mapping(uint256 => ReparationData) public reparations;
    mapping(address => uint256[]) public userClaims;
    
    uint256 private _tokenIdCounter;
    address public reparationsDAO;
    
    event ReparationClaimed(address indexed claimant, uint256 indexed tokenId, uint256 amount);
    
    constructor(address _reparationsDAO) ERC721("Soul Reparation NFT", "SRNFT") Ownable(msg.sender) {
        require(_reparationsDAO != address(0), "SRNFT: Invalid DAO address");
        reparationsDAO = _reparationsDAO;
    }
    
    function claimReparation(
        address _claimant,
        string memory _heritageProof,
        uint256 _claimAmount,
        string memory _metadataURI
    ) external returns (uint256) {
        require(msg.sender == reparationsDAO, "SRNFT: Only DAO can issue claims");
        require(_claimant != address(0), "SRNFT: Invalid claimant address");
        require(bytes(_heritageProof).length > 0, "SRNFT: Heritage proof required");
        require(bytes(_metadataURI).length > 0, "SRNFT: Metadata URI required");
        
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        
        _safeMint(_claimant, tokenId);
        
        reparations[tokenId] = ReparationData({
            heritageProof: _heritageProof,
            claimAmount: _claimAmount,
            claimDate: block.timestamp,
            isClaimed: false,
            metadataURI: _metadataURI
        });
        
        userClaims[_claimant].push(tokenId);
        
        emit ReparationClaimed(_claimant, tokenId, _claimAmount);
        return tokenId;
    }
    
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "SRNFT: URI query for nonexistent token");
        return reparations[tokenId].metadataURI;
    }
    
    function getUserClaims(address _user) external view returns (uint256[] memory) {
        return userClaims[_user];
    }
    
    function setReparationsDAO(address _newDAO) external onlyOwner {
        require(_newDAO != address(0), "SRNFT: Invalid DAO address");
        reparationsDAO = _newDAO;
    }
    
    function markClaimed(uint256 tokenId) external {
        require(msg.sender == reparationsDAO, "SRNFT: Only DAO can mark as claimed");
        require(_ownerOf(tokenId) != address(0), "SRNFT: Token does not exist");
        reparations[tokenId].isClaimed = true;
    }
}