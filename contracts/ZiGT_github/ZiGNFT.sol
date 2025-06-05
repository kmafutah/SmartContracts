// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract ZiGNFT is ERC721URIStorage, Ownable {
    using EnumerableSet for EnumerableSet.UintSet;
    uint256 public nextTokenId;
    mapping(address => EnumerableSet.UintSet) private _ownedTokens;

    // Lazy minting: admin sets up claimable NFTs
    struct LazyMint {
        string uri;
        bool claimed;
    }
    mapping(uint256 => LazyMint) public lazyMints;
    uint256 public nextLazyMintId;

    constructor(address initialOwner) ERC721("ZiG NFT", "ZiGID-ART") Ownable(initialOwner) {}

    // Standard mint (admin/council/DAO)
    function mint(address to, string memory uri) external onlyOwner returns (uint256) {
        uint256 tokenId = nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _ownedTokens[to].add(tokenId);
        emit NFTMinted(to, tokenId, uri);
        return tokenId;
    }

    // Mint diaspora/council badge
    function mintBadge(address to, string memory badgeType, string memory uri) external onlyOwner returns (uint256) {
        uint256 tokenId = nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _ownedTokens[to].add(tokenId);
        emit BadgeMinted(to, tokenId, badgeType, uri);
        return tokenId;
    }

    // Mint cultural artifact
    function mintCultural(address to, string memory artifactType, string memory uri) external onlyOwner returns (uint256) {
        uint256 tokenId = nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _ownedTokens[to].add(tokenId);
        emit CulturalMinted(to, tokenId, artifactType, uri);
        return tokenId;
    }

    // Lazy mint setup (admin)
    function setupLazyMint(string memory uri) external onlyOwner returns (uint256) {
        uint256 lazyId = nextLazyMintId++;
        lazyMints[lazyId] = LazyMint({uri: uri, claimed: false});
        emit LazyMintSetup(lazyId, uri);
        return lazyId;
    }

    // Claim lazy minted NFT (user pays gas)
    function claimLazyMint(uint256 lazyId) external returns (uint256) {
        require(!lazyMints[lazyId].claimed, "Already claimed");
        lazyMints[lazyId].claimed = true;
        uint256 tokenId = nextTokenId++;
        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, lazyMints[lazyId].uri);
        _ownedTokens[msg.sender].add(tokenId);
        emit NFTClaimed(msg.sender, tokenId, lazyMints[lazyId].uri);
        return tokenId;
    }

    // View owned tokens
    function tokensOf(address owner) external view returns (uint256[] memory) {
        return _ownedTokens[owner].values();
    }

    // Events
    event NFTMinted(address indexed to, uint256 indexed tokenId, string uri);
    event BadgeMinted(address indexed to, uint256 indexed tokenId, string badgeType, string uri);
    event CulturalMinted(address indexed to, uint256 indexed tokenId, string artifactType, string uri);
    event LazyMintSetup(uint256 indexed lazyId, string uri);
    event NFTClaimed(address indexed to, uint256 indexed tokenId, string uri);
}
