// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract AccessVerifier is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    mapping(address => bool) public isAfrican;
    mapping(address => bool) public isDiaspora;

    event MarkedAfrican(address indexed user, bool status);
    event MarkedDiaspora(address indexed user, bool status);

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        // No other initialization needed
    }

    function setAfrican(address user, bool status) external onlyOwner {
        isAfrican[user] = status;
        emit MarkedAfrican(user, status);
    }

    function setDiaspora(address user, bool status) external onlyOwner {
        isDiaspora[user] = status;
        emit MarkedDiaspora(user, status);
    }

    function eligibleForReducedFee(address user) external view returns (bool) {
        return isAfrican[user] || isDiaspora[user];
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
