// MutapaReserveBacking.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;
contract MutapaReserveBacking {
    address public oracle;
    mapping(string => uint256) public reserveAssets;
    event ReserveUpdated(string asset, uint256 newValue);

    modifier onlyOracle() {
        require(msg.sender == oracle, "Not authorized");
        _;
    }

    constructor(address _oracle) {
        oracle = _oracle;
    }

    function updateReserve(string memory asset, uint256 value) external onlyOracle {
        reserveAssets[asset] = value;
        emit ReserveUpdated(asset, value);
    }

    function getTotalBacking() public view returns (uint256 total) {
        for (uint i = 0; i < 5; i++) {
            total += reserveAssets[getAssetKey(i)];
        }
    }

    function getAssetKey(uint index) internal pure returns (string memory) {
        if (index == 0) return "gold";
        if (index == 1) return "land";
        if (index == 2) return "equity";
        if (index == 3) return "usd";
        if (index == 4) return "zwl";
        return "";
    }
}
