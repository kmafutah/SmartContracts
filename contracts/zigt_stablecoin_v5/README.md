```
contracts/
├── core/
│   ├── ZiGT.sol                    # Main ERC20-compliant stablecoin contract
│   ├── ZiGTVariant.sol             # Base class for all variants (Gold, Crypto, Fiat)
│   └── ZiGAccessVerifier.sol       # Access control: onlyOracles, onlyGovernance
│
├── oracle/
│   ├── FeedRegistry.sol            # Maps feeds for BTCUSD, XAUUSD, etc.
│   ├── BandOracleAdapter.sol       # Integrates Band Protocol price feeds
│   ├── FallbackOracle.sol          # Triangulates via XOF/ZAR if a main feed fails
│
├── logic/
│   ├── ZiGBondingCurve.sol         # Dynamic pricing mechanism for mint/burn
│   └── ReparationsModel.sol        # Maps historical injustice to symbolic value
│
├── treasury/
│   ├── RedistributionVault.sol     # Collects fees, rebases, surpluses
│   └── ZiGTReserveManager.sol      # Tracks reserves and collateralisation ratios
│
├── crosschain/
│   └── ZiGCrossChainBridge.sol     # CCIP-compatible bridge wrapper for SKALE
│
└── governance/
    └── ZiGGovernance.sol           # Proposal, voting, execution (DAO logic)

scripts/
├── deploy-ZiGT.ts                 # Deploys core token and base logic
├── setup-oracles.ts              # Registers oracles and fallback chains
├── deploy-variants.ts            # Deploys ZiGT_Gold, ZiGT_Crypto, etc.
├── setup-bondingcurve.ts         # Configures minting curve rules
└── fund-reserves.ts              # Adds initial liquidity/reserve collateral

test/
├── ZiGT.test.ts
├── BondingCurve.test.ts
├── ReparationsModel.test.ts
└── OraclesFallback.test.ts

frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── MintForm.tsx
│   │   ├── RedeemForm.tsx
│   │   ├── OracleStatus.tsx
│   ├── pages/
│   │   └── Dashboard.tsx
│   ├── hooks/
│   │   └── useZiGTPrice.ts         # Fetches oracle-based price
│   └── config.ts                   # Network, contract addresses
├── vite.config.ts
└── package.json

data/
├── aggregator/
│   ├── fetchOpenExchangeRates.ts
│   ├── fetchRBZData.ts
│   └── fetchChainlinkData.ts
├── normaliser/
│   └── calculateZiGTIndex.ts       # Executes the ZiGT basket formula
├── api/
│   └── pushToSmartContract.ts
└── deploy/
    └── railway/                    # Serverless backend deployment

```