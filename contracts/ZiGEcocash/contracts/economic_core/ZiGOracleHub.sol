// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IPriceOracle {
    function getPrice(address token) external view returns (uint256);
}

interface IAggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
    function decimals() external view returns (uint8);
}

interface IBandOracle {
    function getReferenceData(string memory base, string memory quote) 
        external 
        view 
        returns (
            uint256 rate,
            uint256 lastUpdatedBase,
            uint256 lastUpdatedQuote
        );
}

/**
 * @title ZiG Oracle Hub
 * @dev Price oracle for the ZiG ecosystem combining Chainlink, Band Protocol, and internal feeds
 * @dev Now supports DAO-controlled adjustment of asset weights and symbols
 */
contract ZiGOracleHub is Ownable, Pausable, ReentrancyGuard {
    
    struct PriceData {
        uint256 price;
        uint256 timestamp;
        bool isValid;
    }

    struct ChainlinkFeed {
        IAggregatorV3Interface priceFeed;
        bool isActive;
    }

    // Price feeds for C formula (Crypto: BTC, ETH, BNB, XRP, SOL)
    mapping(string => PriceData) public cryptoPrices;
    
    // Price feeds for M formula (Metals: XAU, XPT, XPD, XAG)
    mapping(string => PriceData) public metalPrices;
    
    // Price feeds for F formula (Forex: EUR, GBP, ZAR, JPY, CHF, CNH)
    mapping(string => PriceData) public forexPrices;
    
    // Chainlink price feeds for enhanced reliability
    mapping(string => ChainlinkFeed) public chainlinkFeeds;
    
    // Band Protocol oracle integration
    mapping(string => IBandOracle) public bandOracles;
    mapping(string => bool) public bandOracleActive;
    
    // Oracle addresses for authorization
    mapping(address => bool) public authorizedOracles;
    
    // Token to oracle mapping for external price feeds
    mapping(address => IPriceOracle) public tokenOracles;
    
    // Emergency price feeds for fallback
    mapping(string => PriceData) public emergencyPrices;
    mapping(address => bool) public emergencyOracles;
    
    // DAO-controlled asset weights and symbols
    address public dao;
    string[] public cryptoSymbols;
    uint256[] public cryptoWeights;
    string[] public metalSymbols;
    uint256[] public metalWeights;
    string[] public forexSymbols;
    uint256[] public forexWeights;
    
    uint256 public constant PRICE_STALENESS_THRESHOLD = 3600; // 1 hour
    uint256 public constant EMERGENCY_STALENESS_THRESHOLD = 7200; // 2 hours for emergency feeds
    uint256 public constant PRECISION = 1e18; // 18 decimal precision
    uint256 public constant MAX_PRICE_DEVIATION = 1000; // 10% max deviation (in basis points)
    uint256 public constant TOTAL_WEIGHT_BASIS_POINTS = 10000; // 100% in basis points
    
    // Legacy constants for backward compatibility (deprecated)
    uint256 public constant BTC_WEIGHT = 120; // 0.12 -> 1200 basis points
    uint256 public constant ETH_WEIGHT = 90;  // 0.09 -> 900 basis points
    uint256 public constant BNB_WEIGHT = 30;  // 0.03 -> 300 basis points
    uint256 public constant XRP_WEIGHT = 30;  // 0.03 -> 300 basis points
    uint256 public constant SOL_WEIGHT = 30;  // 0.03 -> 300 basis points
    
    uint256 public constant XAU_WEIGHT = 2000; // 0.20 -> 2000 basis points
    uint256 public constant XPT_WEIGHT = 1000; // 0.10 -> 1000 basis points
    uint256 public constant XPD_WEIGHT = 600;  // 0.06 -> 600 basis points
    uint256 public constant XAG_WEIGHT = 400;  // 0.04 -> 400 basis points
    
    uint256 public constant EUR_WEIGHT = 750;  // 0.075 -> 750 basis points
    uint256 public constant GBP_WEIGHT = 600;  // 0.06 -> 600 basis points
    uint256 public constant ZAR_WEIGHT = 600;  // 0.06 -> 600 basis points
    uint256 public constant JPY_WEIGHT = 300;  // 0.03 -> 300 basis points
    uint256 public constant CHF_WEIGHT = 300;  // 0.03 -> 300 basis points
    uint256 public constant CNH_WEIGHT = 450;  // 0.045 -> 450 basis points
    
    event PriceUpdated(string indexed asset, uint256 price, uint256 timestamp);
    event OracleAdded(address indexed oracle);
    event OracleRemoved(address indexed oracle);
    event TokenOracleSet(address indexed token, address indexed oracle);
    event ChainlinkFeedSet(string indexed asset, address indexed feed);
    event BandOracleSet(string indexed asset, address indexed oracle);
    event EmergencyOracleSet(address indexed oracle, bool status);
    event EmergencyPriceSet(string indexed asset, uint256 price);
    event DaoAddressSet(address indexed dao);
    event AssetWeightsUpdated(string indexed category, string[] symbols, uint256[] weights);
    
    modifier onlyDao() {
        require(msg.sender == dao, "OracleHub: Only DAO can call this function");
        _;
    }
    
    constructor(address initialOwner) Ownable(initialOwner) {
        authorizedOracles[initialOwner] = true;
        emergencyOracles[initialOwner] = true;
        
        // Initialize with default crypto assets and weights
        cryptoSymbols = ["BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD"];
        cryptoWeights = [1200, 900, 300, 300, 300]; // 12%, 9%, 3%, 3%, 3%
        
        // Initialize with default metal assets and weights
        metalSymbols = ["XAUUSD", "XPTUSD", "XPDUSD", "XAGUSD"];
        metalWeights = [2000, 1000, 600, 400]; // 20%, 10%, 6%, 4%
        
        // Initialize with default forex assets and weights
        forexSymbols = ["EURUSD", "GBPUSD", "USDZAR", "USDJPY", "USDCHF", "USDCNH"];
        forexWeights = [750, 600, 600, 300, 300, 450]; // 7.5%, 6%, 6%, 3%, 3%, 4.5%
    }

    // ======================== DAO MANAGEMENT ======================== //
    
    function setDaoAddress(address _dao) external onlyOwner {
        require(_dao != address(0), "Invalid DAO address");
        dao = _dao;
        emit DaoAddressSet(_dao);
    }
    
    function setAssetWeightsAndSymbols(
        string[] calldata symbols,
        uint256[] calldata weights,
        string calldata category
    ) external onlyDao {
        require(symbols.length == weights.length, "Arrays length mismatch");
        require(symbols.length > 0, "Must have at least one asset");
        require(symbols.length <= 20, "Too many assets");
        
        // Validate weights sum to 100%
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < weights.length; i++) {
            require(weights[i] > 0, "Weight must be positive");
            totalWeight += weights[i];
        }
        require(totalWeight == TOTAL_WEIGHT_BASIS_POINTS, "Weights must sum to 100%");
        
        // Validate symbols are not empty
        for (uint256 i = 0; i < symbols.length; i++) {
            require(bytes(symbols[i]).length > 0, "Symbol cannot be empty");
        }
        
        // Update storage based on category
        if (keccak256(bytes(category)) == keccak256(bytes("crypto"))) {
            cryptoSymbols = symbols;
            cryptoWeights = weights;
        } else if (keccak256(bytes(category)) == keccak256(bytes("metal"))) {
            metalSymbols = symbols;
            metalWeights = weights;
        } else if (keccak256(bytes(category)) == keccak256(bytes("forex"))) {
            forexSymbols = symbols;
            forexWeights = weights;
        } else {
            revert("Invalid category");
        }
        
        emit AssetWeightsUpdated(category, symbols, weights);
    }
    
    // Getter functions for current weights and symbols
    function getCryptoAssets() external view returns (string[] memory, uint256[] memory) {
        return (cryptoSymbols, cryptoWeights);
    }
    
    function getMetalAssets() external view returns (string[] memory, uint256[] memory) {
        return (metalSymbols, metalWeights);
    }
    
    function getForexAssets() external view returns (string[] memory, uint256[] memory) {
        return (forexSymbols, forexWeights);
    }

    // ======================== ORACLE INTEGRATIONS ======================== //

    // Chainlink integration functions
    function setChainlinkFeed(string memory asset, address feedAddress) external onlyOwner {
        require(feedAddress != address(0), "Invalid feed address");
        chainlinkFeeds[asset] = ChainlinkFeed(IAggregatorV3Interface(feedAddress), true);
        emit ChainlinkFeedSet(asset, feedAddress);
    }

    function toggleChainlinkFeed(string memory asset, bool isActive) external onlyOwner {
        chainlinkFeeds[asset].isActive = isActive;
    }

    function getChainlinkPrice(string memory asset) public view returns (uint256, bool) {
        ChainlinkFeed memory feed = chainlinkFeeds[asset];
        if (!feed.isActive || address(feed.priceFeed) == address(0)) {
            return (0, false);
        }

        try feed.priceFeed.latestRoundData() returns (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            if (price <= 0 || updatedAt == 0 || block.timestamp - updatedAt > PRICE_STALENESS_THRESHOLD) {
                return (0, false);
            }
            
            uint8 decimals = feed.priceFeed.decimals();
            uint256 adjustedPrice = uint256(price) * (10 ** (18 - decimals));
            return (adjustedPrice, true);
        } catch {
            return (0, false);
        }
    }

    // Band Protocol integration functions
    function setBandOracle(string memory asset, address oracleAddress) external onlyOwner {
        require(oracleAddress != address(0), "Invalid oracle address");
        bandOracles[asset] = IBandOracle(oracleAddress);
        bandOracleActive[asset] = true;
        emit BandOracleSet(asset, oracleAddress);
    }

    function toggleBandOracle(string memory asset, bool isActive) external onlyOwner {
        bandOracleActive[asset] = isActive;
    }

    function getBandPrice(string memory asset) public view returns (uint256, bool) {
        if (!bandOracleActive[asset] || address(bandOracles[asset]) == address(0)) {
            return (0, false);
        }

        try bandOracles[asset].getReferenceData(asset, "USD") returns (
            uint256 rate,
            uint256 lastUpdatedBase,
            uint256 lastUpdatedQuote
        ) {
            uint256 lastUpdated = lastUpdatedBase > lastUpdatedQuote ? 
                lastUpdatedBase : lastUpdatedQuote;
                
            if (rate == 0 || block.timestamp - lastUpdated > PRICE_STALENESS_THRESHOLD) {
                return (0, false);
            }
            return (rate, true);
        } catch {
            return (0, false);
        }
    }

    // ======================== PRICE GETTERS ======================== //

    /**
     * @dev Universal price fetcher with fallback cascade
     * Priority: Chainlink -> Band -> Internal -> Emergency
     */
    function getPrice(string memory asset) external view returns (uint256) {
        // 1. First try Chainlink (most reliable external oracle)
        (uint256 chainlinkPrice, bool chainlinkValid) = getChainlinkPrice(asset);
        if (chainlinkValid) {
            return chainlinkPrice;
        }

        // 2. Fallback to Band Protocol (secondary external oracle)
        (uint256 bandPrice, bool bandValid) = getBandPrice(asset);
        if (bandValid) {
            return bandPrice;
        }

        // 3. Check internal primary oracles (crypto/metal/forex)
        if (_isPriceValid(asset, cryptoPrices)) {
            return cryptoPrices[asset].price;
        }
        if (_isPriceValid(asset, metalPrices)) {
            return metalPrices[asset].price;
        }
        if (_isPriceValid(asset, forexPrices)) {
            return forexPrices[asset].price;
        }

        // 4. Last resort: Emergency price
        if (_isEmergencyPriceValid(asset)) {
            return emergencyPrices[asset].price;
        }

        // If all else fails, revert
        revert(string(abi.encodePacked("No valid price source for ", asset)));
    }

    // Enhanced price validation with Chainlink and Band fallback
    function getPriceWithFallback(string memory asset, string memory category) public view returns (uint256) {
        // Try primary oracle first
        mapping(string => PriceData) storage prices = cryptoPrices;
        
        if (keccak256(bytes(category)) == keccak256(bytes("crypto"))) {
            prices = cryptoPrices;
        } else if (keccak256(bytes(category)) == keccak256(bytes("metal"))) {
            prices = metalPrices;
        } else if (keccak256(bytes(category)) == keccak256(bytes("forex"))) {
            prices = forexPrices;
        } else {
            revert("Invalid category");
        }

        // Check if primary oracle price is valid
        if (_isPriceValid(asset, prices)) {
            return prices[asset].price;
        }

        // Fallback to Chainlink
        (uint256 chainlinkPrice, bool chainlinkValid) = getChainlinkPrice(asset);
        if (chainlinkValid) {
            return chainlinkPrice;
        }

        // Fallback to Band Protocol
        (uint256 bandPrice, bool bandValid) = getBandPrice(asset);
        if (bandValid) {
            return bandPrice;
        }

        // Emergency fallback
        if (_isEmergencyPriceValid(asset)) {
            return emergencyPrices[asset].price;
        }

        revert(string(abi.encodePacked("No valid price for ", asset)));
    }

    // ======================== TOKEN ORACLE FUNCTIONS ======================== //

    function setTokenOracle(address token, address oracleAddress) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(oracleAddress != address(0), "Invalid oracle address");
        tokenOracles[token] = IPriceOracle(oracleAddress);
        emit TokenOracleSet(token, oracleAddress);
    }

    function getTokenPrice(address token) external view returns (uint256) {
        IPriceOracle oracle = tokenOracles[token];
        require(address(oracle) != address(0), "Oracle not set for token");
        return oracle.getPrice(token);
    }

    function getGoldPricePerMg(address paxgAddress) external view returns (uint256) {
        require(paxgAddress != address(0), "Invalid PAXG address");
        IPriceOracle oracle = tokenOracles[paxgAddress];
        require(address(oracle) != address(0), "PAXG oracle not set");
        uint256 pricePerGram = oracle.getPrice(paxgAddress);
        return pricePerGram / 1000; // 1 gram = 1000 mg
    }

    // ======================== EMERGENCY FUNCTIONS ======================== //

    function setEmergencyOracle(address oracle, bool status) external onlyOwner {
        require(oracle != address(0), "Invalid oracle address");
        emergencyOracles[oracle] = status;
        emit EmergencyOracleSet(oracle, status);
    }

    function setEmergencyPrice(string memory asset, uint256 price) external {
        require(emergencyOracles[msg.sender], "Not authorized emergency oracle");
        require(price > 0, "Price must be greater than 0");
        
        emergencyPrices[asset] = PriceData(price, block.timestamp, true);
        emit EmergencyPriceSet(asset, price);
    }

    function _isEmergencyPriceValid(string memory asset) internal view returns (bool) {
        PriceData memory priceData = emergencyPrices[asset];
        return priceData.isValid && 
               priceData.price > 0 && 
               (block.timestamp - priceData.timestamp) <= EMERGENCY_STALENESS_THRESHOLD;
    }

    // ======================== ORACLE MANAGEMENT ======================== //
            
    modifier onlyOracle() {
        require(authorizedOracles[msg.sender], "OracleHub: Not authorized oracle");
        _;
    }
    
    function addOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle address");
        authorizedOracles[_oracle] = true;
        emit OracleAdded(_oracle);
    }
    
    function removeOracle(address _oracle) external onlyOwner {
        authorizedOracles[_oracle] = false;
        emit OracleRemoved(_oracle);
    }

    // ======================== PRICE UPDATE FUNCTIONS ======================== //
    
    function updateCryptoPrice(string memory _asset, uint256 _price) external onlyOracle whenNotPaused {
        require(_price > 0, "Price must be greater than 0");
        require(bytes(_asset).length > 0, "Asset name cannot be empty");
        
        _validatePriceDeviation(_asset, _price, "crypto");
        
        cryptoPrices[_asset] = PriceData(_price, block.timestamp, true);
        emit PriceUpdated(_asset, _price, block.timestamp);
    }
    
    function updateMetalPrice(string memory _asset, uint256 _price) external onlyOracle whenNotPaused {
        require(_price > 0, "Price must be greater than 0");
        require(bytes(_asset).length > 0, "Asset name cannot be empty");
        
        _validatePriceDeviation(_asset, _price, "metal");
        
        metalPrices[_asset] = PriceData(_price, block.timestamp, true);
        emit PriceUpdated(_asset, _price, block.timestamp);
    }
    
    function updateForexPrice(string memory _asset, uint256 _price) external onlyOracle whenNotPaused {
        require(_price > 0, "Price must be greater than 0");
        require(bytes(_asset).length > 0, "Asset name cannot be empty");
        
        _validatePriceDeviation(_asset, _price, "forex");
        
        forexPrices[_asset] = PriceData(_price, block.timestamp, true);
        emit PriceUpdated(_asset, _price, block.timestamp);
    }

    function _validatePriceDeviation(string memory asset, uint256 newPrice, string memory category) internal view {
        mapping(string => PriceData) storage prices = cryptoPrices;
        
        if (keccak256(bytes(category)) == keccak256(bytes("crypto"))) {
            prices = cryptoPrices;
        } else if (keccak256(bytes(category)) == keccak256(bytes("metal"))) {
            prices = metalPrices;
        } else if (keccak256(bytes(category)) == keccak256(bytes("forex"))) {
            prices = forexPrices;
        } else {
            return; // Skip validation for unknown categories
        }

        PriceData memory currentData = prices[asset];
        if (!currentData.isValid || currentData.price == 0) {
            return; // Skip validation for first price update
        }

        uint256 currentPrice = currentData.price;
        uint256 priceDiff = newPrice > currentPrice ? newPrice - currentPrice : currentPrice - newPrice;
        uint256 maxDeviation = (currentPrice * MAX_PRICE_DEVIATION) / 10000;

        require(priceDiff <= maxDeviation, "Price deviation too large");
    }

    // ======================== ZIG PRICE CALCULATION ======================== //
    
    /**
     * @dev Calculate ZiG backing value using C + M + F formulas with DAO-controlled weights
     * C = Sum of (cryptoWeights[i] * cryptoPrices[i]) / 10000
     * M = Sum of (metalWeights[i] * metalPrices[i]) / 10000  
     * F = Sum of (forexWeights[i] * forexPrices[i]) / 10000
     */
    function calculateZiGPrice() external view returns (uint256) {
        uint256 C = calculateCryptoComponent();
        uint256 M = calculateMetalComponent();
        uint256 F = calculateForexComponent();
        
        return C + M + F;
    }
    
    function calculateCryptoComponent() public view returns (uint256) {
        uint256 total = 0;
        
        for (uint256 i = 0; i < cryptoSymbols.length; i++) {
            uint256 price = getPriceWithFallback(cryptoSymbols[i], "crypto");
            uint256 weight = cryptoWeights[i];
            
            // Apply special scaling for BTC and ETH as per original formula
            if (keccak256(bytes(cryptoSymbols[i])) == keccak256(bytes("BTCUSD"))) {
                total += (price * weight) / 10000 / 1000; // BTC: divide by 1000
            } else if (keccak256(bytes(cryptoSymbols[i])) == keccak256(bytes("ETHUSD"))) {
                total += (price * weight) / 10000 / 100;   // ETH: divide by 100
            } else if (keccak256(bytes(cryptoSymbols[i])) == keccak256(bytes("XRPUSD"))) {
                total += (price * weight) / 10000 * 10;    // XRP: multiply by 10
            } else {
                total += (price * weight) / 10000;          // Others: normal scaling
            }
        }
        
        return total;
    }
    
    function calculateMetalComponent() public view returns (uint256) {
        uint256 total = 0;
        
        for (uint256 i = 0; i < metalSymbols.length; i++) {
            uint256 price = getPriceWithFallback(metalSymbols[i], "metal");
            uint256 weight = metalWeights[i];
            total += (price * weight) / 10000;
        }
        
        return total;
    }
    
    function calculateForexComponent() public view returns (uint256) {
        uint256 total = 0;
        
        for (uint256 i = 0; i < forexSymbols.length; i++) {
            uint256 price = getPriceWithFallback(forexSymbols[i], "forex");
            uint256 weight = forexWeights[i];
            
            // Apply inverse scaling for forex pairs (divide by price)
            if (keccak256(bytes(forexSymbols[i])) == keccak256(bytes("USDZAR")) ||
                keccak256(bytes(forexSymbols[i])) == keccak256(bytes("USDJPY")) ||
                keccak256(bytes(forexSymbols[i])) == keccak256(bytes("USDCHF")) ||
                keccak256(bytes(forexSymbols[i])) == keccak256(bytes("USDCNH"))) {
                total += (PRECISION * weight) / (price * 10000);
            } else {
                total += (price * weight) / 10000;
            }
        }
        
        return total;
    }

    // ======================== UTILITY FUNCTIONS ======================== //
    
    function _isPriceValid(string memory _asset, mapping(string => PriceData) storage _prices) internal view returns (bool) {
        PriceData memory priceData = _prices[_asset];
        return priceData.isValid && 
               priceData.price > 0 && 
               (block.timestamp - priceData.timestamp) <= PRICE_STALENESS_THRESHOLD;
    }
    
    function isPriceStale(string memory _asset, string memory _category) external view returns (bool) {
        mapping(string => PriceData) storage prices = cryptoPrices;
        
        if (keccak256(bytes(_category)) == keccak256(bytes("crypto"))) {
            prices = cryptoPrices;
        } else if (keccak256(bytes(_category)) == keccak256(bytes("metal"))) {
            prices = metalPrices;
        } else if (keccak256(bytes(_category)) == keccak256(bytes("forex"))) {
            prices = forexPrices;
        } else {
            revert("Invalid category");
        }
        
        return (block.timestamp - prices[_asset].timestamp) > PRICE_STALENESS_THRESHOLD;
    }
    
    function getAssetPrice(string memory _asset, string memory _category) external view returns (uint256, uint256, bool) {
        mapping(string => PriceData) storage prices = cryptoPrices;
        
        if (keccak256(bytes(_category)) == keccak256(bytes("crypto"))) {
            prices = cryptoPrices;
        } else if (keccak256(bytes(_category)) == keccak256(bytes("metal"))) {
            prices = metalPrices;
        } else if (keccak256(bytes(_category)) == keccak256(bytes("forex"))) {
            prices = forexPrices;
        } else {
            revert("Invalid category");
        }
        
        PriceData memory priceData = prices[_asset];
        return (priceData.price, priceData.timestamp, priceData.isValid);
    }

    // ======================== BATCH UPDATE FUNCTIONS ======================== //

    function batchUpdateCryptoPrices(
        string[] memory assets,
        uint256[] memory prices
    ) external onlyOracle whenNotPaused {
        require(assets.length == prices.length, "Arrays length mismatch");
        require(assets.length <= 10, "Too many assets in batch");
        
        for (uint256 i = 0; i < assets.length; i++) {
            require(prices[i] > 0, "Price must be greater than 0");
            require(bytes(assets[i]).length > 0, "Asset name cannot be empty");
            
            _validatePriceDeviation(assets[i], prices[i], "crypto");
            cryptoPrices[assets[i]] = PriceData(prices[i], block.timestamp, true);
            emit PriceUpdated(assets[i], prices[i], block.timestamp);
        }
    }

    function batchUpdateMetalPrices(
        string[] memory assets,
        uint256[] memory prices
    ) external onlyOracle whenNotPaused {
        require(assets.length == prices.length, "Arrays length mismatch");
        require(assets.length <= 10, "Too many assets in batch");
        
        for (uint256 i = 0; i < assets.length; i++) {
            require(prices[i] > 0, "Price must be greater than 0");
            require(bytes(assets[i]).length > 0, "Asset name cannot be empty");
            
            _validatePriceDeviation(assets[i], prices[i], "metal");
            metalPrices[assets[i]] = PriceData(prices[i], block.timestamp, true);
            emit PriceUpdated(assets[i], prices[i], block.timestamp);
        }
    }

    function batchUpdateForexPrices(
        string[] memory assets,
        uint256[] memory prices
    ) external onlyOracle whenNotPaused {
        require(assets.length == prices.length, "Arrays length mismatch");
        require(assets.length <= 10, "Too many assets in batch");
        
        for (uint256 i = 0; i < assets.length; i++) {
            require(prices[i] > 0, "Price must be greater than 0");
            require(bytes(assets[i]).length > 0, "Asset name cannot be empty");
            
            _validatePriceDeviation(assets[i], prices[i], "forex");
            forexPrices[assets[i]] = PriceData(prices[i], block.timestamp, true);
            emit PriceUpdated(assets[i], prices[i], block.timestamp);
        }
    }

    // ======================== HEALTH CHECK FUNCTIONS ======================== //

    function getSystemHealth() external view returns (
        uint256 validCryptoFeeds,
        uint256 validMetalFeeds,
        uint256 validForexFeeds,
        uint256 totalFeeds
    ) {
        for (uint256 i = 0; i < cryptoSymbols.length; i++) {
            if (_isPriceValid(cryptoSymbols[i], cryptoPrices)) validCryptoFeeds++;
        }
        
        for (uint256 i = 0; i < metalSymbols.length; i++) {
            if (_isPriceValid(metalSymbols[i], metalPrices)) validMetalFeeds++;
        }
        
        for (uint256 i = 0; i < forexSymbols.length; i++) {
            if (_isPriceValid(forexSymbols[i], forexPrices)) validForexFeeds++;
        }
        
        totalFeeds = cryptoSymbols.length + metalSymbols.length + forexSymbols.length;
    }

    // ======================== ADMIN FUNCTIONS ======================== //
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
}