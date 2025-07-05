```txt
                ┌─────────────┐
                │ SoulID      │ ←– ZK Identity Layer
                └────┬────────┘
                     │
          ┌──────────▼──────────┐
          │ EthicalGuard        │ ←– Checks claims against Pan-African values
          └──────────┬──────────┘
                     │
     ┌───────────────▼────────────────┐
     │        ReparationsDAO          │ ←– Governance: 51% African vote weight
     └─────┬────────────┬─────────────┘
           │            │
   ┌───────▼──────┐ ┌────▼───────────┐
   │ ZiGT (Stable)│ │ ZiGOracleHub   │ ←– Chainlink + Band + Fallback Oracles
   └────┬─────────┘ └────┬───────────┘
        │                │
 ┌──────▼────┐     ┌─────▼────────────┐
 │ Vault.sol │     │ ZiGBondingCurve │ ←– Dynamic pricing engine
 └──────┬────┘     └──────────────────┘
        │
 ┌──────▼─────┐
 │ GameFi /   │
 │ Meme / RWA │ ←– ERC20 / ERC721 / ERC1155 utility layers
 └────────────┘
```