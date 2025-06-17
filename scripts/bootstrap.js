const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`🚀 Deployer: ${deployer.address}`);

  // Deploy Mock PaymentToken (e.g. mock USDC)
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const paymentToken = await MockERC20.deploy("MockUSD", "mUSD", 18);
  await paymentToken.waitForDeployment();
  console.log(`💰 Mock paymentToken deployed at: ${await paymentToken.getAddress()}`);

  // Mint tokens to deployer
  await paymentToken.mint(deployer.address, ethers.parseUnits("100000", 18));
  console.log("✅ Minted 100,000 mUSD to deployer");

  // Deploy Mock OracleHub
  const OracleHub = await ethers.getContractFactory("MockOracleHub");
  const oracleHub = await OracleHub.deploy();
  await oracleHub.waitForDeployment();
  console.log(`🔮 OracleHub deployed at: ${await oracleHub.getAddress()}`);

  // Set mock prices
  const pairs = ["XAUUSD", "USDZAR", "BTCUSD"];
  const prices = [ethers.parseUnits("2300", 18), ethers.parseUnits("18", 18), ethers.parseUnits("70000", 18)];

  for (let i = 0; i < pairs.length; i++) {
    await oracleHub.setPrice(pairs[i], prices[i]);
    console.log(`📡 Set ${pairs[i]} = ${ethers.formatUnits(prices[i], 18)}`);
  }

  // Deploy RedistributionVaultV2
  const Vault = await ethers.getContractFactory("RedistributionVaultV2");
  const vault = await Vault.deploy(deployer.address);
  await vault.waitForDeployment();
  console.log(`🏦 RedistributionVaultV2 deployed at: ${await vault.getAddress()}`);
  await vault.registerToken(await paymentToken.getAddress());

  // Deploy ZiGT_Godmode
  const ZiGT = await ethers.getContractFactory("ZiGT_Godmode");
  const assets = ["XAUUSD", "USDZAR", "BTCUSD"];
  const weights = [BigInt(60e16), BigInt(30e16), BigInt(10e16)]; // 0.6, 0.3, 0.1
  const zigt = await upgrades.deployProxy(ZiGT, [
    await paymentToken.getAddress(),
    await vault.getAddress(),
    await oracleHub.getAddress(),
    assets,
    weights
  ], {
    kind: "uups"
  });

  await zigt.waitForDeployment();
  console.log(`🪙 ZiGT_Godmode deployed at: ${await zigt.getAddress()}`);

  // Approve + Mint ZiGT
  const amount = ethers.parseUnits("100", 18);
  const price = await zigt.getZiGTPrice();
  const cost = (amount * price) / BigInt(1e18);
  await paymentToken.approve(await zigt.getAddress(), cost);
  const mintTx = await zigt.mint(amount);
  await mintTx.wait();
  console.log(`✅ Minted ${ethers.formatUnits(amount)} ZiGT for ${ethers.formatUnits(cost)} mUSD`);

  // Burn + Redeem
  const burnTx = await zigt.burn(amount);
  await burnTx.wait();
  console.log(`🔥 Burned ${ethers.formatUnits(amount)} ZiGT, payout returned`);

  console.log("🎉 Bootstrap complete. Your wallet should now show the value cycle flowing.");
}

main().catch((error) => {
  console.error("❌ Bootstrap failed:", error);
  process.exit(1);
});
