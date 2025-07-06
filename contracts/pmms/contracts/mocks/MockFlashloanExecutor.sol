// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MockFlashloanExecutor is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    address public strategyExecutor;

    function initialize(address _owner, address _strategyExecutor) external initializer {
        __Ownable_init(_owner); // Pass the owner explicitly
        __UUPSUpgradeable_init();

        strategyExecutor = _strategyExecutor;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        return true;
    }
}
