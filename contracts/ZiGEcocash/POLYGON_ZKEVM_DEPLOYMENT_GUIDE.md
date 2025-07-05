# Polygon zkEVM Deployment Guide

## 🚀 Overview

This guide covers deploying the complete ZiG Ecosystem to Polygon zkEVM, including the new fuel system and regional stablecoins with remittance functionality.

## 📋 Prerequisites

1. **Environment Setup**
   ```bash
   # Install dependencies
   npm install
   
   # Set up environment variables
   cp env.example .env
   ```

2. **Required Environment Variables**
   ```bash
   # Polygon zkEVM Configuration
   POLYGON_ZKEVM_RPC_URL=https://rpc.public.zkevm-test.net
   POLYGON_ZKEVM_API_KEY=your_polygon_zkevm_api_key
   PRIVATE_KEY=your_deployer_private_key
   
   # Optional: For contract verification
   POLYGONSCAN_API_KEY=your_polygonscan_api_key
   ```

3. **Network Configuration**
   - Ensure your `hardhat.config.js` includes Polygon zkEVM network
   - Verify RPC URL and API keys are correct
   - Ensure deployer account has sufficient testnet ETH

## 🔧 Deployment Steps

### Step 1: Compile Contracts
```bash
npx hardhat compile
```

### Step 2: Deploy to Polygon zkEVM
```bash
# Deploy all contracts with fuel system
npx hardhat run scripts/deploy-polygon-zkevm.js --network polygon_zkevm
```

This will deploy:
- ✅ ZiGUtilityToken (Fuel System)
- ✅ ZiGOracleHub (Enhanced with DAO Integration)
- ✅ ReparationsDAO (Fuel-Enabled Governance)
- ✅ RegionalStablecoins (Remittance System)

### Step 3: Verify Contracts
```bash
# Verify all contracts on block explorer
npx hardhat run scripts/verify-polygon-zkevm.js --network polygon_zkevm
```

## 🏗️ Contract Architecture

### 1. ZiGUtilityToken (Fuel System)
- **Purpose**: Multi-token fuel system for ecosystem operations
- **Token Types**:
  - `TRANSACTION_FEE_TOKEN` (ID: 1) - For transfers and basic operations
  - `GOVERNANCE_BONUS_TOKEN` (ID: 3) - For DAO governance rewards
- **Features**:
  - ERC1155 multi-token standard
  - Burn functionality for fuel consumption
  - Minting capabilities for testing

### 2. ZiGOracleHub (Enhanced)
- **Purpose**: Multi-source oracle with DAO governance
- **Features**:
  - Multi-source price feeds with fallback
  - DAO-controlled asset weights and symbols
  - Emergency feed system
  - Batch update capabilities
- **DAO Integration**:
  - Weight adjustment through governance
  - Symbol modification capabilities
  - Access control for oracle parameters

### 3. ReparationsDAO (Fuel-Enabled)
- **Purpose**: Governance with fuel-based operations
- **Fuel Requirements**:
  - Proposal creation: 10 utility tokens
  - Voting: 5 utility tokens
  - Execution: 15 utility tokens
  - Governance bonuses: 20 utility tokens
- **Features**:
  - African verification system
  - Voting power management
  - Proposal lifecycle management

### 4. RegionalStablecoins (New)
- **Purpose**: Cross-border payments with regional compositions
- **Regions**:
  - North Africa (NAS): 50% Crypto, 30% Metal, 20% Fiat
  - West Africa (WAS): 40% Crypto, 35% Metal, 25% Fiat
  - Central Africa (CAS): 35% Crypto, 45% Metal, 20% Fiat
  - East Africa (EAS): 45% Crypto, 30% Metal, 25% Fiat
  - Southern Africa (SAS): 35% Crypto, 30% Metal, 35% Fiat
  - Horn of Africa (HAS): 50% Crypto, 20% Metal, 30% Fiat

- **Fuel Costs**:
  - Transfer: 5 utility tokens
  - Remittance: 10 utility tokens
  - Mint: 15 utility tokens
  - Burn: 8 utility tokens

## 🎯 Key Features

### Fuel System Integration
1. **DAO Governance Fuel**
   - All governance actions require utility token burning
   - Automatic fuel consumption on proposal creation
   - Voting requires fuel payment
   - Execution burns additional fuel

2. **Regional Stablecoins Fuel**
   - Transfer operations consume fuel
   - Remittance includes compliance features
   - Minting and burning require fuel
   - Cross-regional operations supported

### Remittance System
1. **Compliance Features**
   - Recipient name tracking
   - Regional composition tracking
   - Fuel-based fee structure
   - Cross-border transaction logging

2. **Regional Compositions**
   - Each region has unique asset mix
   - Crypto, metal, and fiat weightings
   - Oracle-based price feeds
   - Regional economic considerations

## 🧪 Testing Deployment

### 1. Fuel System Test
```javascript
// Test utility token minting
const mintTx = await utilityToken.mint(
    deployer.address,
    1, // TRANSACTION_FEE_TOKEN
    10000, // 10000 tokens
    "0x" // Empty bytes
);

// Test DAO proposal creation (requires fuel)
const proposalTx = await dao.createProposal(
    "Test proposal for oracle weight adjustment",
    0, // no amount for oracle adjustments
    ethers.ZeroAddress // no recipient for oracle adjustments
);
```

### 2. Regional Stablecoins Test
```javascript
// Test regional stablecoin minting
const mintRegionalTx = await regionalStablecoins.mint(
    1, // NORTH_AFRICA
    deployer.address,
    ethers.parseEther("1000") // 1000 tokens
);

// Test remittance
const remittanceTx = await regionalStablecoins.remittance(
    2, // WEST_AFRICA
    deployer.address, // to self for testing
    ethers.parseEther("50"), // 50 tokens
    "Test Recipient" // recipient name
);
```

### 3. Oracle Integration Test
```javascript
// Test oracle weight adjustment (requires DAO proposal)
const weightTx = await oracleHub.setAssetWeight(
    "ETH/USD",
    60 // 60% weight
);
```

## 📊 Deployment Verification

### 1. Check Contract Addresses
After deployment, verify all contracts are deployed:
```bash
cat deployment-polygon-zkevm.json
```

### 2. Verify Fuel System
- Check utility token balances
- Verify DAO can burn tokens
- Test proposal creation with fuel

### 3. Verify Regional Stablecoins
- Check regional compositions
- Verify fuel costs
- Test remittance functionality

### 4. Verify Oracle Integration
- Check DAO address in oracle hub
- Verify weight adjustment permissions
- Test multi-source price feeds

## 🔍 Troubleshooting

### Common Issues

1. **Insufficient Fuel Balance**
   ```
   Error: Insufficient utility token balance
   Solution: Mint more utility tokens to the account
   ```

2. **DAO Permission Denied**
   ```
   Error: Only DAO can call this function
   Solution: Ensure DAO address is set in oracle hub
   ```

3. **Regional Stablecoin Not Active**
   ```
   Error: Regional stablecoin not active
   Solution: Check if the region is properly initialized
   ```

4. **Oracle Feed Unavailable**
   ```
   Error: No price feed available
   Solution: Check oracle hub configuration and fallback feeds
   ```

### Debug Commands

```bash
# Check contract balances
npx hardhat run scripts/check-balance.js --network polygon_zkevm

# Debug vault minting
npx hardhat run scripts/debug-vault-minting.js --network polygon_zkevm

# Test oracle feeds
npx hardhat run scripts/test-oracle-feeds.js --network polygon_zkevm
```

## 🎉 Post-Deployment

### 1. Frontend Integration
- Update contract addresses in `frontend/lib/contracts.ts`
- Test regional stablecoins page
- Verify fuel system integration

### 2. Documentation Updates
- Update deployment addresses
- Document new fuel costs
- Add regional compositions guide

### 3. Testing Checklist
- [ ] Fuel system works correctly
- [ ] DAO governance with fuel
- [ ] Regional stablecoins minting
- [ ] Remittance functionality
- [ ] Oracle weight adjustments
- [ ] Cross-regional transfers

## 📈 Next Steps

1. **Production Deployment**
   - Deploy to Polygon zkEVM mainnet
   - Set up monitoring and alerts
   - Configure production oracles

2. **Frontend Enhancements**
   - Add regional stablecoins dashboard
   - Implement fuel cost calculator
   - Add remittance tracking

3. **Governance Setup**
   - Initialize DAO with real members
   - Set up proposal templates
   - Configure governance parameters

4. **Integration Testing**
   - Test with real wallets
   - Verify cross-chain compatibility
   - Stress test fuel system

---

**🎯 Success Criteria**
- All contracts deployed and verified
- Fuel system operational
- Regional stablecoins functional
- DAO governance working
- Oracle integration complete
- Frontend accessible and functional 