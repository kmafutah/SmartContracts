// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SoulReparationNFT is ERC721URIStorage, Ownable {
    uint256 public tokenCounter;
    uint256 public lastSoulBlock;
    uint256 public constant BLOCKS_PER_SOUL = 36;

    event SoulNFTMinted(address indexed to, uint256 indexed tokenId, string uri);


    constructor(address initialOwner)
        ERC721("Soul Reparation NFT", "SOUL36")
        Ownable(initialOwner)
    {
        tokenCounter = 0;
        lastSoulBlock = block.number;
    }

    function checkAndMint(address to, string memory metadataURI) external onlyOwner {
        require(block.number >= lastSoulBlock + BLOCKS_PER_SOUL, "Not yet time to mint");

        uint256 newTokenId = tokenCounter;
        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, metadataURI);

        tokenCounter++;
        lastSoulBlock = block.number;

        emit SoulNFTMinted(to, newTokenId, metadataURI);
    }

    function getBlocksSinceLastSoul() public view returns (uint256) {
        return block.number - lastSoulBlock;
    }

    function readyToMint() public view returns (bool) {
        return getBlocksSinceLastSoul() >= BLOCKS_PER_SOUL;
    }
}
