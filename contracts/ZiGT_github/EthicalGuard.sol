// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

interface IRedistributionVault {
    function totalReceived() external view returns (uint256);
    function minRedistributionShare() external view returns (uint256);
}

abstract contract EthicalGuard is Initializable, OwnableUpgradeable {
    IRedistributionVault public redistributionVault;
    uint256 public totalFeesCollected;

    function __EthicalGuard_init(address _vault) internal onlyInitializing {
        redistributionVault = IRedistributionVault(_vault);
    }

    modifier reparationBeforeProfit() {
        uint256 minShare = redistributionVault.minRedistributionShare();
        uint256 required = (totalFeesCollected * minShare) / 10000;
        require(redistributionVault.totalReceived() >= required, "Redistribution below minimum");
        _;
    }
}
