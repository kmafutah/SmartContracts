// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

interface IRedistributionVault {
    function depositFromMint(address token, uint256 amount) external;
    function withdrawToUser(address token, address user, uint256 amount) external;
}

interface IOracleHub {
    function getPrice(string calldata pair) external view returns (uint256);
}

/// @title ZiGT_Godmode - Full stablecoin with ERC-20 mint, bonding logic, oracle fetch, and vault enforcement
contract ZiGT_Godmode is Initializable, ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    address public paymentToken;
    address public vault;
    address public oracleHub;
    string[] public backingAssets;
    mapping(string => int256) public weights; // signed to support negative correlation

    event Minted(address indexed user, uint256 amount, uint256 cost);
    event Burned(address indexed user, uint256 amount, uint256 redeemed);

    /// @dev UUPS pattern disables constructor logic
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _paymentToken,
        address _vault,
        address _oracleHub,
        string[] calldata _assets,
        int256[] calldata _weights
    ) external initializer {
        require(_assets.length == _weights.length, "Mismatch");
        __ERC20_init("ZiGT Reparations Coin", "ZiGT-R");
        __Ownable_init(msg.sender);

        paymentToken = _paymentToken;
        vault = _vault;
        oracleHub = _oracleHub;
        for (uint256 i = 0; i < _assets.length; i++) {
            backingAssets.push(_assets[i]);
            weights[_assets[i]] = _weights[i];
        }
    }

    function getZiGTPrice() public view returns (uint256) {
        int256 total = 0;
        for (uint256 i = 0; i < backingAssets.length; i++) {
            string memory pair = backingAssets[i];
            uint256 price = IOracleHub(oracleHub).getPrice(pair);
            total += int256(price) * weights[pair];
        }
        require(total > 0, "Invalid model");
        return uint256(total);
    }

    function mint(uint256 amount) external {
        uint256 price = getZiGTPrice();
        uint256 cost = price * amount / 1e18;
        IERC20(paymentToken).transferFrom(msg.sender, address(this), cost);
        IERC20(paymentToken).approve(vault, cost);
        IRedistributionVault(vault).depositFromMint(paymentToken, cost);
        _mint(msg.sender, amount);
        emit Minted(msg.sender, amount, cost);
    }

    function burn(uint256 amount) external {
        uint256 price = getZiGTPrice();
        uint256 payout = price * amount / 1e18;
        _burn(msg.sender, amount);
        IRedistributionVault(vault).withdrawToUser(paymentToken, msg.sender, payout);
        emit Burned(msg.sender, amount, payout);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
