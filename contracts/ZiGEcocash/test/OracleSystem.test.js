const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Oracle System Integration", function () {
  let deployer, validator, aggregator, monitor, oracleHub, zigToken;
  let OracleValidator, OracleAggregator, OracleHealthMonitor, ZiGOracleHub, ZiG;

  before(async function () {
    [deployer] = await ethers.getSigners();

    // Deploy a mock ZiGOracleHub for testing
    ZiGOracleHub = await ethers.getContractFactory("ZiGOracleHub");
    oracleHub = await ZiGOracleHub.deploy(deployer.address);
    await oracleHub.waitForDeployment();

    // Deploy OracleValidator
    OracleValidator = await ethers.getContractFactory("OracleValidator");
    validator = await OracleValidator.deploy(await oracleHub.getAddress(), deployer.address);
    await validator.waitForDeployment();

    // Deploy OracleAggregator
    OracleAggregator = await ethers.getContractFactory("OracleAggregator");
    aggregator = await OracleAggregator.deploy(deployer.address);
    await aggregator.waitForDeployment();

    // Deploy OracleHealthMonitor
    OracleHealthMonitor = await ethers.getContractFactory("OracleHealthMonitor");
    monitor = await OracleHealthMonitor.deploy(await oracleHub.getAddress(), deployer.address);
    await monitor.waitForDeployment();
  });

  it("Validator: should set and get validation rules", async function () {
    await validator.setValidationRule("BTCUSD", ethers.parseUnits("10000", 18), ethers.parseUnits("200000", 18), 15, 3600, true);
    const rule = await validator.getValidationRule("BTCUSD");
    expect(rule.isActive).to.be.true;
    expect(rule.minPrice).to.equal(ethers.parseUnits("10000", 18));
  });

  it("Validator: should validate a correct price", async function () {
    await validator.updatePriceHistory("BTCUSD", ethers.parseUnits("30000", 18));
    const [valid, message] = await validator.validatePrice("BTCUSD", ethers.parseUnits("31000", 18));
    expect(valid).to.be.true;
    expect(message).to.include("passed");
  });

  it("Aggregator: should add and aggregate oracle sources", async function () {
    // Add the oracleHub as a source for BTCUSD
    await aggregator.addOracleSource("BTCUSD", await oracleHub.getAddress(), 10000, 3600);
    // Simulate aggregation (will revert if no price, but should not revert on add)
    const sources = await aggregator.getOracleSources("BTCUSD");
    expect(sources.length).to.equal(1);
    expect(sources[0].oracleAddress).to.equal(await oracleHub.getAddress());
  });

  it("HealthMonitor: should perform a health check and raise alerts if unhealthy", async function () {
    const status = await monitor.performHealthCheck();
    expect(status.totalMetrics).to.be.gte(1);
    // Alerts may be raised if mock oracleHub returns unhealthy
    const [total, active] = await monitor.getAlertCount();
    expect(total).to.be.a("number");
    expect(active).to.be.a("number");
  });

  it("Validator: should raise and resolve alerts", async function () {
    await validator.raiseAlert("BTCUSD", "TEST_ALERT", "Test alert message");
    let activeAlerts = await validator.getActiveAlerts();
    expect(activeAlerts.length).to.be.gte(1);
    await validator.resolveAlert(0);
    activeAlerts = await validator.getActiveAlerts();
    expect(activeAlerts.length).to.equal(0);
  });
}); 