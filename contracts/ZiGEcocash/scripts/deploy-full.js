require("@openzeppelin/hardhat-upgrades");
const {ethers, upgrades} = require('hardhat')
const fs = require('fs')
const path = require('path')

async function main() {
    console.log('🚀 Starting Full ZiGEcocash deployment...')

    const [deployer] = await ethers.getSigners();

    if (!deployer) {
        console.error(
            '❌ No deployer account found. Please set PRIVATE_KEY in .env file'
        )
        process.exit(1)
    }

    // Get network name for filename
    const network = await ethers.provider.getNetwork()
    const networkName = network.name === 'unknown' ? 'localhost' : network.name

    console.log('Deploying contracts with account:', deployer.address)
    console.log('Network:', networkName)
    console.log(
        'Account balance:',
        (await ethers.provider.getBalance(deployer.address)).toString()
    )

    const deploymentAddresses = {
        network: networkName,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
    }

    try {
        // Phase 1: Core Economic Infrastructure
        console.log('\n📊 Phase 1: Core Economic Infrastructure')

        // ZiGOracleHub
        console.log('Deploying ZiGOracleHub...')
        const ZiGOracleHub = await ethers.getContractFactory('ZiGOracleHub')
        const oracleHub = await ZiGOracleHub.deploy(deployer.address)
        await oracleHub.waitForDeployment()
        deploymentAddresses.ZiGOracleHub = await oracleHub.getAddress()
        console.log('✅ ZiGOracleHub:', await oracleHub.getAddress())

        // ZiG (deploy before Vault since Vault needs ZiG address)
        console.log('Deploying ZiG...')
        const ZiG = await ethers.getContractFactory('ZiG')
        const zig = await ZiG.deploy(ethers.parseUnits('1', 18)) // 1 mg of gold per token
        await zig.waitForDeployment()
        deploymentAddresses.ZiG = await zig.getAddress()
        console.log('✅ ZiG:', await zig.getAddress())

        // Vault (deploy with placeholder ZiGT address, will update later)
        console.log('Deploying Vault...')
        const Vault = await ethers.getContractFactory('Vault')
        const vault = await Vault.deploy(
            await zig.getAddress(), // zigToken
            deployer.address, // treasury
            deployer.address, // futureReserve
            deployer.address, // diasporaFund
            await zig.getAddress(), // zigAddress
            ethers.ZeroAddress, // placeholder zigtAddress
            await oracleHub.getAddress(), // oracleHubAddress
            deployer.address // paxgAddress (using deployer as placeholder for local testing)
        )
        await vault.waitForDeployment()
        deploymentAddresses.Vault = await vault.getAddress()
        console.log('✅ Vault:', await vault.getAddress())

        // ZiGT
        console.log('Deploying ZiGT...')
        const ZiGT = await ethers.getContractFactory('ZiGT')
        const zigT = await ZiGT.deploy(
            await vault.getAddress(),
            await oracleHub.getAddress()
        )
        await zigT.waitForDeployment()
        deploymentAddresses.ZiGT = await zigT.getAddress()
        console.log('✅ ZiGT:', await zigT.getAddress())

        // Update Vault with real ZiGT address
        console.log('Updating Vault with ZiGT address...')
        const updateVaultTx = await vault.setZiGT(await zigT.getAddress())
        await updateVaultTx.wait()
        console.log('✅ Vault updated with ZiGT address')

        // ZiGWallet
        console.log('Deploying ZiGWallet...')
        const ZiGWallet = await ethers.getContractFactory('ZiGWallet')
        const zigWallet = await ZiGWallet.deploy(deployer.address)
        await zigWallet.waitForDeployment()
        deploymentAddresses.ZiGWallet = await zigWallet.getAddress()
        console.log('✅ ZiGWallet:', await zigWallet.getAddress())

        // Phase 2: Identity & Governance
        console.log('\n🆔 Phase 2: Identity & Governance')

        // ZiGSoulboundToken
        console.log('Deploying ZiGSoulboundToken...')
        const ZiGSoulboundToken = await ethers.getContractFactory(
            'ZiGSoulboundToken'
        )
        const soulboundToken = await ZiGSoulboundToken.deploy()
        await soulboundToken.waitForDeployment()
        deploymentAddresses.ZiGSoulboundToken =
            await soulboundToken.getAddress()
        console.log('✅ ZiGSoulboundToken:', await soulboundToken.getAddress())

        // AccessVerifier
        console.log('Deploying AccessVerifier...')
        const AccessVerifier = await ethers.getContractFactory(
            'contracts/governance_identity_soulbound_statehood/AccessVerifier.sol:AccessVerifier'
        )
        const accessVerifier = await AccessVerifier.deploy(
            await soulboundToken.getAddress()
        )
        await accessVerifier.waitForDeployment()
        deploymentAddresses.AccessVerifier = await accessVerifier.getAddress()
        console.log('✅ AccessVerifier:', await accessVerifier.getAddress())

        // EthicalGuard
        console.log('Deploying EthicalGuard...')
        const EthicalGuard = await ethers.getContractFactory('EthicalGuard')
        const ethicalGuard = await EthicalGuard.deploy(
            deployer.address,
            await accessVerifier.getAddress()
        )
        await ethicalGuard.waitForDeployment()
        deploymentAddresses.EthicalGuard = await ethicalGuard.getAddress()
        console.log('✅ EthicalGuard:', await ethicalGuard.getAddress())

        // ZiGGovernanceToken
        console.log('Deploying ZiGGovernanceToken...')
        const ZiGGovernanceToken = await ethers.getContractFactory('ZiGGovernanceToken')
        const governanceToken = await ZiGGovernanceToken.deploy(
            1000000000000000000000000n // Example max supply, adjust as needed
        )
        await governanceToken.waitForDeployment()
        deploymentAddresses.ZiGGovernanceToken = await governanceToken.getAddress()
        console.log('✅ ZiGGovernanceToken:', await governanceToken.getAddress())

        // ZiGUtilityToken
        console.log('Deploying ZiGUtilityToken...')
        const ZiGUtilityToken = await ethers.getContractFactory('ZiGUtilityToken')
        const utilityToken = await ZiGUtilityToken.deploy()
        await utilityToken.waitForDeployment()
        deploymentAddresses.ZiGUtilityToken = await utilityToken.getAddress()
        console.log('✅ ZiGUtilityToken:', await utilityToken.getAddress())

        // ReparationsDAO
        console.log('Deploying ReparationsDAO...')
        const ReparationsDAO = await ethers.getContractFactory('ReparationsDAO')
        const reparationsDAO = await ReparationsDAO.deploy(
            deployer.address, // _initialOwner
            await governanceToken.getAddress(), // _governanceToken
            await ethicalGuard.getAddress(), // _ethicalGuard
            await soulboundToken.getAddress(), // _reparationNFT
            await utilityToken.getAddress() // _utilityToken
        )
        await reparationsDAO.waitForDeployment()
        deploymentAddresses.ReparationsDAO = await reparationsDAO.getAddress()
        console.log('✅ ReparationsDAO:', await reparationsDAO.getAddress())

        // Phase 3: Cultural & Utility Layer
        console.log('\n🎭 Phase 3: Cultural & Utility Layer')

        // SoulReparationNFT
        console.log('Deploying SoulReparationNFT...')
        const SoulReparationNFT = await ethers.getContractFactory(
            'SoulReparationNFT'
        )
        const soulReparationNFT = await SoulReparationNFT.deploy(
            await reparationsDAO.getAddress()
        )
        await soulReparationNFT.waitForDeployment()
        deploymentAddresses.SoulReparationNFT =
            await soulReparationNFT.getAddress()
        console.log(
            '✅ SoulReparationNFT:',
            await soulReparationNFT.getAddress()
        )

        // ZiGNFT
        console.log('Deploying ZiGNFT...')
        const ZiGNFT = await ethers.getContractFactory('ZiGNFT')
        const zigNFT = await ZiGNFT.deploy()
        await zigNFT.waitForDeployment()
        deploymentAddresses.ZiGNFT = await zigNFT.getAddress()
        console.log('✅ ZiGNFT:', await zigNFT.getAddress())

        // ZiGRWAToken
        console.log('Deploying ZiGRWAToken...')
        const ZiGRWAToken = await ethers.getContractFactory('ZiGRWAToken')
        const rwaToken = await ZiGRWAToken.deploy()
        await rwaToken.waitForDeployment()
        deploymentAddresses.ZiGRWAToken = await rwaToken.getAddress()
        console.log('✅ ZiGRWAToken:', await rwaToken.getAddress())

        // ZiGMemeToken
        console.log('Deploying ZiGMemeToken...')
        const ZiGMemeToken = await ethers.getContractFactory('ZiGMemeToken')
        const memeToken = await ZiGMemeToken.deploy()
        await memeToken.waitForDeployment()
        deploymentAddresses.ZiGMemeToken = await memeToken.getAddress()
        console.log('✅ ZiGMemeToken:', await memeToken.getAddress())

        // Phase 4: GameFi Expansion
        console.log('\n🎮 Phase 4: GameFi Expansion')

        // ZiGGameFiToken
        console.log('Deploying ZiGGameFiToken...')
        const ZiGGameFiToken = await ethers.getContractFactory('ZiGGameFiToken')
        const gameFiToken = await ZiGGameFiToken.deploy()
        await gameFiToken.waitForDeployment()
        deploymentAddresses.ZiGGameFiToken = await gameFiToken.getAddress()
        console.log('✅ ZiGGameFiToken:', await gameFiToken.getAddress())

        // ZiGBondingCurve
        console.log('Deploying ZiGBondingCurve...')
        const ZiGBondingCurve = await ethers.getContractFactory(
            'ZiGBondingCurve'
        )
        const bondingCurve = await ZiGBondingCurve.deploy()
        await bondingCurve.waitForDeployment()
        deploymentAddresses.ZiGBondingCurve = await bondingCurve.getAddress()
        console.log('✅ ZiGBondingCurve:', await bondingCurve.getAddress())

        // Phase 5: Oracles & Registry
        console.log('\n🔮 Phase 5: Oracles & Registry')

        // FeedRegistry (UUPS upgradable, deploy with proxy)
        console.log('Deploying FeedRegistry (UUPS proxy)...')
        const FeedRegistry = await ethers.getContractFactory('FeedRegistry')
        const feedRegistry = await upgrades.deployProxy(FeedRegistry, [], { kind: 'uups' })
        await feedRegistry.waitForDeployment()
        deploymentAddresses.FeedRegistry = await feedRegistry.getAddress()
        console.log('✅ FeedRegistry:', await feedRegistry.getAddress())

        // BandFeedRegistry (UUPS upgradable, deploy with proxy and owner)
        console.log('Deploying BandFeedRegistry (UUPS proxy)...')
        const BandFeedRegistry = await ethers.getContractFactory('BandFeedRegistry')
        const bandFeedRegistry = await upgrades.deployProxy(BandFeedRegistry, [deployer.address], { kind: 'uups' })
        await bandFeedRegistry.waitForDeployment()
        deploymentAddresses.BandFeedRegistry = await bandFeedRegistry.getAddress()
        console.log('✅ BandFeedRegistry:', await bandFeedRegistry.getAddress())

        // LiveBandFeed (no constructor args)
        console.log('Deploying LiveBandFeed...')
        const LiveBandFeed = await ethers.getContractFactory('LiveBandFeed')
        const liveBandFeed = await LiveBandFeed.deploy()
        await liveBandFeed.waitForDeployment()
        deploymentAddresses.LiveBandFeed = await liveBandFeed.getAddress()
        console.log('✅ LiveBandFeed:', await liveBandFeed.getAddress())

        // MultiOracle (no constructor args)
        console.log('Deploying MultiOracle...')
        const MultiOracle = await ethers.getContractFactory('MultiOracle')
        const multiOracle = await MultiOracle.deploy()
        await multiOracle.waitForDeployment()
        deploymentAddresses.MultiOracle = await multiOracle.getAddress()
        console.log('✅ MultiOracle:', await multiOracle.getAddress())

        // OracleValidator (needs oracleHub and owner)
        console.log('Deploying OracleValidator...')
        const OracleValidator = await ethers.getContractFactory('OracleValidator')
        const oracleValidator = await OracleValidator.deploy(
            await oracleHub.getAddress(),
            deployer.address
        )
        await oracleValidator.waitForDeployment()
        deploymentAddresses.OracleValidator = await oracleValidator.getAddress()
        console.log('✅ OracleValidator:', await oracleValidator.getAddress())

        // OracleAggregator (needs owner)
        console.log('Deploying OracleAggregator...')
        const OracleAggregator = await ethers.getContractFactory('OracleAggregator')
        const oracleAggregator = await OracleAggregator.deploy(deployer.address)
        await oracleAggregator.waitForDeployment()
        deploymentAddresses.OracleAggregator = await oracleAggregator.getAddress()
        console.log('✅ OracleAggregator:', await oracleAggregator.getAddress())

        // OracleHealthMonitor (needs oracleHub and owner)
        console.log('Deploying OracleHealthMonitor...')
        const OracleHealthMonitor = await ethers.getContractFactory('OracleHealthMonitor')
        const oracleHealthMonitor = await OracleHealthMonitor.deploy(
            await oracleHub.getAddress(),
            deployer.address
        )
        await oracleHealthMonitor.waitForDeployment()
        deploymentAddresses.OracleHealthMonitor = await oracleHealthMonitor.getAddress()
        console.log('✅ OracleHealthMonitor:', await oracleHealthMonitor.getAddress())

        // RegionalStablecoins (needs utilityToken, oracleHub, dao)
        console.log('Deploying RegionalStablecoins...')
        const RegionalStablecoins = await ethers.getContractFactory('RegionalStablecoins')
        const regionalStablecoins = await RegionalStablecoins.deploy(
            await utilityToken.getAddress(),
            await oracleHub.getAddress(),
            await reparationsDAO.getAddress()
        )
        await regionalStablecoins.waitForDeployment()
        deploymentAddresses.RegionalStablecoins = await regionalStablecoins.getAddress()
        console.log('✅ RegionalStablecoins:', await regionalStablecoins.getAddress())

        // Save deployment addresses
        const deploymentPath = path.join(
            __dirname,
            `../deployment-addresses-${networkName}.json`
        )
        fs.writeFileSync(
            deploymentPath,
            JSON.stringify(deploymentAddresses, null, 2)
        )

        console.log('\n🎉 Full deployment completed successfully!')
        console.log(
            `📄 Deployment addresses saved to: deployment-addresses-${networkName}.json`
        )

        // Print summary
        console.log('\n📋 Deployment Summary:')
        console.log('========================')
        console.log(`Network: ${networkName}`)
        console.log(`Deployer: ${deployer.address}`)
        console.log(`Timestamp: ${deploymentAddresses.timestamp}`)
        console.log('------------------------')
        Object.entries(deploymentAddresses).forEach(([key, value]) => {
            if (
                key !== 'network' &&
                key !== 'deployer' &&
                key !== 'timestamp'
            ) {
                console.log(`${key}: ${value}`)
            }
        })

        console.log('\n🔗 Next Steps:')
        console.log('1. Verify contracts on block explorer')
        console.log('2. Set up proper oracle price feeds')
        console.log('3. Configure DAO governance parameters')
        console.log('4. Test all contract interactions')
        console.log('5. Deploy to mainnet when ready')
    } catch (error) {
        console.error('❌ Deployment failed:', error)
        throw error
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
