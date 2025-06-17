// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ZiG NFT
 * @dev Collectible NFTs for the ZiG ecosystem
 */
contract ZiGNFT is ERC721, Ownable {
    
    struct NFTData {
        string metadataURI;
        uint256 rarity;
        uint256 mintDate;
        bool isLimited;
    }
    
    mapping(uint256 => NFTData) public nftData;
    uint256 private _tokenIdCounter;
    
    event NFTMinted(address indexed to, uint256 indexed tokenId, uint256 rarity, bool isLimited);
    
    constructor() ERC721("ZiG Collectible NFT", "ZiGNFT") Ownable(msg.sender) {}
    
function _mintNFT(
    address _to,
    string memory _metadataURI,
    uint256 _rarity,
    bool _isLimited
) internal returns (uint256) {
    require(_to != address(0), "ZiGNFT: Cannot mint to zero address");
    require(bytes(_metadataURI).length > 0, "ZiGNFT: Empty metadata URI");
    require(_rarity > 0, "ZiGNFT: Rarity must be greater than 0");

    _tokenIdCounter++;
    uint256 tokenId = _tokenIdCounter;

    _safeMint(_to, tokenId);

    nftData[tokenId] = NFTData({
        metadataURI: _metadataURI,
        rarity: _rarity,
        mintDate: block.timestamp,
        isLimited: _isLimited
    });

    emit NFTMinted(_to, tokenId, _rarity, _isLimited);

    return tokenId;
}

function nftmint(
    address _to,
    string memory _metadataURI,
    uint256 _rarity,
    bool _isLimited
) external onlyOwner returns (uint256) {
    return _mintNFT(_to, _metadataURI, _rarity, _isLimited);
}

function batchMint(
    address[] memory _recipients,
    string[] memory _metadataURIs,
    uint256[] memory _rarities,
    bool[] memory _isLimited
) external onlyOwner {
    require(_recipients.length == _metadataURIs.length, "ZiGNFT: Arrays length mismatch");
    require(_recipients.length == _rarities.length, "ZiGNFT: Arrays length mismatch");
    require(_recipients.length == _isLimited.length, "ZiGNFT: Arrays length mismatch");
    require(_recipients.length > 0, "ZiGNFT: Empty arrays");

    for (uint256 i = 0; i < _recipients.length; i++) {
        _mintNFT(_recipients[i], _metadataURIs[i], _rarities[i], _isLimited[i]);
    }
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
}