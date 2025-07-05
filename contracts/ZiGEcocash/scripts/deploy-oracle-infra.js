const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Load existing deployment addresses
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  let deployment = {};
  if (fs.existsSync(deploymentPath)) {
    deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  }

  // Deploy OracleValidator
  const oracleHubAddress = deployment.ZiGOracleHub;
  if (!oracleHubAddress) throw new Error("ZiGOracleHub address not found in deployment file");
  const OracleValidator = await ethers.getContractFactory("OracleValidator");
  const oracleValidator = await OracleValidator.deploy(oracleHubAddress, deployer.address);
  await oracleValidator.waitForDeployment();
  deployment.OracleValidator = await oracleValidator.getAddress();
  console.log("✅ OracleValidator deployed to:", deployment.OracleValidator);

  // Deploy OracleAggregator
  const OracleAggregator = await ethers.getContractFactory("OracleAggregator");
  const oracleAggregator = await OracleAggregator.deploy(deployer.address);
  await oracleAggregator.waitForDeployment();
  deployment.OracleAggregator = await oracleAggregator.getAddress();
  console.log("✅ OracleAggregator deployed to:", deployment.OracleAggregator);

  // Deploy OracleHealthMonitor
  const OracleHealthMonitor = await ethers.getContractFactory("OracleHealthMonitor");
  const oracleHealthMonitor = await OracleHealthMonitor.deploy(oracleHubAddress, deployer.address);
  await oracleHealthMonitor.waitForDeployment();
  deployment.OracleHealthMonitor = await oracleHealthMonitor.getAddress();
  console.log("✅ OracleHealthMonitor deployed to:", deployment.OracleHealthMonitor);

  // Save updated deployment addresses
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("\n📄 Updated deployment addresses saved");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
}); 