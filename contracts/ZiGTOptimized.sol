// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@prb/math/src/UD60x18.sol";

interface IOracle {
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
}

interface IBandStdReference {
    function getReferenceData(string memory base, string memory quote) external view returns (
        uint256 rate, uint256 lastUpdatedBase, uint256 lastUpdatedQuote
    );
}

interface IBandFeedRegistry {
    function getFeedAddress(string memory assetPair) external view returns (address);
}

contract ZiGTOptimized is 
    Initializable,
    ERC20Upgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    address public governance;
    address public bandFeedRegistry;
    uint256 public feePercentage;
    uint256 public lastRebalance;
    uint256 public rebalanceCooldown;
    
    enum StrategicDirection { Famous8PlusZAR, G20ReserveModel, PanAfroEurasianModel, ZiGMirrorModel }
    StrategicDirection public selectedDirection;
    
    struct OracleConfig {
        address chainlinkFeed;
        address bandFeed;
        uint8 decimals;
        uint256 maxPriceAge;
    }
    
    struct CachedPrice {
        uint256 price;
        uint256 timestamp;
    }
    
    mapping(bytes32 => OracleConfig) public assetOracles;
    mapping(bytes32 => CachedPrice) public cachedPrices;
    mapping(StrategicDirection => bytes32[]) public strategyAssets;
    
    event PriceUpdated(bytes32 indexed assetKey, uint256 price);
    event Rebalanced();
    event StrategyUpdated(StrategicDirection newStrategy);
    event FeeCharged(address indexed user, uint256 amount);
    // Add this event at the top of your contract
    event OracleUpdated(bytes32 indexed assetKey, address chainlinkFeed, address bandPair);

    modifier onlyGovernance() {
        require(msg.sender == governance, "Unauthorized");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

// Add this function with proper visibility
    function setOracleConfig(
        bytes32 assetKey,
        address chainlinkFeed,
        address bandFeed,  // Changed from string calldata to address
        uint8 decimals,
        uint256 maxPriceAge
    ) external onlyGovernance {
        assetOracles[assetKey] = OracleConfig(
            chainlinkFeed,
            bandFeed,
            decimals,
            maxPriceAge
        );
        emit OracleUpdated(assetKey, chainlinkFeed, bandFeed);
    }

    function setOracleConfigWithPair(
        bytes32 assetKey,
        address chainlinkFeed,
        string calldata bandPair,  // e.g., "XAUUSD"
        uint8 decimals,
        uint256 maxPriceAge
    ) external onlyGovernance {
        address bandFeed = IBandFeedRegistry(bandFeedRegistry).getFeedAddress(bandPair);
        assetOracles[assetKey] = OracleConfig(
            chainlinkFeed,
            bandFeed,
            decimals,
            maxPriceAge
        );
        emit OracleUpdated(assetKey, chainlinkFeed, bandFeed);
    }
    function initialize(
        address bandFeedRegistry_,
        address initialGovernance
    ) public initializer {
        __ERC20_init("Optimized ZiGT", "ZiGT-O");
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        bandFeedRegistry = bandFeedRegistry_;
        governance = initialGovernance;
        feePercentage = 100; // 1%
        rebalanceCooldown = 1 days;
        
        _initializeStrategies();
        selectedDirection = StrategicDirection.ZiGMirrorModel;
    }

    // ========== STRATEGY MANAGEMENT ==========
    function _initializeStrategies() internal {
        // ZiGMirrorModel Assets
        bytes32[] memory mirrorAssets = new bytes32[](5);
        mirrorAssets[0] = keccak256("XAUUSD");
        mirrorAssets[1] = keccak256("BTCUSD");
        mirrorAssets[2] = keccak256("ETHUSD");
        mirrorAssets[3] = keccak256("USDZAR");
        mirrorAssets[4] = keccak256("BNBUSD");
        strategyAssets[StrategicDirection.ZiGMirrorModel] = mirrorAssets;

        // PanAfroEurasianModel Assets
        bytes32[] memory afroAssets = new bytes32[](8);
        afroAssets[0] = keccak256("XAUUSD");
        afroAssets[1] = keccak256("BTCUSD");
        afroAssets[2] = keccak256("NGNUSD");
        afroAssets[3] = keccak256("EGPUSD");
        afroAssets[4] = keccak256("RUBUSD");
        afroAssets[5] = keccak256("TRYUSD");
        afroAssets[6] = keccak256("INRUSD");
        afroAssets[7] = keccak256("ETHUSD");
        strategyAssets[StrategicDirection.PanAfroEurasianModel] = afroAssets;
    }

    function updateStrategy(StrategicDirection newDirection) external onlyGovernance {
        selectedDirection = newDirection;
        emit StrategyUpdated(newDirection);
    }

    function rebalance() external onlyGovernance {
        require(block.timestamp > lastRebalance + rebalanceCooldown, "Cooldown active");
        lastRebalance = block.timestamp;
        emit Rebalanced();
    }

    // ========== PRICE MANAGEMENT ==========
    function updatePrice(bytes32 assetKey) public {
        OracleConfig memory config = assetOracles[assetKey];
        require(config.chainlinkFeed != address(0) || config.bandFeed != address(0), "No oracle");
        
        uint256 freshPrice = _fetchFreshPrice(assetKey);
        cachedPrices[assetKey] = CachedPrice(freshPrice, block.timestamp);
        emit PriceUpdated(assetKey, freshPrice);
    }

    function batchUpdatePrices(bytes32[] calldata assetKeys) external {
        for (uint256 i = 0; i < assetKeys.length; i++) {
            updatePrice(assetKeys[i]);
        }
    }
    
    function getPrice(bytes32 assetKey) public view returns (uint256) {
        CachedPrice memory cache = cachedPrices[assetKey];
        OracleConfig memory config = assetOracles[assetKey];
        
        if (block.timestamp <= cache.timestamp + config.maxPriceAge) {
            return cache.price;
        }
        return _fetchFreshPrice(assetKey);
    }

    function _fetchFreshPrice(bytes32 assetKey) internal view returns (uint256) {
        OracleConfig memory config = assetOracles[assetKey];
        uint256 price;
        bool success;
        
        // Try Chainlink first
        if (config.chainlinkFeed != address(0)) {
            try IOracle(config.chainlinkFeed).latestRoundData() 
                returns (uint80, int256 answer, uint256, uint256 updatedAt, uint80)
            {
                require(block.timestamp - updatedAt <= config.maxPriceAge, "Stale price");
                price = uint256(answer) * (10 ** (18 - config.decimals));
                success = true;
            } catch {}
        }
        
        // Fallback to Band Protocol
        if (!success && config.bandFeed != address(0)) {
            (string memory base, string memory quote) = _splitAssetKey(assetKey);
            try IBandStdReference(config.bandFeed).getReferenceData(base, quote) 
                returns (uint256 rate, uint256 baseUpdated, uint256 quoteUpdated)
            {
                require(block.timestamp - baseUpdated <= config.maxPriceAge, "Stale base");
                require(block.timestamp - quoteUpdated <= config.maxPriceAge, "Stale quote");
                price = rate * (10 ** (18 - config.decimals));
                success = true;
            } catch {}
        }
        
        require(success, "Price fetch failed");
        return price;
    }

    // ========== TOKEN OPERATIONS ==========
    function mint(uint256 amount) external payable nonReentrant {
        uint256 fee = (amount * feePercentage) / 10000;
        _mint(msg.sender, amount - fee);
        if (fee > 0) {
            _mint(governance, fee);
            emit FeeCharged(msg.sender, fee);
        }
    }

    function burn(uint256 amount) external nonReentrant {
        uint256 fee = (amount * feePercentage) / 10000;
        _burn(msg.sender, amount);
        _mint(governance, fee);
        emit FeeCharged(msg.sender, fee);
    }

    // ========== HELPER FUNCTIONS ==========
    function _splitAssetKey(bytes32 assetKey) internal pure returns (string memory base, string memory quote) {
        bytes memory symbols = bytes(_bytes32ToString(assetKey));
        require(symbols.length == 6, "Invalid asset key");
        base = string(abi.encodePacked(symbols[0], symbols[1], symbols[2]));
        quote = string(abi.encodePacked(symbols[3], symbols[4], symbols[5]));
    }

    function _bytes32ToString(bytes32 _key) internal pure returns (string memory) {
        bytes memory bytesArray = new bytes(32);
        for (uint256 i; i < 32; i++) {
            bytesArray[i] = _key[i];
        }
        return string(bytesArray);
    }

    function _authorizeUpgrade(address) internal override onlyGovernance {}
}