// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract WalletStatusChecker is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    mapping(address => bool) private blockedWallets;
    event WalletChecked(address indexed wallet, bool isBlocked, bool canInteract);
    event WalletBlocked(address indexed wallet, bool isBlocked);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner) external initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
    }

    function checkWalletStatus(address _wallet) external returns (bool isBlocked, bool canInteract) {
        require(_wallet != address(0), "Invalid address");
        isBlocked = blockedWallets[_wallet];
        canInteract = !isBlocked && address(this).balance >= 0;
        emit WalletChecked(_wallet, isBlocked, canInteract);
        return (isBlocked, canInteract);
    }

    function setWalletBlockStatus(address _wallet, bool _isBlocked) external onlyOwner {
        require(_wallet != address(0), "Invalid address");
        blockedWallets[_wallet] = _isBlocked;
        emit WalletBlocked(_wallet, _isBlocked);
    }

    function isWalletBlocked(address _wallet) external view returns (bool) {
        return blockedWallets[_wallet];
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}