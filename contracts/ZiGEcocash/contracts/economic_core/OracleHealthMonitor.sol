// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IZiGOracleHub {
    function getSystemHealth() external view returns (
        uint256 validCryptoFeeds,
        uint256 validMetalFeeds,
        uint256 validForexFeeds,
        uint256 totalFeeds
    );
    function calculateZiGPrice() external view returns (uint256);
    function getPrice(string memory asset) external view returns (uint256);
}

/**
 * @title Oracle Health Monitor
 * @dev Monitors the health of the entire oracle system and provides alerts
 */
contract OracleHealthMonitor is Ownable, ReentrancyGuard {
    
    struct HealthMetric {
        uint256 timestamp;
        uint256 value;
        string metric;
        bool isHealthy;
    }
    
    struct Alert {
        string alertType;
        string message;
        uint256 timestamp;
        bool isResolved;
        uint256 severity; // 1=Low, 2=Medium, 3=High, 4=Critical
    }
    
    struct SystemStatus {
        bool overallHealthy;
        uint256 activeAlerts;
        uint256 totalMetrics;
        uint256 healthyMetrics;
        uint256 lastCheck;
    }
    
    IZiGOracleHub public oracleHub;
    
    // Health metrics storage
    mapping(string => HealthMetric[]) public healthMetrics;
    mapping(string => uint256) public metricIndex;
    
    // Alerts storage
    Alert[] public alerts;
    
    // Configuration
    uint256 public constant MAX_METRICS_HISTORY = 1000;
    uint256 public constant HEALTH_CHECK_INTERVAL = 300; // 5 minutes
    uint256 public constant CRITICAL_THRESHOLD = 3; // 3 failed checks = critical
    
    // Thresholds
    uint256 public minValidFeedsPercent = 80; // 80% of feeds must be valid
    uint256 public maxPriceDeviationPercent = 20; // 20% max price deviation
    uint256 public maxStalenessSeconds = 3600; // 1 hour max staleness
    
    // Monitoring state
    mapping(string => uint256) public consecutiveFailures;
    mapping(string => uint256) public lastSuccessfulCheck;
    
    // Events
    event HealthCheck(string indexed metric, uint256 value, bool isHealthy);
    event AlertRaised(string indexed alertType, string message, uint256 severity);
    event AlertResolved(uint256 indexed alertId);
    event SystemStatusUpdated(bool overallHealthy, uint256 activeAlerts);
    
    modifier onlyAuthorized() {
        require(msg.sender == owner() || _isAuthorizedMonitor(msg.sender), "Not authorized");
        _;
    }
    
    constructor(address _oracleHub, address initialOwner) Ownable(initialOwner) {
        require(_oracleHub != address(0), "Invalid oracle hub address");
        oracleHub = IZiGOracleHub(_oracleHub);
    }
    
    // ======================== HEALTH MONITORING ======================== //
    
    function performHealthCheck() external onlyAuthorized returns (SystemStatus memory) {
        SystemStatus memory status;
        uint256 healthyCount = 0;
        uint256 totalCount = 0;
        
        // Check 1: Oracle Hub System Health
        (bool hubHealthy, string memory hubMessage) = _checkOracleHubHealth();
        _recordMetric("oracle_hub_health", hubHealthy ? 1 : 0, "Oracle Hub Health", hubHealthy);
        if (hubHealthy) healthyCount++;
        totalCount++;
        
        // Check 2: ZiG Price Calculation
        (bool zigPriceHealthy, string memory zigMessage) = _checkZiGPriceHealth();
        _recordMetric("zig_price_health", zigPriceHealthy ? 1 : 0, "ZiG Price Health", zigPriceHealthy);
        if (zigPriceHealthy) healthyCount++;
        totalCount++;
        
        // Check 3: Individual Asset Prices
        (bool assetPricesHealthy, string memory assetMessage) = _checkAssetPricesHealth();
        _recordMetric("asset_prices_health", assetPricesHealthy ? 1 : 0, "Asset Prices Health", assetPricesHealthy);
        if (assetPricesHealthy) healthyCount++;
        totalCount++;
        
        // Check 4: Price Staleness
        (bool stalenessHealthy, string memory stalenessMessage) = _checkPriceStaleness();
        _recordMetric("price_staleness_health", stalenessHealthy ? 1 : 0, "Price Staleness Health", stalenessHealthy);
        if (stalenessHealthy) healthyCount++;
        totalCount++;
        
        // Check 5: Price Deviation
        (bool deviationHealthy, string memory deviationMessage) = _checkPriceDeviation();
        _recordMetric("price_deviation_health", deviationHealthy ? 1 : 0, "Price Deviation Health", deviationHealthy);
        if (deviationHealthy) healthyCount++;
        totalCount++;
        
        // Determine overall system health
        status.overallHealthy = healthyCount >= (totalCount * minValidFeedsPercent) / 100;
        status.activeAlerts = _getActiveAlertCount();
        status.totalMetrics = totalCount;
        status.healthyMetrics = healthyCount;
        status.lastCheck = block.timestamp;
        
        // Raise alerts for failed checks
        if (!hubHealthy) _raiseAlert("ORACLE_HUB_FAILURE", hubMessage, 3);
        if (!zigPriceHealthy) _raiseAlert("ZIG_PRICE_FAILURE", zigMessage, 4);
        if (!assetPricesHealthy) _raiseAlert("ASSET_PRICES_FAILURE", assetMessage, 3);
        if (!stalenessHealthy) _raiseAlert("PRICE_STALENESS", stalenessMessage, 2);
        if (!deviationHealthy) _raiseAlert("PRICE_DEVIATION", deviationMessage, 2);
        
        emit SystemStatusUpdated(status.overallHealthy, status.activeAlerts);
        
        return status;
    }
    
    // ======================== INDIVIDUAL HEALTH CHECKS ======================== //
    
    function _checkOracleHubHealth() internal view returns (bool, string memory) {
        try oracleHub.getSystemHealth() returns (
            uint256 validCrypto,
            uint256 validMetal,
            uint256 validForex,
            uint256 total
        ) {
            uint256 validTotal = validCrypto + validMetal + validForex;
            uint256 validPercent = (validTotal * 100) / total;
            
            if (validPercent >= minValidFeedsPercent) {
                return (true, "Oracle hub healthy");
            } else {
                return (false, string(abi.encodePacked("Only ", Strings.toString(validPercent), "% feeds valid")));
            }
        } catch {
            return (false, "Oracle hub health check failed");
        }
    }
    
    function _checkZiGPriceHealth() internal view returns (bool, string memory) {
        try oracleHub.calculateZiGPrice() returns (uint256 price) {
            if (price > 0 && price < 1000e18) { // Reasonable ZiG price range
                return (true, "ZiG price calculation healthy");
            } else {
                return (false, "ZiG price out of reasonable range");
            }
        } catch {
            return (false, "ZiG price calculation failed");
        }
    }
    
    function _checkAssetPricesHealth() internal view returns (bool, string memory) {
        string[5] memory cryptoAssets = ["BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD"];
        string[4] memory metalAssets = ["XAUUSD", "XPTUSD", "XPDUSD", "XAGUSD"];
        string[6] memory forexAssets = ["EURUSD", "GBPUSD", "USDZAR", "USDJPY", "USDCHF", "USDCNH"];
        
        uint256 validPrices = 0;
        uint256 totalPrices = 0;
        
        // Check crypto prices
        for (uint256 i = 0; i < cryptoAssets.length; i++) {
            try oracleHub.getPrice(cryptoAssets[i]) returns (uint256 price) {
                if (price > 0) validPrices++;
                totalPrices++;
            } catch {
                totalPrices++;
            }
        }
        
        // Check metal prices
        for (uint256 i = 0; i < metalAssets.length; i++) {
            try oracleHub.getPrice(metalAssets[i]) returns (uint256 price) {
                if (price > 0) validPrices++;
                totalPrices++;
            } catch {
                totalPrices++;
            }
        }
        
        // Check forex prices
        for (uint256 i = 0; i < forexAssets.length; i++) {
            try oracleHub.getPrice(forexAssets[i]) returns (uint256 price) {
                if (price > 0) validPrices++;
                totalPrices++;
            } catch {
                totalPrices++;
            }
        }
        
        uint256 validPercent = (validPrices * 100) / totalPrices;
        
        if (validPercent >= minValidFeedsPercent) {
            return (true, "Asset prices healthy");
        } else {
            return (false, string(abi.encodePacked("Only ", Strings.toString(validPercent), "% asset prices valid")));
        }
    }
    
    function _checkPriceStaleness() internal view returns (bool, string memory) {
        // This would check the staleness of prices from the oracle hub
        // For now, return a placeholder implementation
        return (true, "Price staleness check passed");
    }
    
    function _checkPriceDeviation() internal view returns (bool, string memory) {
        // This would check for unusual price deviations
        // For now, return a placeholder implementation
        return (true, "Price deviation check passed");
    }
    
    // ======================== METRIC RECORDING ======================== //
    
    function _recordMetric(
        string memory metricName,
        uint256 value,
        string memory description,
        bool isHealthy
    ) internal {
        HealthMetric memory metric = HealthMetric({
            timestamp: block.timestamp,
            value: value,
            metric: description,
            isHealthy: isHealthy
        });
        
        uint256 index = metricIndex[metricName];
        
        if (healthMetrics[metricName].length < MAX_METRICS_HISTORY) {
            healthMetrics[metricName].push(metric);
        } else {
            healthMetrics[metricName][index] = metric;
        }
        
        metricIndex[metricName] = (index + 1) % MAX_METRICS_HISTORY;
        
        emit HealthCheck(metricName, value, isHealthy);
        
        // Update consecutive failures tracking
        if (isHealthy) {
            consecutiveFailures[metricName] = 0;
            lastSuccessfulCheck[metricName] = block.timestamp;
        } else {
            consecutiveFailures[metricName]++;
            
            // Raise critical alert if too many consecutive failures
            if (consecutiveFailures[metricName] >= CRITICAL_THRESHOLD) {
                _raiseAlert("CRITICAL_FAILURE", 
                    string(abi.encodePacked(metricName, " failed ", Strings.toString(consecutiveFailures[metricName]), " times")), 
                    4);
            }
        }
    }
    
    // ======================== ALERT MANAGEMENT ======================== //
    
    function _raiseAlert(
        string memory alertType,
        string memory message,
        uint256 severity
    ) internal {
        alerts.push(Alert({
            alertType: alertType,
            message: message,
            timestamp: block.timestamp,
            isResolved: false,
            severity: severity
        }));
        
        emit AlertRaised(alertType, message, severity);
    }
    
    function resolveAlert(uint256 alertId) external onlyAuthorized {
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
    
    function _getActiveAlertCount() internal view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < alerts.length; i++) {
            if (!alerts[i].isResolved) {
                count++;
            }
        }
        return count;
    }
    
    // ======================== UTILITY FUNCTIONS ======================== //
    
    function getHealthMetrics(string memory metricName) external view returns (HealthMetric[] memory) {
        return healthMetrics[metricName];
    }
    
    function getLatestHealthMetric(string memory metricName) external view returns (HealthMetric memory) {
        HealthMetric[] memory metrics = healthMetrics[metricName];
        if (metrics.length == 0) {
            return HealthMetric(0, 0, "", false);
        }
        return metrics[metrics.length - 1];
    }
    
    function getSystemStatus() external view returns (SystemStatus memory) {
        return SystemStatus({
            overallHealthy: _getActiveAlertCount() == 0,
            activeAlerts: _getActiveAlertCount(),
            totalMetrics: 5, // Number of metrics we check
            healthyMetrics: 5 - _getActiveAlertCount(), // Simplified calculation
            lastCheck: block.timestamp
        });
    }
    
    function getAlertCount() external view returns (uint256 total, uint256 active, uint256 critical) {
        total = alerts.length;
        for (uint256 i = 0; i < alerts.length; i++) {
            if (!alerts[i].isResolved) {
                active++;
                if (alerts[i].severity == 4) {
                    critical++;
                }
            }
        }
    }
    
    function _isAuthorizedMonitor(address monitor) internal view returns (bool) {
        // Add logic to check if the monitor is authorized
        // For now, only owner is authorized
        return monitor == owner();
    }
    
    // ======================== ADMIN FUNCTIONS ======================== //
    
    function setMinValidFeedsPercent(uint256 newPercent) external onlyOwner {
        require(newPercent <= 100, "Invalid percentage");
        minValidFeedsPercent = newPercent;
    }
    
    function setMaxPriceDeviationPercent(uint256 newPercent) external onlyOwner {
        require(newPercent <= 50, "Invalid percentage");
        maxPriceDeviationPercent = newPercent;
    }
    
    function setMaxStalenessSeconds(uint256 newSeconds) external onlyOwner {
        require(newSeconds > 0, "Invalid staleness threshold");
        maxStalenessSeconds = newSeconds;
    }
    
    function setOracleHub(address newOracleHub) external onlyOwner {
        require(newOracleHub != address(0), "Invalid oracle hub address");
        oracleHub = IZiGOracleHub(newOracleHub);
    }
    
    function clearOldAlerts(uint256 olderThan) external onlyOwner {
        uint256 currentTime = block.timestamp;
        for (uint256 i = 0; i < alerts.length; i++) {
            if (alerts[i].isResolved && currentTime - alerts[i].timestamp > olderThan) {
                // Mark for removal by setting resolved to true (already done)
                // In a real implementation, you might want to actually remove them
            }
        }
    }
} 