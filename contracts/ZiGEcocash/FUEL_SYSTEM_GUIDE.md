# ZiG Fuel System Guide

## 🚀 Overview

The ZiG Fuel System uses `ZiGUtilityToken` (ERC1155) as fuel for all ecosystem operations. This creates a sustainable economic model where users pay for services with utility tokens, which are then burned to prevent inflation.

## ⛽ Fuel Token Types

### 1. Transaction Fee Token (ID: 1)
- **Purpose**: Basic operations and transfers
- **Usage**: Regional stablecoin transfers, basic DAO operations
- **Cost**: 5-10 tokens per operation

### 2. Governance Bonus Token (ID: 3)
- **Purpose**: DAO governance rewards and bonuses
- **Usage**: Proposal creation, voting, execution bonuses
- **Cost**: 10-20 tokens per operation

## 🔧 Fuel System Architecture

### Core Components

1. **ZiGUtilityToken** (ERC1155)
   - Multi-token standard for different fuel types
   - Burn functionality for fuel consumption
   - Minting capabilities for testing and rewards

2. **Fuel Consumers**
   - ReparationsDAO (Governance fuel)
   - RegionalStablecoins (Transfer fuel)
   - Oracle operations (Data fuel)

3. **Fuel Management**
   - Automatic burning on operation execution
   - Balance checking before operations
   - Permission system for fuel consumption

## 💰 Fuel Costs by Service

### DAO Governance Fuel

| Operation | Token Type | Cost | Description |
|-----------|------------|------|-------------|
| Create Proposal | Governance Bonus | 10 tokens | Submit new governance proposal |
| Vote | Governance Bonus | 5 tokens | Cast vote on proposal |
| Execute Proposal | Governance Bonus | 15 tokens | Execute approved proposal |
| Governance Bonus | Governance Bonus | 20 tokens | Award governance participation |

### Regional Stablecoins Fuel

| Operation | Token Type | Cost | Description |
|-----------|------------|------|-------------|
| Transfer | Transaction Fee | 5 tokens | Transfer regional stablecoins |
| Remittance | Transaction Fee | 10 tokens | Cross-border remittance |
| Mint | Transaction Fee | 15 tokens | Mint new regional stablecoins |
| Burn | Transaction Fee | 8 tokens | Burn regional stablecoins |

### Oracle Operations Fuel

| Operation | Token Type | Cost | Description |
|-----------|------------|------|-------------|
| Weight Adjustment | Governance Bonus | 10 tokens | Change oracle asset weights |
| Symbol Update | Governance Bonus | 5 tokens | Update asset symbols |
| Emergency Feed | Transaction Fee | 20 tokens | Emergency price feed update |

## 🏛️ DAO Governance Fuel System

### Proposal Creation
```solidity
function createProposal(
    string memory description,
    uint256 amount,
    address recipient
) external {
    // Burn governance bonus tokens
    _burnFuel(msg.sender, GOVERNANCE_BONUS_TOKEN, 10);
    
    // Create proposal logic
    // ...
}
```

### Voting
```solidity
function vote(uint256 proposalId, bool support) external {
    // Burn governance bonus tokens
    _burnFuel(msg.sender, GOVERNANCE_BONUS_TOKEN, 5);
    
    // Voting logic
    // ...
}
```

### Execution
```solidity
function executeProposal(uint256 proposalId) external {
    // Burn governance bonus tokens
    _burnFuel(msg.sender, GOVERNANCE_BONUS_TOKEN, 15);
    
    // Execution logic
    // ...
}
```

## 🌍 Regional Stablecoins Fuel System

### Transfer Operations
```solidity
function transfer(
    uint256 regionId,
    address to,
    uint256 amount
) external {
    // Burn transaction fee tokens
    _burnFuel(msg.sender, TRANSACTION_FEE_TOKEN, 5);
    
    // Transfer logic
    // ...
}
```

### Remittance Operations
```solidity
function remittance(
    uint256 regionId,
    address to,
    uint256 amount,
    string memory recipientName
) external {
    // Burn transaction fee tokens
    _burnFuel(msg.sender, TRANSACTION_FEE_TOKEN, 10);
    
    // Remittance logic with compliance
    // ...
}
```

## 🔮 Oracle Integration Fuel

### Weight Adjustments
```solidity
function setAssetWeight(
    string memory asset,
    uint256 weight
) external onlyDAO {
    // Burn governance bonus tokens
    _burnFuel(msg.sender, GOVERNANCE_BONUS_TOKEN, 10);
    
    // Weight adjustment logic
    // ...
}
```

## 🎯 Fuel System Benefits

### 1. Economic Sustainability
- **Token Burning**: Prevents inflation by burning fuel tokens
- **Value Accrual**: Utility token value increases with ecosystem usage
- **Sustainable Model**: Users pay for services they use

### 2. Governance Incentives
- **Participation Rewards**: Governance bonuses for active participation
- **Quality Control**: Fuel costs prevent spam proposals
- **Stakeholder Alignment**: Token holders benefit from ecosystem growth

### 3. Regional Development
- **Cross-Border Payments**: Fuel enables regional stablecoin transfers
- **Compliance**: Remittance fuel includes compliance features
- **Economic Integration**: Regional compositions with fuel costs

## 📊 Fuel Economics

### Token Distribution
```
Total Supply: 1,000,000 tokens per type
├── Transaction Fee Tokens: 60% (600,000)
├── Governance Bonus Tokens: 40% (400,000)
└── Reserved for Rewards: 10% (100,000)
```

### Burning Schedule
```
Daily Burn Rate: ~1,000 tokens
Monthly Burn Rate: ~30,000 tokens
Annual Burn Rate: ~360,000 tokens
```

### Value Accrual
- **Scarcity**: Burning reduces supply, increasing value
- **Utility**: High usage increases token demand
- **Governance**: DAO participation creates value

## 🧪 Testing Fuel System

### 1. Mint Test Tokens
```javascript
// Mint transaction fee tokens
await utilityToken.mint(
    user.address,
    1, // TRANSACTION_FEE_TOKEN
    1000, // 1000 tokens
    "0x"
);

// Mint governance bonus tokens
await utilityToken.mint(
    user.address,
    3, // GOVERNANCE_BONUS_TOKEN
    500, // 500 tokens
    "0x"
);
```

### 2. Test Fuel Consumption
```javascript
// Test DAO proposal creation
await dao.createProposal(
    "Test proposal",
    0,
    ethers.ZeroAddress
);

// Test regional stablecoin transfer
await regionalStablecoins.transfer(
    1, // NORTH_AFRICA
    recipient.address,
    ethers.parseEther("100")
);
```

### 3. Verify Token Burning
```javascript
// Check balance before operation
const balanceBefore = await utilityToken.balanceOf(
    user.address,
    1 // TRANSACTION_FEE_TOKEN
);

// Execute operation
await regionalStablecoins.transfer(/* ... */);

// Check balance after operation
const balanceAfter = await utilityToken.balanceOf(
    user.address,
    1 // TRANSACTION_FEE_TOKEN
);

// Verify tokens were burned
console.log("Tokens burned:", balanceBefore - balanceAfter);
```

## 🔍 Monitoring Fuel System

### Key Metrics
1. **Burn Rate**: Tokens burned per day/week/month
2. **Usage Patterns**: Which operations consume most fuel
3. **Token Distribution**: Balance distribution across users
4. **Economic Impact**: Token value changes over time

### Monitoring Tools
```javascript
// Get total burned tokens
const totalBurned = await utilityToken.totalBurned(1);

// Get user fuel balance
const userBalance = await utilityToken.balanceOf(user.address, 1);

// Get fuel costs for operation
const fuelCosts = await regionalStablecoins.getFuelCosts();
```

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Compile all contracts
- [ ] Set up environment variables
- [ ] Verify network configuration
- [ ] Test fuel system locally

### Deployment
- [ ] Deploy ZiGUtilityToken
- [ ] Deploy enhanced contracts with fuel integration
- [ ] Set up fuel permissions
- [ ] Test fuel consumption

### Post-Deployment
- [ ] Verify fuel system works
- [ ] Test all fuel-consuming operations
- [ ] Monitor burn rates
- [ ] Update frontend integration

## 📈 Future Enhancements

### 1. Dynamic Fuel Costs
- Adjust fuel costs based on network usage
- Implement congestion-based pricing
- Add seasonal fuel cost adjustments

### 2. Fuel Rewards
- Reward users for ecosystem participation
- Implement fuel staking mechanisms
- Add governance fuel bonuses

### 3. Cross-Chain Fuel
- Enable fuel usage across multiple chains
- Implement cross-chain fuel bridges
- Add fuel interoperability

### 4. Advanced Analytics
- Real-time fuel consumption tracking
- Predictive fuel cost modeling
- User behavior analytics

---

**🎯 Success Metrics**
- Sustainable burn rate maintained
- User adoption of fuel-based operations
- Token value appreciation over time
- Governance participation with fuel incentives
- Regional stablecoin adoption with fuel system 