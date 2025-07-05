// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IZiGOracleHub {
    function getPrice(string memory asset) external view returns (uint256);
    function calculateZiGPrice() external view returns (uint256);
    function getSystemHealth() external view returns (
        uint256 validCryptoFeeds,
        uint256 validMetalFeeds,
        uint256 validForexFeeds,
        uint256 totalFeeds
    );
}

/**
 * @title Oracle Validator
 * @dev Provides validation, monitoring, and alerting for the ZiG oracle system
 */
contract OracleValidator is Ownable, ReentrancyGuard {
    
    struct ValidationRule {
        uint256 minPrice;
        uint256 maxPrice;
        uint256 maxDeviationPercent;
        uint256 stalenessThreshold;
        bool isActive;
    }
    
    struct Alert {
        string asset;
        string alertType;
        uint256 timestamp;
        string message;
        bool isResolved;
    }
    
    IZiGOracleHub public oracleHub;
    
    // Validation rules for different asset types
    mapping(string => ValidationRule) public validationRules;
    
    // Price history for deviation tracking
    mapping(string => uint256[]) public priceHistory;
    mapping(string => uint256) public priceHistoryIndex;
    uint256 public constant MAX_HISTORY_SIZE = 100;
    
    // Alerts and monitoring
    Alert[] public alerts;
    mapping(address => bool) public authorizedValidators;
    
    // Events
    event ValidationRuleSet(string indexed asset, uint256 minPrice, uint256 maxPrice, uint256 maxDeviation);
    event AlertRaised(string indexed asset, string alertType, string message);
    event AlertResolved(uint256 indexed alertId);
    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    
    modifier onlyValidator() {
        require(authorizedValidators[msg.sender] || msg.sender == owner(), "Not authorized validator");
        _;
    }
    
    constructor(address _oracleHub, address initialOwner) Ownable(initialOwner) {
        require(_oracleHub != address(0), "Invalid oracle hub address");
        oracleHub = IZiGOracleHub(_oracleHub);
        authorizedValidators[initialOwner] = true;
        
        // Set default validation rules
        _setDefaultValidationRules();
    }
    
    function _setDefaultValidationRules() internal {
        // Crypto validation rules
        validationRules["BTCUSD"] = ValidationRule({
            minPrice: 10000e18,    // $10,000 minimum
            maxPrice: 200000e18,   // $200,000 maximum
            maxDeviationPercent: 15, // 15% max deviation
            stalenessThreshold: 3600, // 1 hour
            isActive: true
        });
        
        validationRules["ETHUSD"] = ValidationRule({
            minPrice: 500e18,      // $500 minimum
            maxPrice: 10000e18,    // $10,000 maximum
            maxDeviationPercent: 20, // 20% max deviation
            stalenessThreshold: 3600,
            isActive: true
        });
        
        // Metal validation rules
        validationRules["XAUUSD"] = ValidationRule({
            minPrice: 1000e18,     // $1,000 minimum
            maxPrice: 10000e18,    // $10,000 maximum
            maxDeviationPercent: 10, // 10% max deviation
            stalenessThreshold: 7200, // 2 hours
            isActive: true
        });
        
        validationRules["XAGUSD"] = ValidationRule({
            minPrice: 10e18,       // $10 minimum
            maxPrice: 1000e18,     // $1,000 maximum
            maxDeviationPercent: 15,
            stalenessThreshold: 7200,
            isActive: true
        });
        
        // Forex validation rules
        validationRules["EURUSD"] = ValidationRule({
            minPrice: 0.5e18,      // $0.50 minimum
            maxPrice: 2e18,        // $2.00 maximum
            maxDeviationPercent: 5,  // 5% max deviation
            stalenessThreshold: 1800, // 30 minutes
            isActive: true
        });
        
        validationRules["USDZAR"] = ValidationRule({
            minPrice: 10e18,       // 10 ZAR minimum
            maxPrice: 50e18,       // 50 ZAR maximum
            maxDeviationPercent: 10,
            stalenessThreshold: 1800,
            isActive: true
        });
    }
    
    // ======================== VALIDATION FUNCTIONS ======================== //
    
    function validatePrice(string memory asset, uint256 price) external view returns (bool, string memory) {
        ValidationRule memory rule = validationRules[asset];
        
        if (!rule.isActive) {
            return (true, "Validation rule not active");
        }
        
        // Check price bounds
        if (price < rule.minPrice) {
            return (false, "Price below minimum threshold");
        }
        
        if (price > rule.maxPrice) {
            return (false, "Price above maximum threshold");
        }
        
        // Check deviation from historical average
        if (priceHistory[asset].length > 0) {
            uint256 avgPrice = _calculateAveragePrice(asset);
            uint256 deviation = _calculateDeviation(price, avgPrice);
            
            if (deviation > rule.maxDeviationPercent) {
                return (false, "Price deviation too large");
            }
        }
        
        return (true, "Price validation passed");
    }
    
    function validateZiGPrice() external view returns (bool, string memory) {
        try oracleHub.calculateZiGPrice() returns (uint256 price) {
            // ZiG price should be reasonable (between $0.01 and $100)
            if (price < 0.01e18) {
                return (false, "ZiG price too low");
            }
            
            if (price > 100e18) {
                return (false, "ZiG price too high");
            }
            
            return (true, "ZiG price validation passed");
        } catch {
            return (false, "Failed to calculate ZiG price");
        }
    }
    
    // ======================== MONITORING FUNCTIONS ======================== //
    
    function monitorOracleHealth() external view returns (
        bool isHealthy,
        string memory healthStatus,
        uint256 validFeeds,
        uint256 totalFeeds
    ) {
        try oracleHub.getSystemHealth() returns (
            uint256 validCrypto,
            uint256 validMetal,
            uint256 validForex,
            uint256 total
        ) {
            validFeeds = validCrypto + validMetal + validForex;
            totalFeeds = total;
            
            // Consider healthy if at least 80% of feeds are valid
            if (validFeeds >= (total * 80) / 100) {
                isHealthy = true;
                healthStatus = "Healthy";
            } else {
                isHealthy = false;
                healthStatus = "Degraded";
            }
        } catch {
            isHealthy = false;
            healthStatus = "Unavailable";
            validFeeds = 0;
            totalFeeds = 0;
        }
    }
    
    function checkPriceStaleness(string memory asset) external view returns (bool isStale, uint256 lastUpdate) {
        // This would need to be implemented based on the oracle hub's internal timestamp tracking
        // For now, return a placeholder
        return (false, block.timestamp);
    }
    
    // ======================== ALERT MANAGEMENT ======================== //
    
    function raiseAlert(
        string memory asset,
        string memory alertType,
        string memory message
    ) external onlyValidator {
        alerts.push(Alert({
            asset: asset,
            alertType: alertType,
            timestamp: block.timestamp,
            message: message,
            isResolved: false
        }));
        
        emit AlertRaised(asset, alertType, message);
    }
    
    function resolveAlert(uint256 alertId) external onlyValidator {
        require(alertId < alerts.length, "Invalid alert ID");
        require(!alerts[alertId].isResolved, "Alert already resolved");
        
        alerts[alertId].isResolved = true;
        emit AlertResolved(alertId);
    }
    
    function getActiveAlerts() external view returns (Alert[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < alerts.length; i++) {
            if (!alerts[i].isResolved) {
                activeCount++;
            }
        }
        
        Alert[] memory activeAlerts = new Alert[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < alerts.length; i++) {
            if (!alerts[i].isResolved) {
                activeAlerts[index] = alerts[i];
                index++;
            }
        }
        
        return activeAlerts;
    }
    
    // ======================== PRICE HISTORY MANAGEMENT ======================== //
    
    function updatePriceHistory(string memory asset, uint256 price) external onlyValidator {
        uint256 index = priceHistoryIndex[asset];
        
        if (priceHistory[asset].length < MAX_HISTORY_SIZE) {
            priceHistory[asset].push(price);
        } else {
            priceHistory[asset][index] = price;
        }
        
        priceHistoryIndex[asset] = (index + 1) % MAX_HISTORY_SIZE;
    }
    
    function getPriceHistory(string memory asset) external view returns (uint256[] memory) {
        return priceHistory[asset];
    }
    
    function _calculateAveragePrice(string memory asset) internal view returns (uint256) {
        uint256[] memory history = priceHistory[asset];
        if (history.length == 0) return 0;
        
        uint256 sum = 0;
        for (uint256 i = 0; i < history.length; i++) {
            sum += history[i];
        }
        
        return sum / history.length;
    }
    
    function _calculateDeviation(uint256 currentPrice, uint256 averagePrice) internal pure returns (uint256) {
        if (averagePrice == 0) return 0;
        
        uint256 diff = currentPrice > averagePrice ? 
            currentPrice - averagePrice : averagePrice - currentPrice;
        
        return (diff * 100) / averagePrice;
    }
    
    // ======================== ADMIN FUNCTIONS ======================== //
    
    function setValidationRule(
        string memory asset,
        uint256 minPrice,
        uint256 maxPrice,
        uint256 maxDeviationPercent,
        uint256 stalenessThreshold,
        bool isActive
    ) external onlyOwner {
        validationRules[asset] = ValidationRule({
            minPrice: minPrice,
            maxPrice: maxPrice,
            maxDeviationPercent: maxDeviationPercent,
            stalenessThreshold: stalenessThreshold,
            isActive: isActive
        });
        
        emit ValidationRuleSet(asset, minPrice, maxPrice, maxDeviationPercent);
    }
    
    function addValidator(address validator) external onlyOwner {
        require(validator != address(0), "Invalid validator address");
        authorizedValidators[validator] = true;
        emit ValidatorAdded(validator);
    }
    
    function removeValidator(address validator) external onlyOwner {
        authorizedValidators[validator] = false;
        emit ValidatorRemoved(validator);
    }
    
    function setOracleHub(address newOracleHub) external onlyOwner {
        require(newOracleHub != address(0), "Invalid oracle hub address");
        oracleHub = IZiGOracleHub(newOracleHub);
    }
    
    // ======================== UTILITY FUNCTIONS ======================== //
    
    function getAlertCount() external view returns (uint256 total, uint256 active) {
        total = alerts.length;
        for (uint256 i = 0; i < alerts.length; i++) {
            if (!alerts[i].isResolved) {
                active++;
            }
        }
    }
    
    function getValidationRule(string memory asset) external view returns (ValidationRule memory) {
        return validationRules[asset];
    }
} 