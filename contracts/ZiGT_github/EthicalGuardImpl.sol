// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "./EthicalGuard.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title EthicalGuardImpl
 * @dev Minimal concrete implementation of EthicalGuard for deployment/testing.
 */
contract EthicalGuardImpl is EthicalGuard, UUPSUpgradeable {
    function initialize(address _vault) public initializer {
        __Ownable_init(msg.sender);
        __EthicalGuard_init(_vault);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    // Add any required overrides or additional logic here if needed
}
