```bash

┌────────────────────────────┐
│        ZiG Token           │◄──── Minted by Vault / Admins
└────────────────────────────┘
        │         ▲
        ▼         │ burn
┌────────────────────────────┐
│         ZiGT Token         │
│     mint/redeem via Zig    │
└────────────────────────────┘
        │
        ▼
┌────────────────────────────┐
│       OracleHub (price)    │◄─── updatable (manual/auto)
└────────────────────────────┘

┌────────────────────────────┐
│       ZiGSoulID            │◄─── user identity / SBT
└────────────────────────────┘

┌────────────────────────────┐
│          Vault             │◄─── collects ZiG on mint
│  splits: treasury + future + diaspora
└────────────────────────────┘

┌────────────────────────────┐
│      Redistribution        │◄─── users claim rewards (weekly)
└────────────────────────────┘

┌────────────────────────────┐
│        ZiGWallet           │◄─── only accepts ZiG, ZiGT, BTC, ETH...
└────────────────────────────┘


```