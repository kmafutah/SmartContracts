// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ZiGSoulboundToken is ERC721, Ownable {
    uint256 public nextTokenId;
    struct Identity {
        string tribe;
        string language;
        string reparationsLineage;
    }
    mapping(uint256 => Identity) public identities;

    constructor(address initialOwner) ERC721("ZiG Soulbound Token", "ZiGSoul-TRIBE") Ownable(initialOwner) {}

    // Permissioned minting with identity data
    function mint(address to, string memory tribe, string memory language, string memory reparationsLineage) external onlyOwner returns (uint256) {
        uint256 tokenId = nextTokenId++;
        _mint(to, tokenId);
        identities[tokenId] = Identity(tribe, language, reparationsLineage);
        emit SBTMinted(to, tokenId, tribe, language, reparationsLineage);
        return tokenId;
    }

    // --- Soulbound: block all transfers and approvals ---
    function approve(address, uint256) public pure override { 
        revert("SBT: non-transferable"); 
    }
    function setApprovalForAll(address, bool) public pure override { 
        revert("SBT: non-transferable"); 
    }
    function transferFrom(address, address, uint256) public pure override { 
        revert("SBT: non-transferable"); 
    }
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override { 
        revert("SBT: non-transferable"); 
    }

    event SBTMinted(address indexed to, uint256 indexed tokenId, string tribe, string language, string reparationsLineage);
}
