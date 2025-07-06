// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ZiG NFT
 * @dev Collectible NFTs for the ZiG ecosystem with enhanced image support
 */
contract ZiGNFT is ERC721, Ownable {
    
    struct NFTData {
        string metadataURI;
        string imageURI;        // Direct image URL
        string name;            // NFT name
        string description;     // NFT description
        string[] attributes;    // Array of attributes
        uint256 rarity;
        uint256 mintDate;
        bool isLimited;
        string category;        // Category like "Cultural", "Economic", "Governance"
    }
    
    mapping(uint256 => NFTData) public nftData;
    mapping(string => uint256) public categoryCounts;
    uint256 private _tokenIdCounter;
    
    // Predefined categories for ZiG ecosystem
    string[] public categories = ["Cultural", "Economic", "Governance", "GameFi", "Utility"];
    
    event NFTMinted(
        address indexed to, 
        uint256 indexed tokenId, 
        string name,
        string category,
        uint256 rarity, 
        bool isLimited
    );
    
    event ImageUpdated(uint256 indexed tokenId, string newImageURI);
    
    constructor() ERC721("ZiG Collectible NFT", "ZiGNFT") Ownable(msg.sender) {}
    
    function _mintNFT(
        address _to,
        string memory _metadataURI,
        string memory _imageURI,
        string memory _name,
        string memory _description,
        string[] memory _attributes,
        uint256 _rarity,
        bool _isLimited,
        string memory _category
    ) internal returns (uint256) {
        require(_to != address(0), "ZiGNFT: Cannot mint to zero address");
        require(bytes(_metadataURI).length > 0, "ZiGNFT: Empty metadata URI");
        require(bytes(_imageURI).length > 0, "ZiGNFT: Image URI required");
        require(bytes(_name).length > 0, "ZiGNFT: Name required");
        require(_rarity > 0, "ZiGNFT: Rarity must be greater than 0");
        require(bytes(_category).length > 0, "ZiGNFT: Category required");

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        _safeMint(_to, tokenId);

        nftData[tokenId] = NFTData({
            metadataURI: _metadataURI,
            imageURI: _imageURI,
            name: _name,
            description: _description,
            attributes: _attributes,
            rarity: _rarity,
            mintDate: block.timestamp,
            isLimited: _isLimited,
            category: _category
        });

        categoryCounts[_category]++;

        emit NFTMinted(_to, tokenId, _name, _category, _rarity, _isLimited);

        return tokenId;
    }

    function nftmint(
        address _to,
        string memory _metadataURI,
        string memory _imageURI,
        string memory _name,
        string memory _description,
        string[] memory _attributes,
        uint256 _rarity,
        bool _isLimited,
        string memory _category
    ) external onlyOwner returns (uint256) {
        return _mintNFT(_to, _metadataURI, _imageURI, _name, _description, _attributes, _rarity, _isLimited, _category);
    }

    // Simplified mint function for backward compatibility
    function nftmint(
        address _to,
        string memory _metadataURI,
        uint256 _rarity,
        bool _isLimited
    ) external onlyOwner returns (uint256) {
        string[] memory defaultAttributes = new string[](0);
        return _mintNFT(_to, _metadataURI, _metadataURI, "ZiG NFT", "A collectible NFT from the ZiG ecosystem", defaultAttributes, _rarity, _isLimited, "Cultural");
    }

    function batchMint(
        address[] memory _recipients,
        string[] memory _metadataURIs,
        string[] memory _imageURIs,
        string[] memory _names,
        string[] memory _descriptions,
        string[][] memory _attributes,
        uint256[] memory _rarities,
        bool[] memory _isLimited,
        string[] memory _categories
    ) external onlyOwner {
        require(_recipients.length == _metadataURIs.length, "ZiGNFT: Arrays length mismatch");
        require(_recipients.length == _imageURIs.length, "ZiGNFT: Arrays length mismatch");
        require(_recipients.length == _names.length, "ZiGNFT: Arrays length mismatch");
        require(_recipients.length == _descriptions.length, "ZiGNFT: Arrays length mismatch");
        require(_recipients.length == _attributes.length, "ZiGNFT: Arrays length mismatch");
        require(_recipients.length == _rarities.length, "ZiGNFT: Arrays length mismatch");
        require(_recipients.length == _isLimited.length, "ZiGNFT: Arrays length mismatch");
        require(_recipients.length == _categories.length, "ZiGNFT: Arrays length mismatch");
        require(_recipients.length > 0, "ZiGNFT: Empty arrays");

        for (uint256 i = 0; i < _recipients.length; i++) {
            _mintNFT(_recipients[i], _metadataURIs[i], _imageURIs[i], _names[i], _descriptions[i], _attributes[i], _rarities[i], _isLimited[i], _categories[i]);
        }
    }

    // Update image URI for an existing NFT
    function updateImageURI(uint256 tokenId, string memory _newImageURI) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "ZiGNFT: Token does not exist");
        require(bytes(_newImageURI).length > 0, "ZiGNFT: Empty image URI");
        
        nftData[tokenId].imageURI = _newImageURI;
        emit ImageUpdated(tokenId, _newImageURI);
    }

    // Get image URI directly
    function getImageURI(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "ZiGNFT: Token does not exist");
        return nftData[tokenId].imageURI;
    }

    // Get NFT by category
    function getNFTsByCategory(string memory _category) external view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](categoryCounts[_category]);
        uint256 index = 0;
        
        for (uint256 tokenId = 1; tokenId <= _tokenIdCounter; tokenId++) {
            if (_ownerOf(tokenId) != address(0) && 
                keccak256(bytes(nftData[tokenId].category)) == keccak256(bytes(_category))) {
                result[index] = tokenId;
                index++;
            }
        }
        
        return result;
    }
    
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "ZiGNFT: URI query for nonexistent token");
        return nftData[tokenId].metadataURI;
    }
    
    function updateTokenURI(uint256 tokenId, string memory _newURI) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "ZiGNFT: Token does not exist");
        require(bytes(_newURI).length > 0, "ZiGNFT: Empty metadata URI");
        
        nftData[tokenId].metadataURI = _newURI;
    }
    
    function getTokenData(uint256 tokenId) external view returns (NFTData memory) {
        require(_ownerOf(tokenId) != address(0), "ZiGNFT: Token does not exist");
        return nftData[tokenId];
    }
    
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        require(owner != address(0), "ZiGNFT: Invalid owner address");
        
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory result = new uint256[](tokenCount);
        uint256 index = 0;
        
        for (uint256 tokenId = 1; tokenId <= _tokenIdCounter; tokenId++) {
            if (_ownerOf(tokenId) == owner) {
                result[index] = tokenId;
                index++;
            }
        }
        
        return result;
    }

    // Get all available categories
    function getCategories() external view returns (string[] memory) {
        return categories;
    }

    // Get count of NFTs in a category
    function getCategoryCount(string memory _category) external view returns (uint256) {
        return categoryCounts[_category];
    }
}