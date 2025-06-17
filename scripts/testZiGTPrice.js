// scripts/testZiGTPrice.js
const { ethers } = require("hardhat");

async function main() {
  const zigt = await ethers.getContractAt("ZiGT", "0x5373E7FB40638Db965C85902e52FAf6Ec1A32f9d");
  const price = await zigt.getPrice(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("XAUUSD")));
  console.log(`XAUUSD Price: ${ethers.utils.formatUnits(price, 18)} USD`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});