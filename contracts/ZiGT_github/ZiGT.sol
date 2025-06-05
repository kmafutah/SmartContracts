// // SPDX-License-Identifier: UNLICENSED
// /**
//  * @custom:dev-run-script scripts/deploy.js --network skale
//  */
// pragma solidity ^0.8.20;

// import "./ZiGCrossChain.sol";
// import "./ZiGBondingCurve.sol";
// import "@prb/math/src/UD60x18.sol";
// import { UD60x18, ud, unwrap, mul, div, pow as prbPow } from "@prb/math/src/UD60x18.sol";
// import { SD59x18, sd } from "@prb/math/src/SD59x18.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
// import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
// import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

// // Define the AssetType enum
// enum AssetType { METAL, CRYPTO, FIAT }

// // Define the OracleConfig struct
// struct OracleConfig {
//     address chainlinkFeed;
//     address bandFeed; // Will be fetched from BandFeedRegistry
//     uint256 maxPriceAge;
//     uint8 decimals;
//     string description;
// }

// enum StrategicDirection { Famous8PlusZAR, G20ReserveModel, PanAfroEurasianModel, ZiGMirrorModel, ReparationsModel }

// struct ReserveRatio {
//     uint256 metals;
//     uint256 fiat;
//     uint256 crypto;
// }

// // Band Protocol Standard Reference interface
// interface IBandStdReference {
//     function getReferenceData(string memory base, string memory quote) external view returns (
//         uint256 rate,
//         uint256 lastUpdatedBase,
//         uint256 lastUpdatedQuote
//     );
// }

// // Interface for BandFeedRegistry
// interface IBandFeedRegistry {
//     function getFeedAddress(string memory assetPair) external view returns (address);
// }

// contract ZiGT is Initializable, UUPSUpgradeable, ZiGCrossChain, ZiGBondingCurve, ERC20Upgradeable, ReentrancyGuardUpgradeable {
//     address public governance;

//     address public pendingGovernance;
//     uint256 public lastRebalance;
//     uint256 public feePercentage; // Fee percentage in basis points (e.g., 100 = 1%)
//     uint256 public rebalanceCooldown;

//     mapping(bytes32 => int256) public assetWeights;
//     mapping(bytes32 => OracleConfig) public assetOracles;
//     mapping(bytes32 => uint256) public cachedPrice;
//     mapping(bytes32 => uint256) public cachedTimestamp;

//     StrategicDirection public selectedDirection;
//     ReserveRatio public selectedRatio;
//     address public reparationsModel;
//     address public bandFeedRegistry; // Address of BandFeedRegistry contract

//     // Events
//     event WeightUpdated(bytes32 indexed assetKey, int256 newWeight);
//     event FeeCharged(address indexed user, uint256 amount);
//     event OracleUpdated(bytes32 indexed assetKey, address chainlinkFeed, address bandFeed, uint256 maxPriceAge, uint8 decimals, string description);
//     event ConfigurationUpdated(StrategicDirection direction, ReserveRatio ratio);
//     event Rebalanced();
//     event StrategyUpdated(StrategicDirection newStrategy);
//     event GovernanceTransferInitiated(address indexed previousGovernance, address indexed newGovernance);
//     event GovernanceTransferred(address indexed previousGovernance, address indexed newGovernance);
//     event ReparationsModelSet(address indexed model);
//     event PriceCached(bytes32 indexed assetKey, uint256 price, uint256 timestamp);
//     event PricesRetrieved(string[] symbols, uint256[] prices, uint256[] timestamps);
//     event BandFeedRegistrySet(address indexed registry);

//     modifier onlyGovernance() override {
//         require(msg.sender == governance, "Unauthorized");
//         _;
//     }

//     // modifier onlyOwner() {
//     //     require(msg.sender == owner, "Not the owner");
//     //     _;
//     // }

//     // Required for UUPSUpgradeable
//     function _authorizeUpgrade(address newImplementation) 
//         internal 
//         override(UUPSUpgradeable, ZiGCrossChain) 
//         onlyGovernance 
//     {
//         // Implementation
//     }

//     // Disable initializers in the implementation contract

//     /// @custom:oz-upgrades-unsafe-allow constructor
//     constructor() CCIPReceiver(address(0)) {
//         _disableInitializers();
//     }

// function initialize(
//     address ccipRouter,
//     address bandFeedRegistry_,
//     address initialGovernance,
//     // address initialOwner,
//     StrategicDirection direction,
//     ReserveRatio memory ratio
// ) public initializer {
//     __UUPSUpgradeable_init();
//     __ERC20_init("ZiGT Token", "ZiGT");
//     __ReentrancyGuard_init();
//     // Call ZiGCrossChain's initialize with ccipRouter and initialGovernance
//     super.initialize(ccipRouter, initialGovernance);

//     require(bandFeedRegistry_ != address(0), "Invalid registry address");
//     bandFeedRegistry = bandFeedRegistry_;
//     governance = initialGovernance;
//     // owner = initialOwner;
//     selectedDirection = direction;
//     selectedRatio = ratio;
//     rebalanceCooldown = 7 days;
//     feePercentage = 100; // 1% default fee
//     _setupOracles(direction);
//     emit ConfigurationUpdated(direction, ratio);
//     emit BandFeedRegistrySet(bandFeedRegistry_);
// }
//     // Initializer replaces constructor for upgradable contracts
//     // function initialize(
//     //     address ccipRouter,
//     //     address bandFeedRegistry_,
//     //     address initialGovernance,
//     //     address initialOwner,
//     //     StrategicDirection direction,
//     //     ReserveRatio memory ratio
//     // ) public initializer {
//     //     __UUPSUpgradeable_init();
//     //     __ERC20_init("ZiGT Token", "ZiGT");
//     //     __ReentrancyGuard_init();
//     //     __ZiGCrossChain_init(ccipRouter);

//     //     require(bandFeedRegistry_ != address(0), "Invalid registry address");
//     //     bandFeedRegistry = bandFeedRegistry_;
//     //     governance = initialGovernance;
//     //     owner = initialOwner;
//     //     selectedDirection = direction;
//     //     selectedRatio = ratio;
//     //     rebalanceCooldown = 7 days;
//     //     feePercentage = 100; // 1% default fee
//     //     _setupOracles(direction);
//     //     emit ConfigurationUpdated(direction, ratio);
//     //     emit BandFeedRegistrySet(bandFeedRegistry_);
//     // }

//     // Set BandFeedRegistry address (governance only)
//     function setBandFeedRegistry(address newRegistry) external onlyGovernance {
//         require(newRegistry != address(0), "Invalid registry address");
//         bandFeedRegistry = newRegistry;
//         emit BandFeedRegistrySet(newRegistry);
//     }

//     // Fallback function to prevent unintended Ether transfers (SKALE compatibility)
//     fallback() external {
//         revert("Ether transfers not supported");
//     }

//     function setFeePercentage(uint256 newFeePercentage) external onlyOwner {
//         require(newFeePercentage <= 1000, "Fee too high"); // Max 10%
//         feePercentage = newFeePercentage;
//     }

//     function setRebalanceCooldown(uint256 newCooldown) external onlyGovernance {
//         require(newCooldown >= 1 days && newCooldown <= 30 days, "Cooldown out of range");
//         rebalanceCooldown = newCooldown;
//     }

//     function chargeFee(address user, uint256 amount) internal {
//         uint256 fee = (amount * feePercentage) / 10000;
//         if (fee > 0) {
//             _burn(user, fee);
//             emit FeeCharged(user, fee);
//         }
//     }

//     function crossChainMint(uint256 amount, address destination) external payable nonReentrant {
//         require(amount > 0, "Invalid amount");
//         chargeFee(msg.sender, amount);
//         bytes memory data = abi.encodeWithSignature("mint(address,uint256)", destination, amount);
//         _sendCrossChainMessage(destination, data);
//         _burn(msg.sender, amount);
//     }

//     function rebalanceWeights(bytes32[] calldata keys, int256[] calldata newWeights) external onlyGovernance {
//         require(keys.length == newWeights.length, "Mismatched input");
//         for (uint i = 0; i < keys.length; i++) {
//             _setWeight(keys[i], newWeights[i]);
//             emit WeightUpdated(keys[i], newWeights[i]);
//         }
//     }

//     function rebalanceBasket(bytes32[] calldata assetKeys, uint256[] calldata newWeights) external onlyGovernance {
//         require(block.timestamp > lastRebalance + rebalanceCooldown, "Cooldown active");
//         require(assetKeys.length == newWeights.length, "Mismatched input");
//         uint256 total;
//         for (uint256 i = 0; i < assetKeys.length; i++) {
//             total += newWeights[i];
//         }
//         require(total == 10000, "Weights must sum to 10,000");
//         for (uint256 i = 0; i < assetKeys.length; i++) {
//             assetWeights[assetKeys[i]] = int256(newWeights[i]);
//             emit WeightUpdated(assetKeys[i], int256(newWeights[i]));
//         }
//         lastRebalance = block.timestamp;
//         emit ConfigurationUpdated(selectedDirection, selectedRatio);
//     }

//     function updateWeight(bytes32 assetKey, uint256 newWeight) external onlyGovernance {
//         require(newWeight >= 0, "Negative weight");
//         int256 oldWeight = assetWeights[assetKey];
//         assetWeights[assetKey] = int256(newWeight);
//         emit WeightUpdated(assetKey, int256(newWeight));
//         if (oldWeight != 0) {
//             int256 deviation = oldWeight > int256(newWeight) ? oldWeight - int256(newWeight) : int256(newWeight) - oldWeight;
//             if (oldWeight != 0 && deviation * 100 / oldWeight > 5) {
//                 lastRebalance = block.timestamp;
//                 emit ConfigurationUpdated(selectedDirection, selectedRatio);
//             }
//         }
//     }

//     function _setWeight(bytes32 assetKey, int256 weight) internal {
//         assetWeights[assetKey] = weight;
//     }

//     function setOracle(bytes32 assetKey, AssetType assetType, OracleConfig memory config) public onlyGovernance {
//         require(config.chainlinkFeed != address(0) || IBandFeedRegistry(bandFeedRegistry).getFeedAddress(string(abi.encodePacked(assetKey))) != address(0), "Invalid oracle config");
//         assetOracles[assetKey] = config;
//         emit OracleUpdated(assetKey, config.chainlinkFeed, config.bandFeed, config.maxPriceAge, config.decimals, config.description);
//     }

//     function setReparationsModel(address _model) external onlyGovernance {
//         require(_model != address(0), "Zero address");
//         reparationsModel = _model;
//         emit ReparationsModelSet(_model);
//     }

//     function updateCachedPrice(bytes32 assetKey) public {
//         uint256 price = _fetchFreshPrice(assetKey);
//         cachedPrice[assetKey] = price;
//         cachedTimestamp[assetKey] = block.timestamp;
//         emit PriceCached(assetKey, price, block.timestamp);
//     }

//     function updateCachedPrices(bytes32[] calldata assetKeys) external {
//         for (uint256 i = 0; i < assetKeys.length; i++) {
//             updateCachedPrice(assetKeys[i]);
//         }
//     }

//     function _setupOracles(StrategicDirection _strategy) internal {
//         // Set default oracles (governance can override)
//         if (assetOracles["XAUUSD"].chainlinkFeed == address(0)) {
//             _setOracle("XAUUSD", AssetType.METAL, OracleConfig({
//                 chainlinkFeed: 0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6, // Gold/USD (Ethereum, replace for SKALE)
//                 bandFeed: address(0), // Fetched dynamically from registry
//                 maxPriceAge: 1 hours,
//                 decimals: 8,
//                 description: "Gold/USD"
//             }));
//         }
//         if (assetOracles["BTCUSD"].chainlinkFeed == address(0)) {
//             _setOracle("BTCUSD", AssetType.CRYPTO, OracleConfig({
//                 chainlinkFeed: 0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c, // BTC/USD
//                 bandFeed: address(0),
//                 maxPriceAge: 1 hours,
//                 decimals: 8,
//                 description: "BTC/USD"
//             }));
//         }
//         if (assetOracles["ETHUSD"].chainlinkFeed == address(0)) {
//             _setOracle("ETHUSD", AssetType.CRYPTO, OracleConfig({
//                 chainlinkFeed: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419, // ETH/USD
//                 bandFeed: address(0),
//                 maxPriceAge: 1 hours,
//                 decimals: 8,
//                 description: "ETH/USD"
//             }));
//         }
//         if (_strategy == StrategicDirection.ZiGMirrorModel || 
//             _strategy == StrategicDirection.Famous8PlusZAR || 
//             _strategy == StrategicDirection.G20ReserveModel || 
//             _strategy == StrategicDirection.PanAfroEurasianModel) {
//             if (assetOracles["AUDUSD"].chainlinkFeed == address(0)) {
//                 _setOracle("AUDUSD", AssetType.FIAT, OracleConfig({
//                     chainlinkFeed: 0x77F9710E7d0A19669A13c055F62cd80d313dF022, // AUD/USD
//                     bandFeed: address(0),
//                     maxPriceAge: 1 hours,
//                     decimals: 8,
//                     description: "AUD/USD"
//                 }));
//             }
//             if (assetOracles["USDZAR"].chainlinkFeed == address(0)) {
//                 _setOracle("USDZAR", AssetType.FIAT, OracleConfig({
//                     chainlinkFeed: 0xDE1952A1bF53f8E558cc761ad2564884E55B2c6F, // USD/ZAR
//                     bandFeed: address(0),
//                     maxPriceAge: 1 hours,
//                     decimals: 8,
//                     description: "USD/ZAR"
//                 }));
//             }
//             if (assetOracles["EURUSD"].chainlinkFeed == address(0)) {
//                 _setOracle("EURUSD", AssetType.FIAT, OracleConfig({
//                     chainlinkFeed: 0x1a81afB8146aeFfCFc5E50e8479e826E7D55b910, // EUR/USD
//                     bandFeed: address(0),
//                     maxPriceAge: 1 hours,
//                     decimals: 8,
//                     description: "EUR/USD"
//                 }));
//             }
//             if (assetOracles["GBPUSD"].chainlinkFeed == address(0)) {
//                 _setOracle("GBPUSD", AssetType.FIAT, OracleConfig({
//                     chainlinkFeed: 0x1692Bdd32F31b831caAc1b0c9fAF68613682813b, // GBP/USD
//                     bandFeed: address(0),
//                     maxPriceAge: 1 hours,
//                     decimals: 8,
//                     description: "GBP/USD"
//                 }));
//             }
//             if (assetOracles["USDCHF"].chainlinkFeed == address(0)) {
//                 _setOracle("USDCHF", AssetType.FIAT, OracleConfig({
//                     chainlinkFeed: 0x6cf9aA65Cb1466D4C3EbDfD652fbc0fb0B3a7BA8, // USD/CHF
//                     bandFeed: address(0),
//                     maxPriceAge: 1 hours,
//                     decimals: 8,
//                     description: "USD/CHF"
//                 }));
//             }
//             if (assetOracles["USDJPY"].chainlinkFeed == address(0)) {
//                 _setOracle("USDJPY", AssetType.FIAT, OracleConfig({
//                     chainlinkFeed: 0xBcE206caE7f0ec07b545EddE332A47C2F75bbeb3, // USD/JPY
//                     bandFeed: address(0),
//                     maxPriceAge: 1 hours,
//                     decimals: 8,
//                     description: "USD/JPY"
//                 }));
//             }
//             if (assetOracles["NZDUSD"].chainlinkFeed == address(0)) {
//                 _setOracle("NZDUSD", AssetType.FIAT, OracleConfig({
//                     chainlinkFeed: 0xF4b5470523cCD314C6B9dA041076e7D79E0Df267, // NZD/USD
//                     bandFeed: address(0),
//                     maxPriceAge: 1 hours,
//                     decimals: 8,
//                     description: "NZD/USD"
//                 }));
//             }
//             if (assetOracles["BNBUSD"].chainlinkFeed == address(0)) {
//                 _setOracle("BNBUSD", AssetType.CRYPTO, OracleConfig({
//                     chainlinkFeed: 0x14e613ac84a31f709eAdbDf89c6cC390fDc29c9C, // BNB/USD
//                     bandFeed: address(0),
//                     maxPriceAge: 1 hours,
//                     decimals: 8,
//                     description: "BNB/USD"
//                 }));
//             }
//         }
//         if (_strategy == StrategicDirection.PanAfroEurasianModel) {
//             if (assetOracles["NGNUSD"].chainlinkFeed == address(0)) {
//                 _setOracle("NGNUSD", AssetType.FIAT, OracleConfig({
//                     chainlinkFeed: 0x5c0Ab2d9b5a7ed9f470386e82BB36A3613cDd4b5,
//                     bandFeed: address(0),
//                     maxPriceAge: 1 hours,
//                     decimals: 8,
//                     description: "NGN/USD"
//                 }));
//             }
//             if (assetOracles["EGPUSD"].chainlinkFeed == address(0)) {
//                 _setOracle("EGPUSD", AssetType.FIAT, OracleConfig({
//                     chainlinkFeed: 0x0A6513e40db6EB1b165753AD52E80663aeA50545,
//                     bandFeed: address(0),
//                     maxPriceAge: 1 hours,
//                     decimals: 8,
//                     description: "EGP/USD"
//                 }));
//             }
//             if (assetOracles["RUBUSD"].chainlinkFeed == address(0)) {
//                 _setOracle("RUBUSD", AssetType.FIAT, OracleConfig({
//                     chainlinkFeed: 0x8A753747A1Fa494EC906cE90E9f37563A8AF630e,
//                     bandFeed: address(0),
//                     maxPriceAge: 1 hours,
//                     decimals: 8,
//                     description: "RUB/USD"
//                 }));
//             }
//             if (assetOracles["TRYUSD"].chainlinkFeed == address(0)) {
//                 _setOracle("TRYUSD", AssetType.FIAT, OracleConfig({
//                     chainlinkFeed: 0xd9FFdb71EbE7496cC440152d43986Aae0AB76665,
//                     bandFeed: address(0),
//                     maxPriceAge: 1 hours,
//                     decimals: 8,
//                     description: "TRY/USD"
//                 }));
//             }
//             if (assetOracles["INRUSD"].chainlinkFeed == address(0)) {
//                 _setOracle("INRUSD", AssetType.FIAT, OracleConfig({
//                     chainlinkFeed: 0x24Cea4b628543b228F366580DDa3a6532d2d7B09,
//                     bandFeed: address(0),
//                     maxPriceAge: 1 hours,
//                     decimals: 8,
//                     description: "INR/USD"
//                 }));
//             }
//         }
//         if (_strategy == StrategicDirection.G20ReserveModel) {
//             if (assetOracles["CNYUSD"].chainlinkFeed == address(0)) {
//                 _setOracle("CNYUSD", AssetType.FIAT, OracleConfig({
//                     chainlinkFeed: 0x04B7384473f28E3d7B01495d2e03a4Cc42D8b6E1,
//                     bandFeed: address(0),
//                     maxPriceAge: 1 hours,
//                     decimals: 8,
//                     description: "CNY/USD"
//                 }));
//             }
//             if (assetOracles["JPYUSD"].chainlinkFeed == address(0)) {
//                 _setOracle("JPYUSD", AssetType.FIAT, OracleConfig({
//                     chainlinkFeed: 0xBcE206caE7f0ec07b545EddE332A47C2F75bbeb3,
//                     bandFeed: address(0),
//                     maxPriceAge: 1 hours,
//                     decimals: 8,
//                     description: "JPY/USD"
//                 }));
//             }
//             if (assetOracles["CADUSD"].chainlinkFeed == address(0)) {
//                 _setOracle("CADUSD", AssetType.FIAT, OracleConfig({
//                     chainlinkFeed: 0xaEA2808407B7319A31A383B6F8B60f04BCa23cE2,
//                     bandFeed: address(0),
//                     maxPriceAge: 1 hours,
//                     decimals: 8,
//                     description: "CAD/USD"
//                 }));
//             }
//         }
//     }

//     function _calculateMetals() internal view returns (uint256) {
//         uint256 goldPrice = getPrice("XAUUSD");
//         if (selectedDirection == StrategicDirection.ZiGMirrorModel) {
//             return goldPrice * 50 / 100;
//         } else if (selectedDirection == StrategicDirection.Famous8PlusZAR) {
//             return goldPrice * 60 / 100;
//         } else {
//             return goldPrice * selectedRatio.metals / 10000;
//         }
//     }

//     function _calculateFiat() internal view returns (uint256) {
//         if (selectedDirection == StrategicDirection.ZiGMirrorModel) {
//             uint256 aud = getPrice("AUDUSD") * 10;
//             uint256 zar = getPrice("USDZAR") * 40;
//             uint256 eur = getPrice("EURUSD") * 30;
//             uint256 gbp = getPrice("GBPUSD") * 20;
//             return (zar + eur + gbp >= aud) ? (zar + eur + gbp - aud) / 100 : 0;
//         } else if (selectedDirection == StrategicDirection.Famous8PlusZAR) {
//             return (
//                 getPrice("AUDUSD") * 15 +
//                 getPrice("EURUSD") * 25 +
//                 getPrice("USDZAR") * 20 +
//                 getPrice("GBPUSD") * 15 +
//                 getPrice("USDCHF") * 10 +
//                 getPrice("USDJPY") * 10 +
//                 getPrice("NZDUSD") * 5
//             ) / 100;
//         } else if (selectedDirection == StrategicDirection.PanAfroEurasianModel) {
//             return (
//                 getPrice("USDZAR") * 30 +
//                 getPrice("NGNUSD") * 20 +
//                 getPrice("EGPUSD") * 15 +
//                 getPrice("RUBUSD") * 15 +
//                 getPrice("TRYUSD") * 10 +
//                 getPrice("INRUSD") * 10
//             ) / 100;
//         } else {
//             return (
//                 getPrice("EURUSD") * 35 +
//                 getPrice("CNYUSD") * 25 +
//                 getPrice("JPYUSD") * 20 +
//                 getPrice("GBPUSD") * 15 +
//                 getPrice("CADUSD") * 5
//             ) / 100;
//         }
//     }

//     function _calculateCrypto() internal view returns (uint256) {
//         uint256 btcPrice = getPrice("BTCUSD");
//         uint256 ethPrice = getPrice("ETHUSD");
//         uint256 bnbPrice = getPrice("BNBUSD");
//         if (selectedDirection == StrategicDirection.ZiGMirrorModel) {
//             return (btcPrice * 60 + ethPrice * 30 + bnbPrice * 10) / 100;
//         } else if (selectedDirection == StrategicDirection.Famous8PlusZAR) {
//             return (btcPrice * 70 + ethPrice * 20 + bnbPrice * 10) / 100;
//         } else if (selectedDirection == StrategicDirection.PanAfroEurasianModel) {
//             return btcPrice;
//         } else {
//             return (btcPrice * 80 + ethPrice * 20) / 100;
//         }
//     }

//     function powUint(uint256 base, uint256 expt) internal pure returns (uint256 result) {
//         UD60x18 r = ud(1e18);
//         UD60x18 b = ud(base);
//         for (uint256 i = 0; i < expt; i++) {
//             r = mul(r, b);
//         }
//         result = unwrap(r);
//     }

//     function getPrice(bytes32 assetKey) public view returns (uint256) {
//         OracleConfig memory config = assetOracles[assetKey];
//         require(config.chainlinkFeed != address(0) || IBandFeedRegistry(bandFeedRegistry).getFeedAddress(string(abi.encodePacked(assetKey))) != address(0), "No oracle set");
//         uint256 cacheTime = cachedTimestamp[assetKey];
//         if (cacheTime != 0 && block.timestamp - cacheTime <= config.maxPriceAge) {
//             return cachedPrice[assetKey];
//         }
//         return _fetchFreshPrice(assetKey);
//     }

//     function _fetchFreshPrice(bytes32 assetKey) internal view returns (uint256) {
//         OracleConfig memory config = assetOracles[assetKey];
//         if (config.chainlinkFeed != address(0)) {
//             try AggregatorV3Interface(config.chainlinkFeed).latestRoundData() returns (
//                 uint80, int256 price, uint256, uint256 updatedAt, uint80
//             ) {
//                 require(price > 0, "Invalid Chainlink price");
//                 require(block.timestamp - updatedAt <= config.maxPriceAge, "Stale Chainlink price");
//                 return uint256(price) * (10 ** (18 - config.decimals));
//             } catch {
//                 // Fallback to Band Protocol
//             }
//         }
//         // Fetch Band feed address from registry
//         address bandFeed = IBandFeedRegistry(bandFeedRegistry).getFeedAddress(string(abi.encodePacked(assetKey)));
//         if (bandFeed != address(0)) {
//             (string memory base, string memory quote) = _getBandBaseQuote(assetKey);
//             try IBandStdReference(bandFeed).getReferenceData(base, quote) returns (
//                 uint256 rate,
//                 uint256 lastUpdatedBase,
//                 uint256 lastUpdatedQuote
//             ) {
//                 require(rate > 0, "Invalid Band price");
//                 require(block.timestamp - lastUpdatedBase <= config.maxPriceAge, "Stale Band base price");
//                 require(block.timestamp - lastUpdatedQuote <= config.maxPriceAge, "Stale Band quote price");
//                 // Normalize to 18 decimals
//                 return rate * (10 ** (18 - config.decimals));
//             } catch {
//                 revert("No valid price feed available");
//             }
//         }
//         revert("No valid price feed available");
//     }

//     function _getBandBaseQuote(bytes32 assetKey) internal pure returns (string memory base, string memory quote) {
//         bytes memory keyBytes = bytes(abi.encodePacked(assetKey));
//         bytes memory baseBytes = new bytes(3);
//         bytes memory quoteBytes = new bytes(3);
//         for (uint i = 0; i < 3; i++) {
//             baseBytes[i] = keyBytes[i];
//             quoteBytes[i] = keyBytes[i + 3];
//         }
//         base = string(baseBytes);
//         quote = string(quoteBytes);
//     }

//     function _setOracle(bytes32 assetKey, AssetType assetType, OracleConfig memory config) internal {
//         assetOracles[assetKey] = config;
//         emit OracleUpdated(assetKey, config.chainlinkFeed, config.bandFeed, config.maxPriceAge, config.decimals, config.description);
//     }

//     function getAggregatedFiatPrice() public view returns (uint256) {
//         bytes32[5] memory pairs = [
//             bytes32("XAUUSD"),
//             bytes32("AUDUSD"),
//             bytes32("USDZAR"),
//             bytes32("GBPUSD"),
//             bytes32("EURUSD")
//         ];
//         int256[5] memory exponents = [
//             int256(350000000000000000),   // 0.35
//             int256(-200000000000000000),  // -0.20
//             int256(180000000000000000),   // 0.18
//             int256(-120000000000000000),  // -0.12
//             int256(250000000000000000)    // 0.25
//         ];

//         UD60x18 result = ud(1e18);
//         for (uint256 i = 0; i < pairs.length; i++) {
//             uint256 price = getPrice(pairs[i]);
//             uint256 powered = powPriceUint(price, exponents[i]);
//             result = mul(result, ud(powered));
//         }
//         return unwrap(result);
//     }

//     function powPriceUint(uint256 base, int256 expo) internal pure returns (uint256) {
//         if (expo == 0) return 1e18;
//         UD60x18 b = ud(base);
//         UD60x18 e = UD60x18.wrap(uint256(expo >= 0 ? expo : -expo));
//         UD60x18 res = prbPow(b, e);
//         return expo > 0 ? unwrap(res) : unwrap(div(ud(1e18), res));
//     }

//     function updateStrategy(StrategicDirection _newStrategy, ReserveRatio calldata _newRatio) external onlyGovernance {
//         require(_newRatio.metals + _newRatio.fiat + _newRatio.crypto == 10000, "Invalid ratio sum");
//         selectedDirection = _newStrategy;
//         selectedRatio = _newRatio;
//         _setupOracles(_newStrategy);
//         emit StrategyUpdated(_newStrategy);
//     }

//     function rebalance() external onlyGovernance {
//         uint256 metalsValue = _calculateMetals();
//         uint256 fiatValue = _calculateFiat();
//         uint256 cryptoValue = _calculateCrypto();

//         assetWeights["METALS"] = int256(metalsValue);
//         assetWeights["FIAT"] = int256(fiatValue);
//         assetWeights["CRYPTO"] = int256(cryptoValue);

//         lastRebalance = block.timestamp;
//         emit Rebalanced();
//     }

//     function mint(address to, uint256 amount) public {
//         _mint(to, amount);
//     }

//     function mint(uint256 amount) public payable override {
//         _mint(msg.sender, amount);
//     }

//     function burn(uint256 amount) external override {
//         _burn(msg.sender, amount);
//     }

//     function setStrategicDirection(StrategicDirection direction) external onlyOwner {
//         selectedDirection = direction;
//         _setupOracles(direction);
//         emit ConfigurationUpdated(direction, selectedRatio);
//     }

//     function setReserveRatio(ReserveRatio memory ratio) external onlyOwner {
//         require(ratio.metals + ratio.fiat + ratio.crypto == 10000, "Invalid ratio sum");
//         selectedRatio = ratio;
//         emit ConfigurationUpdated(selectedDirection, ratio);
//     }

//     function getAssetData(bytes32 assetKey) external view returns (
//         int256 price,
//         int256 weight,
//         string memory description,
//         uint8 decimals
//     ) {
//         OracleConfig memory config = assetOracles[assetKey];
//         price = int256(getPrice(assetKey));
//         weight = assetWeights[assetKey];
//         return (price, weight, config.description, config.decimals);
//     }

//     function calculateZiGTValue() public view returns (uint256) {
//         uint256 metalsValue = _calculateMetals();
//         uint256 fiatValue = _calculateFiat();
//         uint256 cryptoValue = _calculateCrypto();
//         return (metalsValue * selectedRatio.metals + fiatValue * selectedRatio.fiat + cryptoValue * selectedRatio.crypto) / 10000;
//     }

//     function validateOracles(string[] memory symbols) public view returns (string[] memory missing) {
//         uint256 missingCount = 0;
//         string[] memory tempMissing = new string[](symbols.length);
//         for (uint256 i = 0; i < symbols.length; i++) {
//             OracleConfig memory config = assetOracles[keccak256(bytes(symbols[i]))];
//             address bandFeed = IBandFeedRegistry(bandFeedRegistry).getFeedAddress(symbols[i]);
//             if (config.chainlinkFeed == address(0) && bandFeed == address(0)) {
//                 tempMissing[missingCount] = symbols[i];
//                 missingCount++;
//             }
//         }
//         missing = new string[](missingCount);
//         for (uint256 i = 0; i < missingCount; i++) {
//             missing[i] = tempMissing[i];
//         }
//     }

//     function _getRequiredSymbols(StrategicDirection _strategy) public pure returns (string[] memory) {
//         string[] memory symbols;
//         if (_strategy == StrategicDirection.ZiGMirrorModel || 
//             _strategy == StrategicDirection.Famous8PlusZAR || 
//             _strategy == StrategicDirection.G20ReserveModel || 
//             _strategy == StrategicDirection.PanAfroEurasianModel) {
//             symbols = new string[](10);
//             symbols[0] = "XAUUSD";
//             symbols[1] = "BTCUSD";
//             symbols[2] = "ETHUSD";
//             symbols[3] = "AUDUSD";
//             symbols[4] = "USDZAR";
//             symbols[5] = "EURUSD";
//             symbols[6] = "GBPUSD";
//             symbols[7] = "USDCHF";
//             symbols[8] = "USDJPY";
//             symbols[9] = "BNBUSD";
//             if (_strategy == StrategicDirection.G20ReserveModel) {
//                 string[] memory extra = new string[](3);
//                 extra[0] = "JPYUSD";
//                 extra[1] = "CADUSD";
//                 extra[2] = "CNYUSD";
//                 symbols = _extend(symbols, extra);
//             }
//             if (_strategy == StrategicDirection.PanAfroEurasianModel) {
//                 string[] memory extra = new string[](5);
//                 extra[0] = "NGNUSD";
//                 extra[1] = "EGPUSD";
//                 extra[2] = "INRUSD";
//                 extra[3] = "TRYUSD";
//                 extra[4] = "RUBUSD";
//                 symbols = _extend(symbols, extra);
//             }
//         } else {
//             symbols = new string[](3);
//             symbols[0] = "XAUUSD";
//             symbols[1] = "BTCUSD";
//             symbols[2] = "ETHUSD";
//         }
//         return symbols;
//     }

//     function _extend(string[] memory base, string[] memory extra) internal pure returns (string[] memory result) {
//         result = new string[](base.length + extra.length);
//         for (uint256 i = 0; i < base.length; i++) {
//             result[i] = base[i];
//         }
//         for (uint256 j = 0; j < extra.length; j++) {
//             result[base.length + j] = extra[j];
//         }
//     }

//     function transferGovernance(address newGovernance) external onlyGovernance {
//         require(newGovernance != address(0), "Zero address");
//         pendingGovernance = newGovernance;
//         emit GovernanceTransferInitiated(governance, newGovernance);
//     }

//     function acceptGovernance() external {
//         require(msg.sender == pendingGovernance, "Not pending governance");
//         address oldGov = governance;
//         governance = pendingGovernance;
//         pendingGovernance = address(0);
//         emit GovernanceTransferred(oldGov, governance);
//     }

//     function mintReparations(uint256 amount) external payable {
//         require(selectedDirection == StrategicDirection.ReparationsModel, "Not ReparationsModel");
//         require(reparationsModel != address(0), "Model not set");
//         (bool success, ) = reparationsModel.delegatecall(abi.encodeWithSignature("mint(uint256)", amount));
//         require(success, "Mint failed");
//     }

//     function redeemReparations(uint256 amount) external {
//         require(selectedDirection == StrategicDirection.ReparationsModel, "Not ReparationsModel");
//         require(reparationsModel != address(0), "Model not set");
//         (bool success, ) = reparationsModel.delegatecall(abi.encodeWithSignature("redeem(uint256)", amount));
//         require(success, "Redeem failed");
//     }

//     function getAllPrices() public returns (string[] memory symbols, uint256[] memory prices, uint256[] memory timestamps) {
//         symbols = _getRequiredSymbols(selectedDirection);
//         prices = new uint256[](symbols.length);
//         timestamps = new uint256[](symbols.length);
//         for (uint256 i = 0; i < symbols.length; i++) {
//             bytes32 assetKey = keccak256(bytes(symbols[i]));
//             OracleConfig memory config = assetOracles[assetKey];
//             address bandFeed = IBandFeedRegistry(bandFeedRegistry).getFeedAddress(symbols[i]);
//             require(config.chainlinkFeed != address(0) || bandFeed != address(0), "No oracle set for symbol");
//             if (cachedTimestamp[assetKey] != 0 && block.timestamp - cachedTimestamp[assetKey] <= config.maxPriceAge) {
//                 prices[i] = cachedPrice[assetKey];
//                 timestamps[i] = cachedTimestamp[assetKey];
//             } else {
//                 try this.getPrice(assetKey) returns (uint256 price) {
//                     prices[i] = price;
//                     timestamps[i] = block.timestamp;
//                 } catch {
//                     prices[i] = 0;
//                     timestamps[i] = 0;
//                 }
//             }
//         }
//         emit PricesRetrieved(symbols, prices, timestamps);
//         return (symbols, prices, timestamps);
//     }
// }