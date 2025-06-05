# Smart Contracts Project Overview

This repository contains two distinct yet potentially complementary sets of Solidity smart contracts: the **Profit Maximizer Modular System (PMMS)** and the **ZiG Token Ecosystem**. Both projects leverage cutting-edge decentralized finance (DeFi) primitives and aim to provide robust, secure, and extensible functionalities within the blockchain space.

## 1. Profit Maximizer Modular System (PMMS)

The Profit Maximizer Modular System (PMMS) is a sophisticated framework designed for executing various profit-generating strategies on EVM-compatible blockchains, primarily utilizing flash loans. Its modular architecture allows for the easy integration and deployment of diverse arbitrage, yield, and optimization strategies.

### Key Components

* **`Registry`**: Acts as a central lookup service for essential contract addresses and registered strategies. It allows for dynamic updates of addresses for various DeFi protocols and custom strategies[cite: 1568, 1606].
* **`FlashloanExecutor`**: This core component facilitates the execution of flash loans, primarily interacting with Aave V3. It's designed to initiate flash loans and then delegate the execution of specific profit-making strategies to a `StrategyExecutor`[cite: 1595, 1606, 1618].
* **`StrategyExecutor`**: Responsible for discovering and executing the most profitable strategy for a given flash loan. It can be updated by the owner[cite: 1604, 1619].
* **`ProfitMaximizerModularSystem` (Main Entry Point)**: An upgradable contract that serves as the primary interface for managing and triggering strategies within the PMMS. It allows adding, removing, and executing registered strategies[cite: 1607, 1611, 1612, 1613].

### Strategy Types (as indicated by Mock Contracts)

The system supports a variety of strategies, often involving interactions with multiple DeFi protocols:

* **Triangular Arbitrage**: Capitalizes on price discrepancies between three different assets on a single decentralized exchange (e.g., Uniswap V3)[cite: 982, 987, 991, 995].
* **Staking Token Arbitrage**: Potentially involves arbitraging discrepancies between a liquid staking derivative and its underlying asset[cite: 1001].
* **Peg Arbitrage**: Aims to profit from deviations of stablecoin pegs across different DEXs (e.g., Uniswap V2 and Curve)[cite: 1153, 1155].
* **LP Burn Arbitrage**: Seeks profit by burning Liquidity Pool (LP) tokens and swapping the received underlying assets, typically on Uniswap V2[cite: 1316, 1326, 1335].
* **Gas Arbitrage**: A strategy that might involve profiting from gas price fluctuations or cross-chain opportunities, potentially bridging assets (e.g., to Arbitrum via SKALE IMA Bridge) and performing swaps[cite: 1251, 1254, 1307, 1310].
* **Convex/Curve Strategies**: Involves interactions with Convex Finance and Curve Finance pools, including depositing and withdrawing LP tokens[cite: 961, 962].

### External Integrations (Mocks)

The system is designed to interact with prominent DeFi protocols, as demonstrated by the included mock contracts:

* **Uniswap V2 & V3**: For token swaps and liquidity provision[cite: 1578, 1584].
* **Curve Finance**: For stablecoin swaps and concentrated liquidity pools[cite: 1534, 1588].
* **Aave V3**: For flash loans and lending/borrowing[cite: 1527, 1555].
* **Convex Finance**: For yield optimization on Curve pools[cite: 1531].
* **Chainlink**: For robust price feeds, particularly in the `ZiGOracleHub`[cite: 351].

## 2. ZiG Token Ecosystem

The ZiG Token Ecosystem comprises a set of contracts defining a unique tokenomics model, an oracle hub, and a meme token.

### Key Components

* **`ZiGOracleHub`**: A centralized oracle solution that manages configurations for various price feeds. It supports both Chainlink aggregators and custom oracles, with capabilities for direct rate retrieval and triangulated exchange rates (e.g., A/B = A/USD / B/USD)[cite: 1, 3, 5, 11, 16].
    * **Features**:
        * Set and remove oracle sources for different symbols[cite: 8, 10].
        * Retrieve current exchange rates, with support for inverse rates[cite: 11, 15].
        * Triangulate rates between two symbols using a common base (e.g., USD)[cite: 16].
* **`ReparationsModel`**: This contract appears to implement a tokenomic model for a `wZiGT` token, involving weighted asset baskets, fees, and rebalancing mechanisms[cite: 20, 23, 26, 28].
    * **Features**:
        * Defines a basket of assets (XAU, USD, BTC, ETH, XOF, ZAR) with predefined weights[cite: 24, 25, 27].
        * Supports minting and redeeming `ZiGT` tokens with associated fees[cite: 30, 31, 37, 41, 45].
        * Implements a fee structure (standard and reduced fees) based on `AccessVerifier` eligibility[cite: 28, 49].
        * Includes a rebalancing mechanism (triggered by DAO/Timelock) and integrates with an `OracleRouter` to get asset prices[cite: 29, 33, 35].
* **`ZiGMemeToken`**: An ERC20 compliant meme token with additional functionalities[cite: 345].
    * **Features**:
        * Standard ERC20 functionalities (transfer, approve, etc.).
        * `claimFaucet()`: Allows users to claim a predefined amount of tokens once per cooldown period[cite: 345].
        * `airdrop()`: Enables the owner to airdrop tokens to multiple recipients[cite: 345].

## Getting Started

### Prerequisites

* Node.js (for `npm` or `yarn`)
* Foundry (for `forge`, compilation, testing, and deployment of Solidity contracts)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [repository_url]
    cd [repository_name]
    ```
2.  **Install dependencies:**
    ```bash
    forge install
    npm install
    ```
    (or `yarn install` if using yarn)

### Compilation

Compile the Solidity contracts using Foundry:
```bash
forge build
```

### Testing

Run the tests to ensure all functionalities work as expected:
```bash
forge test
```

### Deployment

Deployment instructions will vary based on your target network and specific deployment setup. Typically, you would use Foundry scripts for deployment:
```bash
forge script script/Deploy.s.sol --rpc-url <YOUR_RPC_URL> --private-key <YOUR_PRIVATE_KEY> --broadcast
```

### Usage

Interact with the deployed contracts using web3 libraries (e.g., Ethers.js, Web3.js) or through a dApp interface. Refer to the individual contract interfaces for specific function calls and parameters.

## Diagrams

Profit Maximizer Modular System (PMMS) Architecture:

![alt text](./pmms.png "Profit Maximizer Modular System (PMMS) Architecture")

ZiG Token Ecosystem Architecture:

![alt text1][logo]

[logo]: ./ZiG.png "ZiG Token Ecosystem Architecture"

## License

The smart contracts in this repository are primarily licensed under `UNLICENSED` or `MIT`, as indicated within each Solidity file[cite: 1, 19, 749, 751, 755, 761, 766, 768, 770, 772, 774, 1518, 1521, 1526, 1530, 1533, 1538, 1540, 1544, 1548, 1554, 1563, 1575, 1577, 1580, 1583, 1587, 1594, 1605, 1617, 1621]. Please check individual file headers for precise licensing information.