const fs = require("fs");
const path = require("path");
require("dotenv").config();

/**
 * NFT Metadata Generator for ZiG Ecosystem
 * This script helps generate proper metadata JSON files for NFTs with images
 */

// ZiG Ecosystem NFT Categories and Templates
const NFT_TEMPLATES = {
  cultural: {
    name: "ZiG Cultural Heritage",
    description: "A unique cultural heritage NFT representing African traditions and values",
    attributes: [
      { trait_type: "Category", value: "Cultural" },
      { trait_type: "Rarity", value: "Common" },
      { trait_type: "Heritage", value: "Traditional" }
    ],
    imageBaseUrl: "https://ipfs.io/ipfs/",
    backgroundColor: "#FFD700"
  },
  economic: {
    name: "ZiG Economic Power",
    description: "An economic empowerment NFT representing financial sovereignty",
    attributes: [
      { trait_type: "Category", value: "Economic" },
      { trait_type: "Rarity", value: "Rare" },
      { trait_type: "Power", value: "Financial" }
    ],
    imageBaseUrl: "https://ipfs.io/ipfs/",
    backgroundColor: "#32CD32"
  },
  governance: {
    name: "ZiG Governance Token",
    description: "A governance NFT representing democratic participation and decision-making",
    attributes: [
      { trait_type: "Category", value: "Governance" },
      { trait_type: "Rarity", value: "Epic" },
      { trait_type: "Authority", value: "Democratic" }
    ],
    imageBaseUrl: "https://ipfs.io/ipfs/",
    backgroundColor: "#4169E1"
  },
  gamefi: {
    name: "ZiG GameFi Achievement",
    description: "A gaming achievement NFT representing skill and dedication",
    attributes: [
      { trait_type: "Category", value: "GameFi" },
      { trait_type: "Rarity", value: "Legendary" },
      { trait_type: "Achievement", value: "Gaming" }
    ],
    imageBaseUrl: "https://ipfs.io/ipfs/",
    backgroundColor: "#FF4500"
  },
  utility: {
    name: "ZiG Utility Token",
    description: "A utility NFT providing access to ecosystem services",
    attributes: [
      { trait_type: "Category", value: "Utility" },
      { trait_type: "Rarity", value: "Common" },
      { trait_type: "Function", value: "Service Access" }
    ],
    imageBaseUrl: "https://ipfs.io/ipfs/",
    backgroundColor: "#9370DB"
  },
  reparation: {
    name: "Soul Reparation NFT",
    description: "A reparation claim NFT representing heritage and justice",
    attributes: [
      { trait_type: "Category", value: "Reparation" },
      { trait_type: "Rarity", value: "Mythic" },
      { trait_type: "Justice", value: "Heritage" }
    ],
    imageBaseUrl: "https://ipfs.io/ipfs/",
    backgroundColor: "#8B0000"
  }
};

// Rarity levels and their probabilities
const RARITY_LEVELS = {
  Common: { probability: 0.5, color: "#808080" },
  Uncommon: { probability: 0.25, color: "#32CD32" },
  Rare: { probability: 0.15, color: "#4169E1" },
  Epic: { probability: 0.07, color: "#9370DB" },
  Legendary: { probability: 0.025, color: "#FFD700" },
  Mythic: { probability: 0.005, color: "#FF4500" }
};

/**
 * Generate a random rarity based on probabilities
 */
function generateRarity() {
  const rand = Math.random();
  let cumulative = 0;
  
  for (const [rarity, data] of Object.entries(RARITY_LEVELS)) {
    cumulative += data.probability;
    if (rand <= cumulative) {
      return rarity;
    }
  }
  return "Common";
}

/**
 * Generate NFT metadata
 */
function generateNFTMetadata(category, tokenId, imageHash = null) {
  const template = NFT_TEMPLATES[category.toLowerCase()];
  if (!template) {
    throw new Error(`Unknown category: ${category}`);
  }

  const rarity = Math.random() > 0.8 ? "Rare" : "Common";
  
  // Update attributes with generated rarity
  const attributes = template.attributes.map(attr => {
    if (attr.trait_type === "Rarity") {
      return { ...attr, value: rarity };
    }
    return attr;
  });

  // Add token ID attribute
  attributes.push({
    trait_type: "Token ID",
    value: tokenId.toString(),
    display_type: "number"
  });

  // Add mint date
  attributes.push({
    trait_type: "Mint Date",
    value: Math.floor(Date.now() / 1000),
    display_type: "date"
  });

  const metadata = {
    name: `${template.name} #${tokenId}`,
    description: template.description,
    image: imageHash ? `${template.imageBaseUrl}${imageHash}` : `https://via.placeholder.com/500x500/${template.backgroundColor.replace('#', '')}/FFFFFF?text=ZiG+${category}`,
    external_url: "https://zigeocash.com",
    attributes: attributes,
    background_color: template.backgroundColor,
    animation_url: null,
    youtube_url: null
  };

  return metadata;
}

/**
 * Generate multiple NFT metadata files
 */
function generateBatchMetadata(category, startTokenId, count, outputDir = "./metadata") {
  console.log(`🎨 Generating ${count} ${category} NFT metadata files...`);
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const categoryDir = path.join(outputDir, category.toLowerCase());
  if (!fs.existsSync(categoryDir)) {
    fs.mkdirSync(categoryDir, { recursive: true });
  }

  const metadataFiles = [];

  for (let i = 0; i < count; i++) {
    const tokenId = startTokenId + i;
    const metadata = generateNFTMetadata(category, tokenId);
    
    const filename = `${category.toLowerCase()}_${tokenId}.json`;
    const filepath = path.join(categoryDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(metadata, null, 2));
    metadataFiles.push({
      tokenId,
      filename,
      filepath,
      metadata
    });
    
    console.log(`✅ Generated ${filename}`);
  }

  // Create a summary file
  const summary = {
    category,
    totalGenerated: count,
    startTokenId,
    endTokenId: startTokenId + count - 1,
    generatedAt: new Date().toISOString(),
    files: metadataFiles.map(f => ({
      tokenId: f.tokenId,
      filename: f.filename,
      name: f.metadata.name,
      rarity: f.metadata.attributes.find(a => a.trait_type === "Rarity")?.value
    }))
  };

  const summaryPath = path.join(categoryDir, `summary_${category.toLowerCase()}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log(`📊 Summary saved to ${summaryPath}`);
  return metadataFiles;
}

/**
 * Generate placeholder images for NFTs
 */
function generatePlaceholderImages(category, count, outputDir = "./images") {
  console.log(`🖼️  Generating ${count} placeholder images for ${category}...`);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const categoryDir = path.join(outputDir, category.toLowerCase());
  if (!fs.existsSync(categoryDir)) {
    fs.mkdirSync(categoryDir, { recursive: true });
  }

  const template = NFT_TEMPLATES[category.toLowerCase()];
  const images = [];

  for (let i = 0; i < count; i++) {
    const imageUrl = `https://via.placeholder.com/500x500/${template.backgroundColor.replace('#', '')}/FFFFFF?text=ZiG+${category}+${i + 1}`;
    images.push({
      index: i,
      url: imageUrl,
      filename: `${category.toLowerCase()}_${i + 1}.png`
    });
  }

  // Save image list
  const imageListPath = path.join(categoryDir, `images_${category.toLowerCase()}.json`);
  fs.writeFileSync(imageListPath, JSON.stringify(images, null, 2));
  
  console.log(`📸 Image list saved to ${imageListPath}`);
  console.log(`💡 To upload images to IPFS, use the URLs in the image list file`);
  
  return images;
}

/**
 * Create deployment-ready metadata for contract interaction
 */
function createDeploymentMetadata(category, count) {
  console.log(`🚀 Creating deployment metadata for ${count} ${category} NFTs...`);
  
  const metadata = [];
  const imageUrls = [];
  const names = [];
  const descriptions = [];
  const attributes = [];
  const rarities = [];
  const isLimited = [];
  const categories = [];

  for (let i = 0; i < count; i++) {
    const tokenId = i + 1;
    const nftMetadata = generateNFTMetadata(category, tokenId);
    
    metadata.push(nftMetadata.image); // Use image URL as metadata URI
    imageUrls.push(nftMetadata.image);
    names.push(nftMetadata.name);
    descriptions.push(nftMetadata.description);
    attributes.push(nftMetadata.attributes.map(a => `${a.trait_type}: ${a.value}`));
    rarities.push(parseInt(nftMetadata.attributes.find(a => a.trait_type === "Rarity")?.value || "1"));
    isLimited.push(false);
    categories.push(category);
  }

  const deploymentData = {
    category,
    count,
    metadata,
    imageUrls,
    names,
    descriptions,
    attributes,
    rarities,
    isLimited,
    categories
  };

  const deploymentPath = `./deployment_${category.toLowerCase()}_metadata.json`;
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  
  console.log(`✅ Deployment metadata saved to ${deploymentPath}`);
  return deploymentData;
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "generate":
      const category = args[1] || "cultural";
      const count = parseInt(args[2]) || 10;
      const startId = parseInt(args[3]) || 1;
      
      console.log(`🎨 Generating ${count} ${category} NFTs starting from ID ${startId}...`);
      generateBatchMetadata(category, startId, count);
      generatePlaceholderImages(category, count);
      break;

    case "deploy":
      const deployCategory = args[1] || "cultural";
      const deployCount = parseInt(args[2]) || 5;
      
      console.log(`🚀 Creating deployment metadata for ${deployCount} ${deployCategory} NFTs...`);
      createDeploymentMetadata(deployCategory, deployCount);
      break;

    case "list":
      console.log("📋 Available NFT categories:");
      Object.keys(NFT_TEMPLATES).forEach(cat => {
        console.log(`  • ${cat.charAt(0).toUpperCase() + cat.slice(1)}`);
      });
      break;

    case "template":
      const templateCategory = args[1] || "cultural";
      const template = NFT_TEMPLATES[templateCategory.toLowerCase()];
      if (template) {
        console.log(`📋 Template for ${templateCategory}:`);
        console.log(JSON.stringify(template, null, 2));
      } else {
        console.log(`❌ Unknown category: ${templateCategory}`);
      }
      break;

    default:
      console.log(`
🎨 ZiG NFT Metadata Generator

Usage:
  node generate-nft-metadata.js generate [category] [count] [startId]
  node generate-nft-metadata.js deploy [category] [count]
  node generate-nft-metadata.js list
  node generate-nft-metadata.js template [category]

Examples:
  node generate-nft-metadata.js generate cultural 10 1
  node generate-nft-metadata.js deploy economic 5
  node generate-nft-metadata.js list
  node generate-nft-metadata.js template governance

Categories: cultural, economic, governance, gamefi, utility, reparation
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateNFTMetadata,
  generateBatchMetadata,
  generatePlaceholderImages,
  createDeploymentMetadata,
  NFT_TEMPLATES,
  RARITY_LEVELS
}; 