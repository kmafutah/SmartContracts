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
      bandRegistry = process.env.ZKEVM_BAND_REGISTRY || "0xDA7a001b254CD22e46d3eAB04d937489c93174C3";
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

  // ======================
  // 1. Deploy Token Contracts
  // ======================
  console.log("\nDeploying token contracts...");
  
  const Token = await ethers.getContractFactory("ZiGT"); // Replace with your actual token contract
  
  const tokens = {
    "Digital Forward": await Token.deploy("Digital Forward", "DFWD"),
    "Geopolitical Hedge": await Token.deploy("Geopolitical Hedge", "GEOH"),
    "Afro-centric Trust": await Token.deploy("Afro-centric Trust", "AFCT")
  };

  // Wait for all deployments to complete
  for (const [name, deployment] of Object.entries(tokens)) {
    await deployment.waitForDeployment();
    console.log(`${name} token deployed to: ${await deployment.getAddress()}`);
  }

  // ======================
  // 2. Deploy ZiG Stablecoin
  // ======================
  console.log("\nDeploying ZiG Stable contract...");
  const ZiGStable = await ethers.getContractFactory("ZiGTOptimized");
  const zigStable = await upgrades.deployProxy(ZiGStable, [
    USE_BAND ? bandRegistry : ethers.ZeroAddress,
    process.env.GOVERNANCE_ADDRESS || deployer.address
  ]);

  await zigStable.waitForDeployment();
  const zigStableAddress = await zigStable.getAddress();
  console.log(`ZiG Stable deployed to: ${zigStableAddress}`);

  // ======================
  // 3. Initialize System
  // ======================
  console.log("\nInitializing system...");
  
  // Set strategy
  console.log("Setting ZiG Mirror Model strategy...");
  await zigStable.updateStrategy(3); // Assuming 3 is ZiGMirrorModel
  console.log("Strategy set successfully");

  // Register tokens with ZiG system
  console.log("\nRegistering tokens with ZiG system...");
  for (const [name, token] of Object.entries(tokens)) {
    const tx = await zigStable.initializeToken(name, await token.getAddress());
    await tx.wait();
    console.log(`Registered ${name} token`);
  }

  // ======================
  // 4. Verification
  // ======================
  if (network.chainId !== 31337) { // Skip localhost
    console.log("\nStarting verification process...");
    
    try {
      // Verify tokens
      for (const [name, token] of Object.entries(tokens)) {
        console.log(`Verifying ${name} token...`);
        await hre.run("verify:verify", {
          address: await token.getAddress(),
          constructorArguments: [name, name.replace(/\s+/g, '').substring(0, 4)],
        });
      }

      // Verify ZiG Stable
      console.log("Verifying ZiG Stable implementation...");
      const implementationAddress = await upgrades.erc1967.getImplementationAddress(zigStableAddress);
      await hre.run("verify:verify", {
        address: implementationAddress,
        constructorArguments: [],
      });

      console.log("\nDeployment complete!");
      console.log("ZiG System Addresses:");
      console.log(`- ZiG Stable: ${zigStableAddress}`);
      console.log("Tokens:");
      for (const [name, token] of Object.entries(tokens)) {
        console.log(`- ${name}: ${await token.getAddress()}`);
      }
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});