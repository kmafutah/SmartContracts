// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

interface IFeedRegistry {
    function getRateForString(string memory symbol) external view returns (uint256);
}

interface IZiGT {
    function isAuthorized(address user) external view returns (bool);
}

contract ZiGTToken is
    Initializable,
    ERC20Upgradeable,
    ERC20PermitUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    address public zigt;
    address public feedRegistry;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _zigt,
        address _feedRegistry,
        string memory name,
        string memory symbol,
        string memory version
    ) public initializer {
        __ERC20_init(name, symbol);
        __ERC20Permit_init(name);
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        zigt = _zigt;
        feedRegistry = _feedRegistry;
        // version is unused, but available for future use
    }

    modifier onlyZiGT() {
        require(msg.sender == zigt, "Not authorized");
        _;
    }

    function setZiGT(address _zigt) external onlyOwner {
        require(_zigt != address(0), "Invalid ZiGT address");
        zigt = _zigt;
    }

    function setFeedRegistry(address _feedRegistry) external onlyOwner {
        require(_feedRegistry != address(0), "Invalid registry address");
        feedRegistry = _feedRegistry;
    }

    function mint(address to, uint256 amount) external onlyZiGT {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyZiGT {
        _burn(from, amount);
    }

    function getCurrentRate(string memory symbol) public view returns (uint256) {
        return IFeedRegistry(feedRegistry).getRateForString(symbol);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
