// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title Soul Reparation NFT
 * @dev NFT representing reparation claims and heritage with enhanced image support
 */
contract SoulReparationNFT is ERC721, Ownable {
    using Math for uint256;
    
    struct ReparationData {
        string heritageProof;
        uint256 claimAmount;
        uint256 claimDate;
        bool isClaimed;
        string metadataURI;
        string imageURI;        // Direct image URL
        string name;            // NFT name
        string description;     // NFT description
        string[] attributes;    // Array of attributes
        string region;          // Geographic region
        string heritageType;    // Type of heritage (e.g., "Cultural", "Economic", "Land")
    }
    
    mapping(uint256 => ReparationData) public reparations;
    mapping(address => uint256[]) public userClaims;
    mapping(string => uint256) public regionCounts;
    
    uint256 private _tokenIdCounter;
    address public reparationsDAO;
    
    // Predefined heritage types
    string[] public heritageTypes = ["Cultural", "Economic", "Land", "Education", "Healthcare", "Infrastructure"];
    
    event ReparationClaimed(
        address indexed claimant, 
        uint256 indexed tokenId, 
        uint256 amount,
        string region,
        string heritageType
    );
    
    event ImageUpdated(uint256 indexed tokenId, string newImageURI);
    
    constructor(address _reparationsDAO) ERC721("Soul Reparation NFT", "SRNFT") Ownable(msg.sender) {
        require(_reparationsDAO != address(0), "SRNFT: Invalid DAO address");
        reparationsDAO = _reparationsDAO;
    }
    
    function _claimReparationInternal(
        address _claimant,
        string memory _heritageProof,
        uint256 _claimAmount,
        string memory _metadataURI,
        string memory _imageURI,
        string memory _name,
        string memory _description,
        string[] memory _attributes,
        string memory _region,
        string memory _heritageType
    ) internal returns (uint256) {
        require(_claimant != address(0), "SRNFT: Invalid claimant address");
        require(bytes(_heritageProof).length > 0, "SRNFT: Heritage proof required");
        require(bytes(_metadataURI).length > 0, "SRNFT: Metadata URI required");
        require(bytes(_imageURI).length > 0, "SRNFT: Image URI required");
        require(bytes(_name).length > 0, "SRNFT: Name required");
        require(bytes(_region).length > 0, "SRNFT: Region required");
        require(bytes(_heritageType).length > 0, "SRNFT: Heritage type required");
        
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        
        _safeMint(_claimant, tokenId);
        
        reparations[tokenId] = ReparationData({
            heritageProof: _heritageProof,
            claimAmount: _claimAmount,
            claimDate: block.timestamp,
            isClaimed: false,
            metadataURI: _metadataURI,
            imageURI: _imageURI,
            name: _name,
            description: _description,
            attributes: _attributes,
            region: _region,
            heritageType: _heritageType
        });
        
        userClaims[_claimant].push(tokenId);
        regionCounts[_region]++;
        
        emit ReparationClaimed(_claimant, tokenId, _claimAmount, _region, _heritageType);
        return tokenId;
    }
    
    function claimReparation(
        address _claimant,
        string memory _heritageProof,
        uint256 _claimAmount,
        string memory _metadataURI,
        string memory _imageURI,
        string memory _name,
        string memory _description,
        string[] memory _attributes,
        string memory _region,
        string memory _heritageType
    ) external returns (uint256) {
        require(msg.sender == reparationsDAO, "SRNFT: Only DAO can issue claims");
        return _claimReparationInternal(
            _claimant, 
            _heritageProof, 
            _claimAmount, 
            _metadataURI, 
            _imageURI, 
            _name, 
            _description, 
            _attributes, 
            _region, 
            _heritageType
        );
    }

    // Simplified claim function for backward compatibility
    function claimReparationSimple(
        address _claimant,
        string memory _heritageProof,
        uint256 _claimAmount,
        string memory _metadataURI
    ) external returns (uint256) {
        require(msg.sender == reparationsDAO, "SRNFT: Only DAO can issue claims");
        string[] memory defaultAttributes = new string[](0);
        return _claimReparationInternal(
            _claimant, 
            _heritageProof, 
            _claimAmount, 
            _metadataURI, 
            _metadataURI, 
            "Soul Reparation NFT", 
            "A reparation claim NFT representing heritage and justice", 
            defaultAttributes, 
            "Africa", 
            "Cultural"
        );
    }

    // Update image URI for an existing NFT
    function updateImageURI(uint256 tokenId, string memory _newImageURI) external {
        require(msg.sender == reparationsDAO || msg.sender == owner(), "SRNFT: Only DAO or owner can update image");
        require(_ownerOf(tokenId) != address(0), "SRNFT: Token does not exist");
        require(bytes(_newImageURI).length > 0, "SRNFT: Empty image URI");
        
        reparations[tokenId].imageURI = _newImageURI;
        emit ImageUpdated(tokenId, _newImageURI);
    }

    // Get image URI directly
    function getImageURI(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "SRNFT: Token does not exist");
        return reparations[tokenId].imageURI;
    }

    // Get reparations by region
    function getReparationsByRegion(string memory _region) external view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](regionCounts[_region]);
        uint256 index = 0;
        
        for (uint256 tokenId = 1; tokenId <= _tokenIdCounter; tokenId++) {
            if (_ownerOf(tokenId) != address(0) && 
                keccak256(bytes(reparations[tokenId].region)) == keccak256(bytes(_region))) {
                result[index] = tokenId;
                index++;
            }
        }
        
        return result;
    }

    // Get reparations by heritage type
    function getReparationsByHeritageType(string memory _heritageType) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // First pass: count matching tokens
        for (uint256 tokenId = 1; tokenId <= _tokenIdCounter; tokenId++) {
            if (_ownerOf(tokenId) != address(0) && 
                keccak256(bytes(reparations[tokenId].heritageType)) == keccak256(bytes(_heritageType))) {
                count++;
            }
        }
        
        // Second pass: collect token IDs
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 tokenId = 1; tokenId <= _tokenIdCounter; tokenId++) {
            if (_ownerOf(tokenId) != address(0) && 
                keccak256(bytes(reparations[tokenId].heritageType)) == keccak256(bytes(_heritageType))) {
                result[index] = tokenId;
                index++;
            }
        }
        
        return result;
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

    // Get all available heritage types
    function getHeritageTypes() external view returns (string[] memory) {
        return heritageTypes;
    }

    // Get count of reparations in a region
    function getRegionCount(string memory _region) external view returns (uint256) {
        return regionCounts[_region];
    }

    // Get detailed reparation data
    function getReparationData(uint256 tokenId) external view returns (ReparationData memory) {
        require(_ownerOf(tokenId) != address(0), "SRNFT: Token does not exist");
        return reparations[tokenId];
    }
}