# 🚀 ZiG Ecosystem Deployment Order

## 📋 Quick Deployment Commands

### For New Network Deployment:

```bash
# 1. Deploy all contracts
npx hardhat run scripts/deploy-circular.js --network <NETWORK_NAME>

# 2. Set up contract relationships
npx hardhat run scripts/setup-contract-relationships.js --network <NETWORK_NAME>

# 3. Update oracle prices
python3 update_oracle.py

# 4. Check configuration
npx hardhat run scripts/check-contract-configuration.js --network <NETWORK_NAME>

# 5. Test user onboarding
npx hardhat run scripts/user-onboarding.js --network <NETWORK_NAME>
```

## 🌐 Available Networks

### Current (Working):
- **polygon_zkevm** ✅ (Already deployed and working)

### Ready to Deploy:
- **base** - Coinbase L2
- **celo** - Mobile-first blockchain
- **skale** - Zero gas fees
- **zero** - Zero Network
- **sophon** - Sophon Network
- **vite** - Vite Network
- **oasis** - Oasis Network
- **iota_evm** - IOTA EVM

## 📊 Example Deployments

### Deploy to Base:
```bash
npx hardhat run scripts/deploy-circular.js --network base
npx hardhat run scripts/setup-contract-relationships.js --network base
python3 update_oracle.py
npx hardhat run scripts/check-contract-configuration.js --network base
npx hardhat run scripts/user-onboarding.js --network base
```

### Deploy to Celo:
```bash
npx hardhat run scripts/deploy-circular.js --network celo
npx hardhat run scripts/setup-contract-relationships.js --network celo
python3 update_oracle.py
npx hardhat run scripts/check-contract-configuration.js --network celo
npx hardhat run scripts/user-onboarding.js --network celo
```

## 🔧 Troubleshooting

### If deployment fails:
```bash
# Check configuration
npx hardhat run scripts/check-contract-configuration.js --network <NETWORK_NAME>

# Fix critical issues
npx hardhat run scripts/fix-critical-issues.js --network <NETWORK_NAME>

# Fix minor issues
npx hardhat run scripts/fix-minor-issues-final.js --network <NETWORK_NAME>
```

### If oracle prices are stale:
```bash
# Update oracle prices
python3 update_oracle.py

# Check oracle prices
npx hardhat run scripts/check-oracle-prices.js --network <NETWORK_NAME>
```

## ✅ Success Indicators

After deployment, you should see:
- ✅ All contracts deployed successfully
- ✅ Contract relationships configured
- ✅ Oracle prices updated
- ✅ User onboarding working
- ✅ All token types minting correctly
- ✅ Regional stablecoins active
- ✅ DAO governance functional

## 🎯 Recommended Order

1. **Base** (Recommended next - growing ecosystem)
2. **Celo** (Mobile-first, good adoption)
3. **SKALE** (Zero gas fees)
4. **Other networks** as needed

The ZiG ecosystem is production-ready! 🚀 