// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/utils/Counters.sol";

contract SoulHeritageVerifier is ERC721URIStorage, Ownable {
    // using Counters for Counters.Counter;
    // Counters.Counter private _tokenIds;
    uint256 private _tokenIds;

    struct Site {
        string name;
        string location;
        string metadataURI; // could point to IPFS with photo proof, badge art, etc.
        bool active;
    }

    mapping(uint256 => Site) public sites;
    mapping(address => mapping(uint256 => bool)) public hasClaimedBadge; // user => siteId => claimed?

    event SiteAdded(uint256 indexed siteId, string name, string location);
    event BadgeMinted(address indexed user, uint256 indexed siteId, uint256 tokenId);

    constructor() ERC721("SoulHeritageBadge", "SHB") Ownable(msg.sender) {}

    function addSite(string memory name, string memory location, string memory metadataURI) external onlyOwner returns (uint256) {
        uint256 siteId = _tokenIds;
        sites[siteId] = Site({
            name: name,
            location: location,
            metadataURI: metadataURI,
            active: true
        });
        _tokenIds++;
        emit SiteAdded(siteId, name, location);
        return siteId;
    }

    function deactivateSite(uint256 siteId) external onlyOwner {
        sites[siteId].active = false;
    }

    function mintBadge(uint256 siteId, string memory userMetadataURI) external returns (uint256) {
        require(sites[siteId].active, "Site not active");
        require(!hasClaimedBadge[msg.sender][siteId], "Badge already claimed for this site");

        uint256 newItemId = _tokenIds;
        _tokenIds++;

        _safeMint(msg.sender, newItemId);
        _setTokenURI(newItemId, userMetadataURI);

        hasClaimedBadge[msg.sender][siteId] = true;
        emit BadgeMinted(msg.sender, siteId, newItemId);

        return newItemId;
    }

    function userHasBadge(address user, uint256 siteId) external view returns (bool) {
        return hasClaimedBadge[user][siteId];
    }

    function getSite(uint256 siteId) external view returns (Site memory) {
        return sites[siteId];
    }
}
