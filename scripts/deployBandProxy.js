// scripts/deployBandProxy.js
const { ethers } = require("hardhat");

async function main() {
  const bandOracle = "INSERT_BAND_ORACLE_ADDRESS_HERE"; // From Band team
  const Proxy = await ethers.getContractFactory("StdReferenceProxy");
  const proxy = await Proxy.deploy(bandOracle);
  await proxy.deployed();
  console.log(`StdReferenceProxy deployed to: ${proxy.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});