# 🚀 ZiG Ecosystem Deployment Guide

## 📋 Pre-Deployment Checklist

### 1. Environment Setup
```bash
# Copy environment template
cp env.example .env

# Fill in your environment variables
PRIVATE_KEY=your_private_key_here
POLYGON_ZKEVM_RPC_URL=https://zkevm-rpc.com
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGON_ZKEVM_API_KEY=your_polygon_zkevm_api_key
```

### 2. Network Configuration
The system supports multiple networks:
- **Polygon zkEVM** (Current) - Zero gas fees, secure
- **Base** - Coinbase L2, growing ecosystem
- **Arbitrum One** - Fast, cheap transactions
- **Optimism** - Ethereum L2, high adoption
- **BSC** - High adoption, lower fees

## 🔧 Deployment Order

### Step 1: Deploy Core Contracts
```bash
# Deploy all contracts to the target network
npx hardhat run scripts/deploy-circular.js --network <NETWORK_NAME>
```

### Step 2: Update Oracle Prices
```bash
# Update all oracle prices with current market data
python3 update_oracle.py
```

### Step 3: Configure Contracts
```bash
# Set up contract relationships and permissions
npx hardhat run scripts/setup-contract-relationships.js --network <NETWORK_NAME>
```

### Step 4: Validate Configuration
```bash
# Check all contract configurations
npx hardhat run scripts/check-contract-configuration.js --network <NETWORK_NAME>
```

### Step 5: Test User Onboarding
```bash
# Test the complete user onboarding process
npx hardhat run scripts/user-onboarding.js --network <NETWORK_NAME>
```

## 🌐 Multi-Network Deployment

### Polygon zkEVM (Current)
```bash
# Already deployed and working
npx hardhat run scripts/check-contract-configuration.js --network polygon_zkevm
```

### Base Network
```bash
# Deploy to Base
npx hardhat run scripts/deploy-circular.js --network base
npx hardhat run scripts/setup-contract-relationships.js --network base
npx hardhat run scripts/check-contract-configuration.js --network base
```

### Arbitrum One
```bash
# Add to hardhat.config.js first, then deploy
npx hardhat run scripts/deploy-circular.js --network arbitrum
npx hardhat run scripts/setup-contract-relationships.js --network arbitrum
npx hardhat run scripts/check-contract-configuration.js --network arbitrum
```

### Optimism
```bash
# Add to hardhat.config.js first, then deploy
npx hardhat run scripts/deploy-circular.js --network optimism
npx hardhat run scripts/setup-contract-relationships.js --network optimism
npx hardhat run scripts/check-contract-configuration.js --network optimism
```

## 📊 Contract Verification

After deployment, verify contracts on block explorers:

```bash
# Verify on Polygon zkEVM
npx hardhat verify --network polygon_zkevm <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>

# Verify on Base
npx hardhat verify --network base <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## 🔍 Post-Deployment Validation

### 1. Configuration Check
```bash
npx hardhat run scripts/check-contract-configuration.js --network <NETWORK_NAME>
```

### 2. User Onboarding Test
```bash
npx hardhat run scripts/user-onboarding.js --network <NETWORK_NAME>
```

### 3. Oracle Price Check
```bash
npx hardhat run scripts/check-oracle-prices.js --network <NETWORK_NAME>
```

## 🛠️ Troubleshooting

### Common Issues:
1. **Gas Issues**: Some networks have different gas requirements
2. **Oracle Updates**: Ensure oracle prices are updated after deployment
3. **Contract Relationships**: Verify all contract addresses are correctly set

### Fix Scripts:
```bash
# Fix critical issues if needed
npx hardhat run scripts/fix-critical-issues.js --network <NETWORK_NAME>

# Fix minor issues
npx hardhat run scripts/fix-minor-issues-final.js --network <NETWORK_NAME>
```

## 📈 Production Readiness

### ✅ What's Working:
- ZiG token minting and transfers
- ZiGT stable token minting via Vault
- Oracle price feeds (BTCUSD, ETHUSD, etc.)
- Regional stablecoins (6 African regions)
- DAO governance and voting
- Soulbound identity tokens
- User onboarding process
- All utility token types

### ⚠️ Minor Issues:
- NFT minting (cosmetic, doesn't affect core functionality)

## 🎯 Recommended Deployment Order

1. **Polygon zkEVM** ✅ (Already deployed)
2. **Base** (Recommended next - growing ecosystem)
3. **Arbitrum One** (High adoption, low fees)
4. **Optimism** (Ethereum L2, established)
5. **BSC** (High adoption, lower fees)

## 🚀 Quick Start Commands

```bash
# For a new network deployment:
npx hardhat run scripts/deploy-circular.js --network <NETWORK>
python3 update_oracle.py
npx hardhat run scripts/setup-contract-relationships.js --network <NETWORK>
npx hardhat run scripts/check-contract-configuration.js --network <NETWORK>
npx hardhat run scripts/user-onboarding.js --network <NETWORK>
```

The ZiG ecosystem is production-ready and can be deployed to any EVM-compatible network! 🎉 