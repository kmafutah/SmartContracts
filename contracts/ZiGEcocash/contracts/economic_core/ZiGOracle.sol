// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IZiGOracleHub {
    function calculateZiGPrice() external view returns (uint256);
}

/**
 * @title ZiG Oracle
 * @dev Simple oracle that returns the calculated ZiG price from the OracleHub
 */
contract ZiGOracle is Ownable {
    IZiGOracleHub public oracleHub;
    
    event OracleHubUpdated(address indexed newOracleHub);
    
    constructor(address _oracleHub) Ownable(msg.sender) {
        require(_oracleHub != address(0), "Invalid oracle hub address");
        oracleHub = IZiGOracleHub(_oracleHub);
    }
    
    function setOracleHub(address _oracleHub) external onlyOwner {
        require(_oracleHub != address(0), "Invalid oracle hub address");
        oracleHub = IZiGOracleHub(_oracleHub);
        emit OracleHubUpdated(_oracleHub);
    }
    
    function getPrice(address token) external view returns (uint256) {
        // This oracle only works for ZiG token
        // For other tokens, return 0 to indicate no price available
        return oracleHub.calculateZiGPrice();
    }
} 