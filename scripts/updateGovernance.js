const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0x5373E7FB40638Db965C85902e52FAf6Ec1A32f9d"; // ZiGT proxy address
  const newGovernance = "0xE0282D77cF60BA484e13d24fd5686A6618F09A3B"; // New governance address
  const currentGovernancePrivateKey = process.env.PRIVATE_KEY; // Add to .env
  const newGovernancePrivateKey = process.env.PRIVATE_KEY; // Add to .env

  // Connect to current governance account
  const wallet = new ethers.Wallet(currentGovernancePrivateKey, ethers.provider);
  const Contract = await ethers.getContractFactory("ZiGT");
  const contract = Contract.attach(contractAddress).connect(wallet);

  // Step 1: Initiate governance transfer
  console.log(`Initiating governance transfer to ${newGovernance}...`);
  const initiateTx = await contract.initiateGovernanceTransfer(newGovernance);
  await initiateTx.wait();
  console.log(`Governance transfer initiated: ${initiateTx.hash}`);

  // Step 2: Accept governance transfer with new governance account
  const newWallet = new ethers.Wallet(newGovernancePrivateKey, ethers.provider);
  const contractWithNewGov = contract.connect(newWallet);
  console.log(`Accepting governance transfer...`);
  const acceptTx = await contractWithNewGov.acceptGovernance();
  await acceptTx.wait();
  console.log(`Governance updated to ${newGovernance}: ${acceptTx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});