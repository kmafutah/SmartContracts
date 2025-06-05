const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

async function main() {
  // Validate environment variables
  if (!process.env.PRIVATE_KEY) {
    throw new Error("Missing PRIVATE_KEY in .env");
  }
  if (!process.env.OWNER_ADDRESS) {
    throw new Error("Missing OWNER_ADDRESS in .env");
  }

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  if (deployer.address.toLowerCase() !== "0xe0282d77cf60ba484e13d24fd5686a6618f09a3b") {
    console.warn("WARNING: Deployer is not 0xE0282D77...");
  }

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "sFUEL");
  if (balance === 0n) {
    throw new Error("Deployer has no sFUEL. Use faucet: https://sfuel.skale.network/");
  }

  // Verify upgrades plugin
  if (!upgrades) {
    throw new Error("OpenZeppelin upgrades plugin not loaded. Check hardhat.config.js and dependencies.");
  }

  // Deploy upgradeable contract
  console.log("Deploying WalletStatusChecker proxy...");
  const WalletStatusChecker = await ethers.getContractFactory("WalletStatusChecker");
  const walletStatusChecker = await upgrades.deployProxy(
    WalletStatusChecker,
    [process.env.OWNER_ADDRESS],
    { initializer: "initialize", kind: "uups", gasLimit: 3000000 }
  );
  await walletStatusChecker.waitForDeployment();
  const proxyAddress = await walletStatusChecker.getAddress();
  console.log("WalletStatusChecker proxy deployed to:", proxyAddress);

  // Get implementation address
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("Implementation address:", implementationAddress);

  // Save deployment info
  const deploymentInfo = {
    proxyAddress,
    implementationAddress,
    network: hre.network.name,
    abi: WalletStatusChecker.interface.formatJson(),
  };
  fs.mkdirSync("./deployments", { recursive: true });
  fs.writeFileSync(
    `./deployments/WalletStatusChecker-${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("Deployment info saved");

  // Update .env
  fs.writeFileSync(".env", `\nWALLET_STATUS_CHECKER_ADDRESS=${proxyAddress}`, { flag: "a" });
  console.log("Updated .env with WALLET_STATUS_CHECKER_ADDRESS");

  // Verify on Blockscout
  if (hre.network.name === "skale_testnet") {
    console.log("Verifying implementation on Blockscout...");
    try {
      await hre.run("verify:verify", {
        address: implementationAddress,
        constructorArguments: [],
      });
      console.log("Implementation verified successfully.");
    } catch (error) {
      console.error("Verification failed:", error.message);
    }
  }

  // Test wallet status
  console.log("Checking wallet status for:", process.env.OWNER_ADDRESS);
  try {
    const status = await walletStatusChecker.checkWalletStatus(process.env.OWNER_ADDRESS);
    console.log("Is Blocked:", status.isWalletBlocked, "Can Interact:", status.canInteract);
  } catch (error) {
    console.error("Failed to check wallet status:", error.message);
  }
}

main()
  .then(() => console.log("Deployment completed"))
  .catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });