// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPriceOracle {
    function getPrice(address token) external view returns (uint256);
}

interface IZiGOracleHub {
    function getPrice(string memory asset) external view returns (uint256);
    function calculateZiGPrice() external view returns (uint256);
}

/**
 * @title Oracle Aggregator
 * @dev Aggregates prices from multiple oracle sources using weighted averages
 */
contract OracleAggregator is Ownable, ReentrancyGuard {
    
    struct OracleSource {
        address oracleAddress;
        uint256 weight;        // Weight in basis points (10000 = 100%)
        bool isActive;
        uint256 lastUpdate;
        uint256 stalenessThreshold;
    }
    
    struct AggregatedPrice {
        uint256 price;
        uint256 timestamp;
        uint256 confidence;    // Confidence level in basis points
        uint256 sourceCount;
    }
    
    // Asset to oracle sources mapping
    mapping(string => OracleSource[]) public oracleSources;
    
    // Aggregated prices cache
    mapping(string => AggregatedPrice) public aggregatedPrices;
    
    // Minimum confidence threshold for valid aggregated price
    uint256 public constant MIN_CONFIDENCE_THRESHOLD = 5000; // 50%
    
    // Maximum price deviation between sources (in basis points)
    uint256 public constant MAX_PRICE_DEVIATION = 2000; // 20%
    
    // Events
    event OracleSourceAdded(string indexed asset, address indexed oracle, uint256 weight);
    event OracleSourceUpdated(string indexed asset, address indexed oracle, uint256 weight, bool isActive);
    event OracleSourceRemoved(string indexed asset, address indexed oracle);
    event PriceAggregated(string indexed asset, uint256 price, uint256 confidence, uint256 sourceCount);
    
    modifier onlyAuthorized() {
        require(msg.sender == owner() || _isAuthorizedOracle(msg.sender), "Not authorized");
        _;
    }
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    // ======================== ORACLE SOURCE MANAGEMENT ======================== //
    
    function addOracleSource(
        string memory asset,
        address oracleAddress,
        uint256 weight,
        uint256 stalenessThreshold
    ) external onlyOwner {
        require(oracleAddress != address(0), "Invalid oracle address");
        require(weight > 0 && weight <= 10000, "Invalid weight");
        require(stalenessThreshold > 0, "Invalid staleness threshold");
        
        // Check if oracle already exists
        OracleSource[] storage sources = oracleSources[asset];
        for (uint256 i = 0; i < sources.length; i++) {
            require(sources[i].oracleAddress != oracleAddress, "Oracle already exists");
        }
        
        sources.push(OracleSource({
            oracleAddress: oracleAddress,
            weight: weight,
            isActive: true,
            lastUpdate: block.timestamp,
            stalenessThreshold: stalenessThreshold
        }));
        
        emit OracleSourceAdded(asset, oracleAddress, weight);
    }
    
    function updateOracleSource(
        string memory asset,
        address oracleAddress,
        uint256 weight,
        bool isActive
    ) external onlyOwner {
        OracleSource[] storage sources = oracleSources[asset];
        bool found = false;
        
        for (uint256 i = 0; i < sources.length; i++) {
            if (sources[i].oracleAddress == oracleAddress) {
                sources[i].weight = weight;
                sources[i].isActive = isActive;
                found = true;
                emit OracleSourceUpdated(asset, oracleAddress, weight, isActive);
                break;
            }
        }
        
        require(found, "Oracle source not found");
    }
    
    function removeOracleSource(string memory asset, address oracleAddress) external onlyOwner {
        OracleSource[] storage sources = oracleSources[asset];
        
        for (uint256 i = 0; i < sources.length; i++) {
            if (sources[i].oracleAddress == oracleAddress) {
                // Remove by swapping with last element and popping
                sources[i] = sources[sources.length - 1];
                sources.pop();
                emit OracleSourceRemoved(asset, oracleAddress);
                return;
            }
        }
        
        revert("Oracle source not found");
    }
    
    // ======================== PRICE AGGREGATION ======================== //
    
    function aggregatePrice(string memory asset) external onlyAuthorized returns (uint256) {
        OracleSource[] storage sources = oracleSources[asset];
        require(sources.length > 0, "No oracle sources for asset");
        
        uint256 totalWeight = 0;
        uint256 weightedSum = 0;
        uint256 validSources = 0;
        uint256[] memory prices = new uint256[](sources.length);
        uint256[] memory weights = new uint256[](sources.length);
        
        // Collect valid prices from all sources
        for (uint256 i = 0; i < sources.length; i++) {
            OracleSource memory source = sources[i];
            
            if (!source.isActive) continue;
            
            try this._getPriceFromSource(source.oracleAddress, asset) returns (uint256 price) {
                if (price > 0 && _isPriceFresh(source.lastUpdate, source.stalenessThreshold)) {
                    prices[validSources] = price;
                    weights[validSources] = source.weight;
                    weightedSum += price * source.weight;
                    totalWeight += source.weight;
                    validSources++;
                }
            } catch {
                // Skip failed oracle
                continue;
            }
        }
        
        require(validSources > 0, "No valid oracle sources");
        require(totalWeight > 0, "No valid weights");
        
        // Calculate weighted average
        uint256 aggregatedPrice = weightedSum / totalWeight;
        
        // Validate price deviation between sources
        require(_validatePriceDeviation(prices, weights, validSources, aggregatedPrice), "Price deviation too large");
        
        // Calculate confidence based on active sources and weights
        uint256 confidence = _calculateConfidence(validSources, sources.length, totalWeight);
        
        // Update aggregated price cache
        aggregatedPrices[asset] = AggregatedPrice({
            price: aggregatedPrice,
            timestamp: block.timestamp,
            confidence: confidence,
            sourceCount: validSources
        });
        
        emit PriceAggregated(asset, aggregatedPrice, confidence, validSources);
        
        return aggregatedPrice;
    }
    
    function getAggregatedPrice(string memory asset) external view returns (
        uint256 price,
        uint256 timestamp,
        uint256 confidence,
        uint256 sourceCount
    ) {
        AggregatedPrice memory aggPrice = aggregatedPrices[asset];
        
        // Check if cached price is still valid
        if (aggPrice.timestamp > 0 && block.timestamp - aggPrice.timestamp <= 3600) {
            return (aggPrice.price, aggPrice.timestamp, aggPrice.confidence, aggPrice.sourceCount);
        }
        
        // Return zeros if no valid cached price
        return (0, 0, 0, 0);
    }
    
    // ======================== ZIG-SPECIFIC AGGREGATION ======================== //
    
    function aggregateZiGPrice() external onlyAuthorized returns (uint256) {
        // For ZiG, we can aggregate from multiple sources including:
        // 1. Direct ZiG oracle calculation
        // 2. Component-based calculation (C + M + F)
        // 3. External price feeds
        
        uint256 totalWeight = 0;
        uint256 weightedSum = 0;
        uint256 validSources = 0;
        
        // Source 1: Direct ZiG calculation (weight: 60%)
        try this._getZiGPriceFromHub() returns (uint256 price) {
            if (price > 0) {
                weightedSum += price * 6000; // 60% weight
                totalWeight += 6000;
                validSources++;
            }
        } catch {
            // Skip if failed
        }
        
        // Source 2: Component-based calculation (weight: 40%)
        try this._getZiGPriceFromComponents() returns (uint256 price) {
            if (price > 0) {
                weightedSum += price * 4000; // 40% weight
                totalWeight += 4000;
                validSources++;
            }
        } catch {
            // Skip if failed
        }
        
        require(validSources > 0, "No valid ZiG price sources");
        require(totalWeight > 0, "No valid weights");
        
        uint256 aggregatedPrice = weightedSum / totalWeight;
        
        // Cache the aggregated ZiG price
        aggregatedPrices["ZIGUSD"] = AggregatedPrice({
            price: aggregatedPrice,
            timestamp: block.timestamp,
            confidence: _calculateConfidence(validSources, 2, totalWeight),
            sourceCount: validSources
        });
        
        emit PriceAggregated("ZIGUSD", aggregatedPrice, _calculateConfidence(validSources, 2, totalWeight), validSources);
        
        return aggregatedPrice;
    }
    
    // ======================== INTERNAL FUNCTIONS ======================== //
    
    function _getPriceFromSource(address oracleAddress, string memory asset) external view returns (uint256) {
        // Try different oracle interfaces
        try IPriceOracle(oracleAddress).getPrice(address(0)) returns (uint256 price) {
            return price;
        } catch {
            // Try string-based oracle (like ZiGOracleHub)
            try IZiGOracleHub(oracleAddress).getPrice(asset) returns (uint256 price) {
                return price;
            } catch {
                return 0;
            }
        }
    }
    
    function _getZiGPriceFromHub() external view returns (uint256) {
        // This would need to be implemented based on your specific oracle hub interface
        // For now, return 0 as placeholder
        return 0;
    }
    
    function _getZiGPriceFromComponents() external view returns (uint256) {
        // This would calculate ZiG price from individual components
        // For now, return 0 as placeholder
        return 0;
    }
    
    function _isPriceFresh(uint256 lastUpdate, uint256 stalenessThreshold) internal view returns (bool) {
        return block.timestamp - lastUpdate <= stalenessThreshold;
    }
    
    function _validatePriceDeviation(
        uint256[] memory prices,
        uint256[] memory weights,
        uint256 validSources,
        uint256 averagePrice
    ) internal pure returns (bool) {
        if (validSources < 2) return true; // Need at least 2 sources for deviation check
        
        uint256 totalDeviation = 0;
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < validSources; i++) {
            uint256 deviation = prices[i] > averagePrice ? 
                prices[i] - averagePrice : averagePrice - prices[i];
            
            uint256 deviationPercent = (deviation * 10000) / averagePrice;
            totalDeviation += deviationPercent * weights[i];
            totalWeight += weights[i];
        }
        
        uint256 averageDeviation = totalDeviation / totalWeight;
        return averageDeviation <= MAX_PRICE_DEVIATION;
    }
    
    function _calculateConfidence(
        uint256 validSources,
        uint256 totalSources,
        uint256 totalWeight
    ) internal pure returns (uint256) {
        // Base confidence on source coverage and weight distribution
        uint256 sourceCoverage = (validSources * 10000) / totalSources;
        uint256 weightCoverage = totalWeight >= 8000 ? 10000 : (totalWeight * 10000) / 8000;
        
        return (sourceCoverage + weightCoverage) / 2;
    }
    
    function _isAuthorizedOracle(address oracle) internal view returns (bool) {
        // Add logic to check if the oracle is authorized
        // For now, only owner is authorized
        return oracle == owner();
    }
    
    // ======================== UTILITY FUNCTIONS ======================== //
    
    function getOracleSources(string memory asset) external view returns (OracleSource[] memory) {
        return oracleSources[asset];
    }
    
    function getOracleSourceCount(string memory asset) external view returns (uint256) {
        return oracleSources[asset].length;
    }
    
    function isPriceValid(string memory asset) external view returns (bool) {
        AggregatedPrice memory aggPrice = aggregatedPrices[asset];
        return aggPrice.price > 0 && 
               aggPrice.confidence >= MIN_CONFIDENCE_THRESHOLD &&
               block.timestamp - aggPrice.timestamp <= 3600;
    }
    
    // ======================== ADMIN FUNCTIONS ======================== //
    
    function setMinConfidenceThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold <= 10000, "Invalid threshold");
        // This would update the constant, but since it's constant, we'll need a different approach
        // For now, this is a placeholder
    }
    
    function setMaxPriceDeviation(uint256 newDeviation) external onlyOwner {
        require(newDeviation <= 5000, "Invalid deviation");
        // This would update the constant, but since it's constant, we'll need a different approach
        // For now, this is a placeholder
    }
} 