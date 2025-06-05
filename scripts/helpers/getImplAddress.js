const { upgrades } = require("hardhat");

async function main() {
  const proxy = "<PROXY_ADDRESS>";
  const impl = await upgrades.erc1967.getImplementationAddress(proxy);
  console.log("Implementation Address:", impl);
}

main();
