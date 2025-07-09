const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying HelloWorld to SKALE...");
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  const HelloWorld = await ethers.getContractFactory("HelloWorld");
  const hello = await HelloWorld.deploy();
  await hello.waitForDeployment();
  console.log("HelloWorld deployed at:", await hello.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 