// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

// Import the IBandStdReference interface
import "../Interfaces/IBandStdReference.sol";

library PriceUtils {
   
function getPrice(
    address oracleAddress,
    string memory fullSymbol,
    uint8 /* expectedDecimals - not used since LiveBandFeed normalizes to 18 */
) internal view returns (uint256 price, uint8 decimals) {
    // Split the symbol into base and quote
    (string memory base, string memory quote) = _splitSymbol(fullSymbol);
    
    // Call LiveBandFeed
    (uint256 rate,,) = IBandStdReference(oracleAddress).getReferenceData(base, quote);
    require(rate > 0, "Invalid rate from oracle");
    
    // LiveBandFeed already normalizes to 18 decimals
    return (rate, 18);
}

// Helper function to split symbols
function _splitSymbol(string memory symbol) internal pure returns (string memory base, string memory quote) {
    bytes memory symbolBytes = bytes(symbol);
    require(symbolBytes.length >= 6, "Invalid symbol length");
    
    bytes memory baseBytes = new bytes(3);
    bytes memory quoteBytes = new bytes(3);
    
    for (uint i = 0; i < 3; i++) {
        baseBytes[i] = symbolBytes[i];
        quoteBytes[i] = symbolBytes[i+3];
    }
    
    return (string(baseBytes), string(quoteBytes));
}

    /**
     * @dev Calculates the value based on price and decimals.
     * @param amount Amount to calculate value for
     * @param price Price of the asset
     * @param decimals Decimals of the price
     * @return Calculated value
     */
    function calculateValue(uint256 amount, uint256 price, uint8 decimals) internal pure returns (uint256) {
        return (amount * price) / (10 ** decimals);
    }
}