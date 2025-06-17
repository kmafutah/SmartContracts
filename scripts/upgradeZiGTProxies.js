// scripts/upgradeZiGTProxies.js
const { ethers, upgrades } = require("hardhat");
require("dotenv").config();

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`\n🚀 Running upgrade script with account: ${deployer.address}`);
    console.log("💰 Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "sFUEL");

    // if (parseFloat(ethers.formatEther(await deployer.provider.getBalance(deployer.address))) === 0) {
    //     console.error("\n❌ WARNING: Deployer account has 0 sFUEL. Transactions will fail due to insufficient funds.");
    //     console.error("Please fund your account (0xE0282D77cF60BA484e13d24fd5686A6618F09A3B) with sFUEL and try again.");
    //     process.exit(1); // Exit if no funds
    // }

    // List of all deployed ZiGT token proxy addresses
    // IMPORTANT: Keep these as your *existing* proxy addresses.
    const ZIGT_TOKEN_PROXIES = [
        { name: "ZiG-R", address: "0xe8fD1D1933b33b9c23E19F0a7FE7e7d3513181d8" },
        { name: "ZiG-N", address: "0x0C29a92536FCBad97BdE6F32c1C828B7372D614F" },
        { name: "ZiG-RG", address: "0x3fb3FB12bBD92a72Ff6EE7943166c2141CC830f3" },
        { name: "ZiG-KB", address: "0x0FC1D3a789D4E0f34F818664a9cee3Eb36d7D4D3" },
        { name: "ZiG-UB", address: "0xB7908962811106b7AD624273D7B22634099E8B44" },
        { name: "ZiG-SF", address: "0x632612061BA979dFef4E2702d858667bBf04698e" },
        { name: "ZiG-PC", address: "0xa5E5822167F4A6272717Bf0338A2f6805B5f20c5" },
        { name: "ZiG-MG", address: "0x58Ba1Ff84E7e35546A4A879ad1EBf3a819a4c8F9" },
        { name: "ZiG-SH", address: "0x0ADa5965b949716dD7d956049E35FD86fD385467" },
        { name: "ZiG-CD", address: "0xB3637907ae9bFEB13Bfd3c952b4f57Be1Cc7eca3" },
        { name: "ZiG-KU", address: "0x506C1302ECc7B00A25003Df36b12409a5A80aA6d" },
        { name: "ZiG-KD", address: "0x76A5E52b6ad5cdeFf9aE80C239fcf544Bd370Be2" },
    ];

    // Get the ContractFactory for your ZiGT contract (this reflects the LATEST compiled code)
    const ZiGTFactory = await ethers.getContractFactory("contracts/ZiGT_github/ZiGT.sol:ZiGT");

    for (const tokenInfo of ZIGT_TOKEN_PROXIES) {
        console.log(`\n--- Upgrading ${tokenInfo.name} (${tokenInfo.address}) ---`);
        try {
            // Optional: Validate the upgrade first. This checks for storage layout compatibility.
            // This is crucial for safe upgrades.
            await upgrades.validateUpgrade(tokenInfo.address, ZiGTFactory);
            console.log(`  ✅ Upgrade validation passed for ${tokenInfo.name}.`);

            // Perform the upgrade. This will deploy a new implementation if needed,
            // and then update the proxy to point to it.
            const upgradedToken = await upgrades.upgradeProxy(tokenInfo.address, ZiGTFactory);
            await upgradedToken.waitForDeployment(); // Wait for the transaction to be mined

            const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(tokenInfo.address);

            console.log(`  ✅ ${tokenInfo.name} upgraded successfully!`);
            console.log(`     Proxy Address: ${upgradedToken.target}`); // Target is the proxy address
            console.log(`     New Implementation Address: ${newImplementationAddress}`);

        } catch (error) {
            console.error(`  ❌ Error upgrading ${tokenInfo.name}:`, error.message);
        }
    }

    console.log("\n--- Proxy upgrade script finished ---");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });