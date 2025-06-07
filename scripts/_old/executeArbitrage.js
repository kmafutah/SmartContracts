const { ethers } = require("hardhat");

async function main() {
  const contractAddress = process.env.PROFIT_MAXIMIZER_ADDRESS;
  if (!contractAddress) {
    throw new Error("Missing PROFIT_MAXIMIZER_ADDRESS in .env");
  }
  const profitMaximizer = await ethers.getContractAt("ProfitMaximizerModularSystem", contractAddress);
  console.log("Executing Stablecoin Peg Arbitrage...");
  const strategyName = "StablecoinPegArbitrage";
  const asset = process.env.USDT_ADDRESS;
  const amount = ethers.parseEther("1000");
  const params = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "address", "uint256"],
    [asset, process.env.USDC_ADDRESS, ethers.parseEther("995")]
  );
  const tx = await profitMaximizer.executeStrategy(strategyName, asset, amount, params, { gasLimit: 1000000 });
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("Arbitrage executed");
}

main().catch((error) => console.error("Error:", error.message));