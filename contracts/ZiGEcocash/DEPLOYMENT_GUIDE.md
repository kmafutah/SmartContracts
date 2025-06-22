# 🚀 ZiGEcocash Multi-Network Deployment Guide

## 📋 Prerequisites

1. **Private Key**: You need a private key for deployment
2. **Environment Setup**: Create a `.env` file with your private key
3. **Network Access**: Ensure you can connect to the target networks

## 🔧 Setup Instructions

### 1. Create Environment File

Create a `.env` file in the root directory:

```bash
# Private key for deployment (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Optional: API keys for block explorers
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key
OPTIMISTIC_ETHERSCAN_API_KEY=your_optimistic_etherscan_api_key
BASESCAN_API_KEY=your_basescan_api_key
```

### 2. Install Dependencies

```bash
npm install
```

## 🌐 Available Networks

### Zero-Gas Networks (Recommended)

| Network | Description | Gas Fees | Command |
|---------|-------------|----------|---------|
| **SKALE** | Zero gas fees, high throughput | Free | `npx hardhat run scripts/deploy-full.js --network skale` |
| **IOTA EVM** | Zero gas fees, feeless transactions | Free | `npx hardhat run scripts/deploy-full.js --network iota` |

### Low-Cost Networks

| Network | Description | Gas Fees | Command |
|---------|-------------|----------|---------|
| **Polygon zkEVM** | Very low gas, ZK rollup | ~$0.01-0.05 | `npx hardhat run scripts/deploy-full.js --network polygon_zkevm` |
| **Base** | Low gas, Coinbase L2 | ~$0.01-0.05 | `npx hardhat run scripts/deploy-full.js --network base` |
| **Arbitrum One** | Low gas, optimistic rollup | ~$0.01-0.05 | `npx hardhat run scripts/deploy-full.js --network arbitrum` |
| **Optimism** | Low gas, optimistic rollup | ~$0.01-0.05 | `npx hardhat run scripts/deploy-full.js --network optimism` |
| **Mantle** | Low gas, modular L2 | ~$0.01-0.05 | `npx hardhat run scripts/deploy-full.js --network mantle` |
| **Scroll** | Low gas, ZK rollup | ~$0.01-0.05 | `npx hardhat run scripts/deploy-full.js --network scroll` |
| **Linea** | Low gas, ZK rollup | ~$0.01-0.05 | `npx hardhat run scripts/deploy-full.js --network linea` |
| **Polygon** | Low gas, sidechain | ~$0.01-0.05 | `npx hardhat run scripts/deploy-full.js --network polygon` |

## 🚀 Deployment Commands

### Quick Start (Zero-Gas Networks)

```bash
# Deploy to SKALE (completely free)
npx hardhat run scripts/deploy-full.js --network skale

# Deploy to IOTA EVM (completely free)
npx hardhat run scripts/deploy-full.js --network iota
```

### Low-Cost Networks (Need ETH for gas)

```bash
# Deploy to Polygon zkEVM
npx hardhat run scripts/deploy-full.js --network polygon_zkevm

# Deploy to Base
npx hardhat run scripts/deploy-full.js --network base

# Deploy to Arbitrum
npx hardhat run scripts/deploy-full.js --network arbitrum

# Deploy to Optimism
npx hardhat run scripts/deploy-full.js --network optimism

# Deploy to Mantle
npx hardhat run scripts/deploy-full.js --network mantle

# Deploy to Scroll
npx hardhat run scripts/deploy-full.js --network scroll

# Deploy to Linea
npx hardhat run scripts/deploy-full.js --network linea

# Deploy to Polygon
npx hardhat run scripts/deploy-full.js --network polygon
```

## 📊 What Gets Deployed

The `deploy-full.js` script deploys the **ENTIRE ZiGEcocash ecosystem**:

### Phase 1: Core Economic Infrastructure
- ✅ ZiGOracleHub
- ✅ Vault  
- ✅ ZiGT (Zimbabwe Gold Token)
- ✅ ZiG (Main stablecoin)
- ✅ ZiGWallet

### Phase 2: Identity & Governance
- ✅ ZiGSoulboundToken
- ✅ AccessVerifier
- ✅ EthicalGuard
- ✅ ReparationsDAO
- ✅ ZiGGovernanceToken

### Phase 3: Cultural & Utility Layer
- ✅ SoulReparationNFT
- ✅ ZiGNFT
- ✅ ZiGRWAToken
- ✅ ZiGUtilityToken
- ✅ ZiGMemeToken

### Phase 4: GameFi Expansion
- ✅ ZiGGameFiToken
- ✅ ZiGBondingCurve

## 💰 Funding Requirements

### Zero-Gas Networks
- **SKALE**: No ETH needed
- **IOTA EVM**: No ETH needed

### Low-Cost Networks
- **Polygon zkEVM**: ~0.01-0.05 ETH for gas
- **Base**: ~0.01-0.05 ETH for gas
- **Arbitrum**: ~0.01-0.05 ETH for gas
- **Optimism**: ~0.01-0.05 ETH for gas
- **Mantle**: ~0.01-0.05 ETH for gas
- **Scroll**: ~0.01-0.05 ETH for gas
- **Linea**: ~0.01-0.05 ETH for gas
- **Polygon**: ~0.01-0.05 ETH for gas

## 🔍 Post-Deployment

After successful deployment:

1. **Check deployment-addresses.json** for all contract addresses
2. **Verify contracts** on block explorers
3. **Test interactions** using `scripts/interact.js`
4. **Set up oracles** and governance parameters

## 🛠️ Troubleshooting

### Common Issues

1. **"No deployer account found"**
   - Check your `.env` file has `PRIVATE_KEY`
   - Ensure private key doesn't start with `0x`

2. **"Insufficient funds"**
   - For zero-gas networks: This is normal
   - For other networks: Add ETH to your account

3. **"Network connection failed"**
   - Check internet connection
   - Verify RPC endpoints in `hardhat.config.js`

4. **"Contract deployment failed"**
   - Check constructor parameters
   - Verify contract dependencies

### Getting Help

- Check the deployment logs for specific error messages
- Verify your private key is correct
- Ensure you have sufficient balance for gas fees (if applicable)

## 🎯 Recommended Deployment Order

1. **Start with SKALE** (zero gas, easy testing)
2. **Then IOTA EVM** (zero gas, feeless)
3. **Then Polygon zkEVM** (very low gas)
4. **Then other L2s** as needed

## 📈 Network Comparison

| Feature | SKALE | IOTA | Polygon zkEVM | Base | Arbitrum |
|---------|-------|------|---------------|------|----------|
| Gas Fees | Free | Free | Very Low | Low | Low |
| Speed | Fast | Fast | Very Fast | Fast | Fast |
| Security | High | High | Very High | High | High |
| Ecosystem | Growing | Growing | Large | Large | Large |
| Developer Support | Good | Good | Excellent | Excellent | Excellent |

Choose the network that best fits your needs! 