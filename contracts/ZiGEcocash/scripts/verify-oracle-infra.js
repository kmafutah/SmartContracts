const { run } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deploymentPath = path.join(__dirname, "../deployment-addresses-polygon_zkevm.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Deployment file not found");
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const deployer = deployment.deployer;

  // OracleValidator
  if (deployment.OracleValidator) {
    await run("verify:verify", {
      address: deployment.OracleValidator,
      constructorArguments: [deployment.ZiGOracleHub, deployer],
    });
    console.log("✅ Verified OracleValidator");
  }

  // OracleAggregator
  if (deployment.OracleAggregator) {
    await run("verify:verify", {
      address: deployment.OracleAggregator,
      constructorArguments: [deployer],
    });
    console.log("✅ Verified OracleAggregator");
  }

  // OracleHealthMonitor
  if (deployment.OracleHealthMonitor) {
    await run("verify:verify", {
      address: deployment.OracleHealthMonitor,
      constructorArguments: [deployment.ZiGOracleHub, deployer],
    });
    console.log("✅ Verified OracleHealthMonitor");
  }
}

main().catch((error) => {
  console.error("❌ Verification failed:", error);
  process.exit(1);
}); 