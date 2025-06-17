// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title ZiG RWA Token
 * @dev Real World Asset tokenization for the ZiG ecosystem
 */
abstract contract ZiGRWAToken is ERC721, Ownable {
    using Math for uint256;
    
    struct RWAData {
        string assetType;
        string location;
        uint256 valuation;
        string legalDocumentHash;
        bool isVerified;
        uint256 tokenizationDate;
    }
    
    mapping(uint256 => RWAData) public rwaData;
    mapping(address => bool) public verifiers;
    uint256 private _tokenIdCounter;
    
    event RWATokenized(uint256 indexed tokenId, string assetType, uint256 valuation);
    
    constructor() ERC721("ZiG Real World Asset", "ZiGRWA") {
        verifiers[msg.sender] = true;
    }
    
    function tokenizeAsset(
        address _owner,
        string memory _assetType,
        string memory _location,
        uint256 _valuation,
        string memory _legalDocumentHash
    ) external returns (uint256) {
        require(verifiers[msg.sender], "ZiGRWA: Not authorized verifier");
        
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        
        _safeMint(_owner, tokenId);
        
        rwaData[tokenId] = RWAData({
            assetType: _assetType,
            location: _location,
            valuation: _valuation,
            legalDocumentHash: _legalDocumentHash,
            isVerified: true,
            tokenizationDate: block.timestamp
        });
        
        emit RWATokenized(tokenId, _assetType, _valuation);
        return tokenId;
    }
    
    function addVerifier(address _verifier) external onlyOwner {
        verifiers[_verifier] = true;
    }
}
