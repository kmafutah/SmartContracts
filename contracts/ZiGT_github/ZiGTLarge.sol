// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "./ZiGCrossChain.sol";
import "./ZiGBondingCurve.sol";
import "@prb/math/src/UD60x18.sol";
import { UD60x18, ud, unwrap, mul, div, pow as prbPow } from "@prb/math/src/UD60x18.sol";
import { SD59x18, sd } from "@prb/math/src/SD59x18.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

interface IOracle {
    function latestAnswer() external view returns (int256);
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
}

enum AssetType { METAL, CRYPTO, FIAT }
enum StrategicDirection { Famous8PlusZAR, G20ReserveModel, PanAfroEurasianModel, ZiGMirrorModel, ReparationsModel }

struct OracleConfig {
    address chainlinkFeed;
    address bandFeed;
    uint256 maxPriceAge;
    uint8 decimals;
    string description;
}

struct ReserveRatio {
    uint256 metals;
    uint256 fiat;
    uint256 crypto;
}

interface IBandStdReference {
    function getReferenceData(string memory base, string memory quote) external view returns (
        uint256 rate,
        uint256 lastUpdatedBase,
        uint256 lastUpdatedQuote
    );
}

interface IBandFeedRegistry {
    function getFeedAddress(string memory assetPair) external view returns (address);
}
    
contract ZiGTLarge is 
    Initializable,
    ERC20Upgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    ZiGCrossChain,
    ZiGBondingCurve
{
    address public governance;
    address public pendingGovernance;
    address public bandFeedRegistry;
    address public reparationsModel;
    
    uint256 public lastRebalance;
    uint256 public feePercentage;
    uint256 public rebalanceCooldown;
    
    StrategicDirection public selectedDirection;
    ReserveRatio public selectedRatio;

    mapping(bytes32 => int256) public assetWeights;
    mapping(bytes32 => OracleConfig) public assetOracles;
    mapping(bytes32 => uint256) public cachedPrice;
    mapping(bytes32 => uint256) public cachedTimestamp;

    event WeightUpdated(bytes32 indexed assetKey, int256 newWeight);
    event FeeCharged(address indexed user, uint256 amount);
    event OracleUpdated(bytes32 indexed assetKey, address chainlinkFeed, address bandFeed, uint256 maxPriceAge, uint8 decimals, string description);
    event ConfigurationUpdated(StrategicDirection direction, ReserveRatio ratio);
    event Rebalanced();
    event StrategyUpdated(StrategicDirection newStrategy);
    event GovernanceTransferInitiated(address indexed previousGovernance, address indexed newGovernance);
    event GovernanceTransferred(address indexed previousGovernance, address indexed newGovernance);
    event ReparationsModelSet(address indexed model);
    event PriceCached(bytes32 indexed assetKey, uint256 price, uint256 timestamp);
    event PricesRetrieved(string[] symbols, uint256[] prices, uint256[] timestamps);
    event BandFeedRegistrySet(address indexed registry);
    event PriceError(bytes32 indexed assetKey, string reason) ;

    modifier onlyGovernance() override {
        require(msg.sender == governance, "Unauthorized");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

function initialize(
    address ccipRouter,
    address bandFeedRegistry_,
    address initialGovernance,
    StrategicDirection direction,
    ReserveRatio memory ratio
) public initializer {
    // Initialize parent contracts in correct linearized order
    __ERC20_init("Mansa's Mbizo Yzuri Refu Tano", unicode"₥MYRT");
    __ReentrancyGuard_init();
    __UUPSUpgradeable_init();
    __ZiGCrossChain_init(ccipRouter, initialGovernance); // Add this line
    __ZiGBondingCurve_init();

    require(bandFeedRegistry_ != address(0), "Invalid registry address");
    bandFeedRegistry = bandFeedRegistry_;
    governance = initialGovernance;
    selectedDirection = direction;
    selectedRatio = ratio;
    rebalanceCooldown = 7 days;
    feePercentage = 100;
    
    _setupOracles(direction);
    _initializeBandFeeds();
    emit ConfigurationUpdated(direction, ratio);
    emit BandFeedRegistrySet(bandFeedRegistry_);
}


function _initializeBandFeeds() private {
    bytes32[] memory assets = new bytes32[](6);
    assets[0] = keccak256("XAUUSD");
    assets[1] = keccak256("BTCUSD");
    assets[2] = keccak256("ETHUSD");
    assets[3] = keccak256("AUDUSD");
    assets[4] = keccak256("USDZAR");
    assets[5] = keccak256("EURUSD");
    assets[6] = keccak256("GBPUSD");
    assets[7] = keccak256("USDCHF");
    assets[8] = keccak256("USDJPY");
    assets[9] = keccak256("BNBUSD");    
    assets[10] = keccak256("NGNUSD");
    assets[11] = keccak256("EGPUSD");
    assets[12] = keccak256("RUBUSD");
    assets[13] = keccak256("TRYUSD");
    assets[14] = keccak256("INRUSD");
    
    for(uint i = 0; i < assets.length; i++) {
        OracleConfig storage config = assetOracles[assets[i]];
        if(config.bandFeed != address(0)) {
            updateCachedPrice(assets[i]);
        }
    }
}


    function setOracle(bytes32 assetKey, OracleConfig memory config) external onlyGovernance {
        require(
            config.chainlinkFeed != address(0) || 
            IBandFeedRegistry(bandFeedRegistry).getFeedAddress(string(abi.encodePacked(assetKey))) != address(0), 
            "Invalid oracle config"
        );
        assetOracles[assetKey] = config;
        emit OracleUpdated(
            assetKey, 
            config.chainlinkFeed, 
            config.bandFeed, 
            config.maxPriceAge, 
            config.decimals, 
            config.description
        );
    }

    function _setOracle(bytes32 assetKey, OracleConfig memory config) internal {
        assetOracles[assetKey] = config;
        emit OracleUpdated(
            assetKey, 
            config.chainlinkFeed, 
            config.bandFeed, 
            config.maxPriceAge, 
            config.decimals, 
            config.description
        );
    }


    function updateCachedPrice(bytes32 assetKey) public {
        uint256 price = _fetchFreshPrice(assetKey);
        cachedPrice[assetKey] = price;
        cachedTimestamp[assetKey] = block.timestamp;
        emit PriceCached(assetKey, price, block.timestamp);
    }

    function updateCachedPrices(bytes32[] calldata assetKeys) external {
        for (uint256 i = 0; i < assetKeys.length; i++) {
            updateCachedPrice(assetKeys[i]);
        }
    }

    // ========== STRATEGY MANAGEMENT ==========

    function updateStrategy(StrategicDirection _newStrategy, ReserveRatio calldata _newRatio) external onlyGovernance {
        require(_newRatio.metals + _newRatio.fiat + _newRatio.crypto == 10000, "Invalid ratio sum");
        selectedDirection = _newStrategy;
        selectedRatio = _newRatio;
        _setupOracles(_newStrategy);
        emit StrategyUpdated(_newStrategy);
    }

    function rebalance() external onlyGovernance {
        require(block.timestamp > lastRebalance + rebalanceCooldown, "Cooldown active");
        
        uint256 metalsValue = _calculateMetals();
        uint256 fiatValue = _calculateFiat();
        uint256 cryptoValue = _calculateCrypto();

        assetWeights["METALS"] = int256(metalsValue);
        assetWeights["FIAT"] = int256(fiatValue);
        assetWeights["CRYPTO"] = int256(cryptoValue);

        lastRebalance = block.timestamp;
        emit Rebalanced();
    }

    // ========== TOKEN OPERATIONS ==========

    function chargeFee(address user, uint256 amount) internal {
        uint256 fee = (amount * feePercentage) / 10000;
        if (fee > 0) {
            _burn(user, fee);
            emit FeeCharged(user, fee);
        }
    }

    function crossChainMint(uint256 amount, address destination) external payable nonReentrant {
        require(amount > 0, "Invalid amount");
        chargeFee(msg.sender, amount);
        bytes memory data = abi.encodeWithSignature("mint(address,uint256)", destination, amount);
        _sendCrossChainMessage(destination, data);
        _burn(msg.sender, amount);
    }

    function mint(address to, uint256 amount) external onlyGovernance {
        _mint(to, amount);
    }

    function mint(uint256 amount) external payable override {
        _mint(msg.sender, amount);
    }

    function burn(uint256 amount) external override {
        _burn(msg.sender, amount);
    }

    // ========== PRICE CALCULATIONS ==========

    function getPrice(bytes32 assetKey) public view returns (uint256) {
        OracleConfig memory config = assetOracles[assetKey];
        require(config.chainlinkFeed != address(0) || 
               IBandFeedRegistry(bandFeedRegistry).getFeedAddress(string(abi.encodePacked(assetKey))) != address(0), 
               "No oracle set");
        
        if (cachedTimestamp[assetKey] != 0 && block.timestamp - cachedTimestamp[assetKey] <= config.maxPriceAge) {
            return cachedPrice[assetKey];
        }
        return _fetchFreshPrice(assetKey);
    }

    function calculateZiGTValue() public view returns (uint256) {
        uint256 metalsValue = _calculateMetals();
        uint256 fiatValue = _calculateFiat();
        uint256 cryptoValue = _calculateCrypto();
        return (metalsValue * selectedRatio.metals + fiatValue * selectedRatio.fiat + cryptoValue * selectedRatio.crypto) / 10000;
    }

    function getAllPrices() external returns (string[] memory symbols, uint256[] memory prices, uint256[] memory timestamps) {
        symbols = _getRequiredSymbols(selectedDirection);
        prices = new uint256[](symbols.length);
        timestamps = new uint256[](symbols.length);
        
        for (uint256 i = 0; i < symbols.length; i++) {
            bytes32 assetKey = keccak256(bytes(symbols[i]));
            OracleConfig memory config = assetOracles[assetKey];
            
            if (cachedTimestamp[assetKey] != 0 && block.timestamp - cachedTimestamp[assetKey] <= config.maxPriceAge) {
                prices[i] = cachedPrice[assetKey];
                timestamps[i] = cachedTimestamp[assetKey];
            } else {
                try this.getPrice(assetKey) returns (uint256 price) {
                    prices[i] = price;
                    timestamps[i] = block.timestamp;
                    // Update cache
                    cachedPrice[assetKey] = price;
                    cachedTimestamp[assetKey] = block.timestamp;
                } catch {
                    prices[i] = 0;
                    timestamps[i] = 0;
                }
            }
        }
        emit PricesRetrieved(symbols, prices, timestamps);
        return (symbols, prices, timestamps);
    }

    // ========== INTERNAL FUNCTIONS ==========

    function _authorizeUpgrade(address newImplementation) internal override(UUPSUpgradeable, ZiGCrossChain, ZiGBondingCurve) onlyGovernance {}

    function _fetchFreshPrice(bytes32 assetKey) internal view returns (uint256) {
        OracleConfig memory config = assetOracles[assetKey];
        
        // Try Chainlink first
        if (config.chainlinkFeed != address(0)) {
            try IOracle(config.chainlinkFeed).latestRoundData() returns (
                uint80, int256 price, uint256, uint256 updatedAt, uint80
            ) {
                require(price > 0, "Invalid Chainlink price");
                require(block.timestamp - updatedAt <= config.maxPriceAge, "Stale Chainlink price");
                return uint256(price) * (10 ** (18 - config.decimals));
    } catch {
        if (cachedPrice[assetKey] > 0) {
            return cachedPrice[assetKey]; // Fallback to cached
        }
        revert("Price unavailable");
    }
        }
        
        // Try Band Protocol
        // address bandFeed = IBandFeedRegistry(bandFeedRegistry).getFeedAddress(string(abi.encodePacked(assetKey)));
        address bandFeed = IBandFeedRegistry(bandFeedRegistry).getFeedAddress(_bytes32ToString(assetKey));
        if (bandFeed != address(0)) {
            (string memory base, string memory quote) = _getBandBaseQuote(assetKey);
            try IBandStdReference(bandFeed).getReferenceData(base, quote) returns (
                uint256 rate,
                uint256 lastUpdatedBase,
                uint256 lastUpdatedQuote
            ) {
                require(rate > 0, "Invalid Band price");
                require(block.timestamp - lastUpdatedBase <= config.maxPriceAge, "Stale Band base price");
                require(block.timestamp - lastUpdatedQuote <= config.maxPriceAge, "Stale Band quote price");
                return rate * (10 ** (18 - config.decimals));
            } catch {
                revert("No valid price feed available");
            }
        }
        
        revert("No valid price feed available");
    }
    function _bytes32ToString(bytes32 _key) internal pure returns (string memory) {
        bytes memory bytesArray = new bytes(32);
        for (uint256 i; i < 32; i++) {
            bytesArray[i] = _key[i];
        }
        return string(bytesArray);
    }
    // function _getBandBaseQuote(bytes32 assetKey) internal pure returns (string memory base, string memory quote) {
    //     bytes memory keyBytes = bytes(abi.encodePacked(assetKey));
    //     require(keyBytes.length >= 6, "Invalid asset key");
    //     base = string(abi.encodePacked(keyBytes[0], keyBytes[1], keyBytes[2]));
    //     quote = string(abi.encodePacked(keyBytes[3], keyBytes[4], keyBytes[5]));
    // }

function _getBandBaseQuote(bytes32 assetKey) internal pure returns (string memory base, string memory quote) {
    string memory pair = _bytes32ToString(assetKey);
    bytes memory keyBytes = bytes(pair);
    require(keyBytes.length >= 6, "Invalid asset key");
    base = string(abi.encodePacked(keyBytes[0], keyBytes[1], keyBytes[2]));
    quote = string(abi.encodePacked(keyBytes[3], keyBytes[4], keyBytes[5]));
    if (bytes(base).length == 0 || bytes(quote).length == 0) {
        base = pair; // Fallback to full pair for LiveBandFeed
        quote = "";
    }
}    

    function _setupOracles(StrategicDirection _strategy) internal {
        // Common oracles for all strategies
        _setOracle("XAUUSD", AssetType.METAL, OracleConfig({
            chainlinkFeed: 0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6,
            bandFeed: address(0),
            maxPriceAge: 1 hours,
            decimals: 8,
            description: "Gold/USD"
        }));
        _setOracle("BTCUSD", AssetType.CRYPTO, OracleConfig({
            chainlinkFeed: 0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c,
            bandFeed: address(0),
            maxPriceAge: 1 hours,
            decimals: 8,
            description: "BTC/USD"
        }));
        _setOracle("ETHUSD", AssetType.CRYPTO, OracleConfig({
            chainlinkFeed: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419,
            bandFeed: address(0),
            maxPriceAge: 1 hours,
            decimals: 8,
            description: "ETH/USD"
        }));

        // Strategy-specific oracles
        if (_strategy == StrategicDirection.ZiGMirrorModel || 
            _strategy == StrategicDirection.Famous8PlusZAR || 
            _strategy == StrategicDirection.G20ReserveModel || 
            _strategy == StrategicDirection.PanAfroEurasianModel) {
            
            _setOracle("AUDUSD", AssetType.FIAT, OracleConfig({
                chainlinkFeed: 0x77F9710E7d0A19669A13c055F62cd80d313dF022,
                bandFeed: address(0),
                maxPriceAge: 1 hours,
                decimals: 8,
                description: "AUD/USD"
            }));
            _setOracle("USDZAR", AssetType.FIAT, OracleConfig({
                chainlinkFeed: 0xDE1952A1bF53f8E558cc761ad2564884E55B2c6F,
                bandFeed: address(0),
                maxPriceAge: 1 hours,
                decimals: 8,
                description: "USD/ZAR"
            }));
            _setOracle("EURUSD", AssetType.FIAT, OracleConfig({
                chainlinkFeed: 0x1a81afB8146aeFfCFc5E50e8479e826E7D55b910,
                bandFeed: address(0),
                maxPriceAge: 1 hours,
                decimals: 8,
                description: "EUR/USD"
            }));
            _setOracle("GBPUSD", AssetType.FIAT, OracleConfig({
                chainlinkFeed: 0x1692Bdd32F31b831caAc1b0c9fAF68613682813b,
                bandFeed: address(0),
                maxPriceAge: 1 hours,
                decimals: 8,
                description: "GBP/USD"
            }));
            _setOracle("BNBUSD", AssetType.CRYPTO, OracleConfig({
                chainlinkFeed: 0x14e613ac84a31f709eAdbDf89c6cC390fDc29c9C,
                bandFeed: address(0),
                maxPriceAge: 1 hours,
                decimals: 8,
                description: "BNB/USD"
            }));

            if (_strategy == StrategicDirection.PanAfroEurasianModel) {
                _setOracle("NGNUSD", AssetType.FIAT, OracleConfig({
                    chainlinkFeed: 0x5c0Ab2d9b5a7ed9f470386e82BB36A3613cDd4b5,
                    bandFeed: address(0),
                    maxPriceAge: 1 hours,
                    decimals: 8,
                    description: "NGN/USD"
                }));
                _setOracle("EGPUSD", AssetType.FIAT, OracleConfig({
                    chainlinkFeed: 0x0A6513e40db6EB1b165753AD52E80663aeA50545,
                    bandFeed: address(0),
                    maxPriceAge: 1 hours,
                    decimals: 8,
                    description: "EGP/USD"
                }));
                _setOracle("RUBUSD", AssetType.FIAT, OracleConfig({
                    chainlinkFeed: 0x8A753747A1Fa494EC906cE90E9f37563A8AF630e,
                    bandFeed: address(0),
                    maxPriceAge: 1 hours,
                    decimals: 8,
                    description: "RUB/USD"
                }));
            }
        }
    }

    function _calculateMetals() internal view returns (uint256) {
        uint256 goldPrice = getPrice("XAUUSD");
        if (selectedDirection == StrategicDirection.ZiGMirrorModel) {
            return goldPrice * 50 / 100;
        } else if (selectedDirection == StrategicDirection.Famous8PlusZAR) {
            return goldPrice * 60 / 100;
        }
        return goldPrice * selectedRatio.metals / 10000;
    }

    function _calculateFiat() internal view returns (uint256) {
        if (selectedDirection == StrategicDirection.ZiGMirrorModel) {
            uint256 zar = getPrice("USDZAR") * 40;
            uint256 eur = getPrice("EURUSD") * 30;
            uint256 gbp = getPrice("GBPUSD") * 20;
            uint256 aud = getPrice("AUDUSD") * 10;
            return (zar + eur + gbp >= aud) ? (zar + eur + gbp - aud) / 100 : 0;
        } else if (selectedDirection == StrategicDirection.Famous8PlusZAR) {
            return (
                getPrice("AUDUSD") * 15 +
                getPrice("EURUSD") * 25 +
                getPrice("USDZAR") * 20 +
                getPrice("GBPUSD") * 15 +
                getPrice("USDCHF") * 10 +
                getPrice("USDJPY") * 10 +
                getPrice("NZDUSD") * 5
            ) / 100;
        } else if (selectedDirection == StrategicDirection.PanAfroEurasianModel) {
            return (
                getPrice("USDZAR") * 30 +
                getPrice("NGNUSD") * 20 +
                getPrice("EGPUSD") * 15 +
                getPrice("RUBUSD") * 15 +
                getPrice("TRYUSD") * 10 +
                getPrice("INRUSD") * 10
            ) / 100;
        } else {
            return (
                getPrice("EURUSD") * 35 +
                getPrice("CNYUSD") * 25 +
                getPrice("JPYUSD") * 20 +
                getPrice("GBPUSD") * 15 +
                getPrice("CADUSD") * 5
            ) / 100;
        }
    }

    function _calculateCrypto() internal view returns (uint256) {
        uint256 btcPrice = getPrice("BTCUSD");
        uint256 ethPrice = getPrice("ETHUSD");
        
        if (selectedDirection == StrategicDirection.ZiGMirrorModel) {
            uint256 bnbPrice = getPrice("BNBUSD");
            return (btcPrice * 60 + ethPrice * 30 + bnbPrice * 10) / 100;
        } else if (selectedDirection == StrategicDirection.Famous8PlusZAR) {
            uint256 bnbPrice = getPrice("BNBUSD");
            return (btcPrice * 70 + ethPrice * 20 + bnbPrice * 10) / 100;
        } else if (selectedDirection == StrategicDirection.PanAfroEurasianModel) {
            return btcPrice;
        }
        return (btcPrice * 80 + ethPrice * 20) / 100;
    }

    function _getRequiredSymbols(StrategicDirection _strategy) internal pure returns (string[] memory) {
        if (_strategy == StrategicDirection.ZiGMirrorModel || 
            _strategy == StrategicDirection.Famous8PlusZAR || 
            _strategy == StrategicDirection.G20ReserveModel || 
            _strategy == StrategicDirection.PanAfroEurasianModel) {
            
            string[] memory symbols = new string[](10);
            symbols[0] = "XAUUSD";
            symbols[1] = "BTCUSD";
            symbols[2] = "ETHUSD";
            symbols[3] = "AUDUSD";
            symbols[4] = "USDZAR";
            symbols[5] = "EURUSD";
            symbols[6] = "GBPUSD";
            symbols[7] = "USDCHF";
            symbols[8] = "USDJPY";
            symbols[9] = "BNBUSD";
            
            if (_strategy == StrategicDirection.PanAfroEurasianModel) {
                string[] memory extended = new string[](15);
                for (uint i = 0; i < 10; i++) {
                    extended[i] = symbols[i];
                }
                extended[10] = "NGNUSD";
                extended[11] = "EGPUSD";
                extended[12] = "RUBUSD";
                extended[13] = "TRYUSD";
                extended[14] = "INRUSD";
                return extended;
            }
            return symbols;
        }
        
        string[] memory basicSymbols = new string[](3);
        basicSymbols[0] = "XAUUSD";
        basicSymbols[1] = "BTCUSD";
        basicSymbols[2] = "ETHUSD";
        return basicSymbols;
    }

    function _setOracle(bytes32 assetKey, AssetType assetType, OracleConfig memory config) internal {
        assetOracles[assetKey] = config;
        emit OracleUpdated(assetKey, config.chainlinkFeed, config.bandFeed, config.maxPriceAge, config.decimals, config.description);
    }
}