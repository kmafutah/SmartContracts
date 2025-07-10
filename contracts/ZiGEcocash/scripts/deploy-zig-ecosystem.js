// Usage: npx hardhat run scripts/deploy-zig-ecosystem.js --network polygon_zkevm
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy ZiGMerchantRegistry
  const MerchantRegistry = await hre.ethers.getContractFactory("ZiGMerchantRegistry");
  const merchantRegistry = await MerchantRegistry.deploy();
  await merchantRegistry.deployed();
  console.log("ZiGMerchantRegistry deployed to:", merchantRegistry.address);

  // Deploy SoulHeritageVerifier
  const SoulHeritage = await hre.ethers.getContractFactory("SoulHeritageVerifier");
  const soulHeritage = await SoulHeritage.deploy();
  await soulHeritage.deployed();
  console.log("SoulHeritageVerifier deployed to:", soulHeritage.address);

  // Save addresses
  const deployment = {
    network: hre.network.name,
    merchantRegistry: merchantRegistry.address,
    soulHeritageVerifier: soulHeritage.address,
    deployer: deployer.address,
    timestamp: Date.now()
  };
  fs.writeFileSync("deployment-polygon-zkevm.json", JSON.stringify(deployment, null, 2));
  console.log("\nDeployment info saved to deployment-polygon-zkevm.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 