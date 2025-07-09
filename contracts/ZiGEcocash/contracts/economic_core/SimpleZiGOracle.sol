// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

interface IZiGOracleHub {
    function calculateZiGPrice() external view returns (uint256);
}

/**
 * @title Simple ZiG Oracle
 * @dev Simple oracle that returns the calculated ZiG price from ZiGOracleHub
 */
contract SimpleZiGOracle {
    IZiGOracleHub public immutable oracleHub;
    
    constructor(address _oracleHub) {
        require(_oracleHub != address(0), "Invalid oracle hub address");
        oracleHub = IZiGOracleHub(_oracleHub);
    }
    
    /**
     * @dev Returns the calculated ZiG price from the oracle hub
     * @param token The token address (ignored, always returns ZiG price)
     * @return The calculated ZiG price
     */
    function getPrice(address token) external view returns (uint256) {
        // Always return the calculated ZiG price regardless of the token parameter
        return oracleHub.calculateZiGPrice();
    }
} 