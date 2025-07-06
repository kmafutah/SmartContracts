# 🎨 ZiG NFT Image Guide

## Overview
Your ZiG ecosystem now supports NFTs with images! The enhanced contracts include:

- **Direct image URLs** for each NFT
- **Rich metadata** (name, description, attributes)
- **Multiple categories** (Cultural, Economic, Governance, Reparation)
- **IPFS support** for decentralized storage

## Quick Start

### 1. Deploy Enhanced Contracts
```bash
npx hardhat run scripts/deploy-full.js --network localhost
```

### 2. Create NFTs with Images
```bash
# Single NFT
node scripts/create-nft-with-images.js create 0xYourAddress cultural

# Multiple NFTs
node scripts/create-nft-with-images.js batch 0xYourAddress cultural,economic,governance
```

## Available NFT Types

| Category | Image | Description |
|----------|-------|-------------|
| Cultural | Gold background | African traditions & heritage |
| Economic | Green background | Financial sovereignty |
| Governance | Blue background | Democratic participation |
| Reparation | Red background | Heritage & justice claims |

## Smart Contract Functions

### ZiGNFT
```solidity
// Mint with image
function nftmint(address _to, string _metadataURI, string _imageURI, string _name, string _description, string[] _attributes, uint256 _rarity, bool _isLimited, string _category)

// Update image
function updateImageURI(uint256 tokenId, string _newImageURI)

// Get image
function getImageURI(uint256 tokenId) returns (string)
```

### SoulReparationNFT
```solidity
// Claim with image
function claimReparation(address _claimant, string _heritageProof, uint256 _claimAmount, string _metadataURI, string _imageURI, string _name, string _description, string[] _attributes, string _region, string _heritageType)
```

## Image Options

1. **Current**: Placeholder images (`https://via.placeholder.com/...`)
2. **Custom**: Your own image URLs
3. **IPFS**: Decentralized storage (`ipfs://QmHash`)
4. **Arweave**: Permanent storage (`ar://Hash`)

## Update Images

```javascript
// Update existing NFT
const ZiGNFT = await ethers.getContract("ZiGNFT");
await ZiGNFT.updateImageURI(1, "https://new-image-url.com/image.png");
```

## User Onboarding

The updated onboarding script now creates NFTs with images:

```bash
node scripts/user-onboarding.js
```

## View NFTs

```javascript
// Get NFT data
const nftData = await ZiGNFT.getTokenData(1);
console.log("Image:", nftData.imageURI);
console.log("Name:", nftData.name);

// Get user's NFTs
const userNFTs = await ZiGNFT.tokensOfOwner(userAddress);
```

## Next Steps

1. Deploy contracts with image support
2. Create test NFTs using scripts
3. Upload custom images to IPFS
4. Integrate with frontend
5. Add more categories

---

**Your NFTs now have images! 🎨✨** 