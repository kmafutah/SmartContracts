const USE_BAND = !process.argv.includes("--no-band");
const { ethers, upgrades } = require("hardhat");

async function main() {
  // Get network configuration
  const network = await ethers.provider.getNetwork();
  
  // Select the appropriate Band registry based on network
  let bandRegistry;
  switch(network.chainId) {
    case 137: // Polygon
      bandRegistry = process.env.POLYGON_BAND_REGISTRY;
      break;
    case 1101: // Polygon zkEVM
      bandRegistry = process.env.ZKEVM_BAND_REGISTRY;
      break;
    default: // Mainnet and others
      bandRegistry = process.env.BAND_PROTOCOL_REGISTRY;
  }

  if (!bandRegistry) {
    throw new Error(`No Band registry configured for network ${network.name} (chainId: ${network.chainId})`);
  }

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);
  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Using Band Registry: ${bandRegistry}`);

  // Deploy the contract
  const ZiGStable = await ethers.getContractFactory("ZiGTOptimized");
    const zigStable = await upgrades.deployProxy(ZiGStable, [
    USE_BAND ? bandRegistry : ethers.ZeroAddress,
    process.env.GOVERNANCE_ADDRESS || deployer.address
    ]);

  await zigStable.waitForDeployment();
  console.log(`ZiG Stable deployed to: ${await zigStable.getAddress()}`);

  // Initialize with default strategy
  console.log("Initializing with ZiG Mirror Model strategy...");
  await zigStable.updateStrategy(3); // Assuming 3 is ZiGMirrorModel
  console.log("Strategy set successfully");

  // Verify contract (if possible)
  if (network.chainId !== 31337) { // Skip localhost
    try {
      await hre.run("verify:verify", {
        address: await zigStable.getAddress(),
        constructorArguments: [],
      });
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});