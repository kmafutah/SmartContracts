// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

interface IRedistributionVault {
    function depositFromMint(address token, uint256 amount) external;
    function withdrawToUser(address token, address user, uint256 amount) external;
}

interface IOracle {
    function latestAnswer() external view returns (int256);
    function decimals() external view returns (uint8);
}

interface IBandStdReference {
    function getReferenceData(string memory base, string memory quote) external view returns (
        uint256 rate,
        uint256 lastUpdatedBase,
        uint256 lastUpdatedQuote
    );
}

/// @title ZiGT_SuperGodmode - Ultimate stablecoin with godlike control, dual oracles, and dynamic rebalancing
contract ZiGT_SuperGodmode is Initializable, ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    address public paymentToken;
    address public vault;
    uint256 public rebalanceCooldown;
    uint256 public lastRebalance;
    uint256 public feePercentage; // In basis points (100 = 1%)

    struct Asset {
        string pair; // e.g., "XAUUSD"
        address chainlinkFeed; // Chainlink oracle
        address bandFeed; // Band Protocol feed
        int256 weight; // Signed weight for pricing
        uint8 decimals; // Oracle decimals
        uint256 maxPriceAge; // Max age for price validity
        uint256 cachedPrice; // Cached price
        uint256 cachedTimestamp; // Cache timestamp
    }

    string[] public backingAssets;
    mapping(string => Asset) public assets;
    mapping(address => bool) public emergencyAdmins;

    event Minted(address indexed user, uint256 amount, uint256 cost);
    event Burned(address indexed user, uint256 amount, uint256 redeemed);
    event Rebalanced(string[] assets, int256[] newWeights);
    event FeeCharged(address indexed user, uint256 amount);
    event PriceCached(string indexed pair, uint256 price, uint256 timestamp);
    event EmergencyStop(address admin, bool stopped);
    event WeightUpdated(string indexed pair, int256 newWeight);

    bool public emergencyStop;

    modifier onlyEmergencyAdmin() {
        require(emergencyAdmins[msg.sender] || msg.sender == owner(), "Not emergency admin");
        _;
    }

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _paymentToken,
        address _vault,
        string[] calldata _pairs,
        address[] calldata _chainlinkFeeds,
        address[] calldata _bandFeeds,
        int256[] calldata _weights,
        uint8[] calldata _decimals,
        uint256[] calldata _maxPriceAges
    ) external initializer {
        require(_pairs.length == _weights.length && _pairs.length == _chainlinkFeeds.length, "Mismatch");
        require(_pairs.length == _bandFeeds.length && _pairs.length == _decimals.length, "Mismatch");
        require(_pairs.length == _maxPriceAges.length, "Mismatch");

        __ERC20_init("ZiGT Super Godmode Coin", "ZiGT-SG");
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        paymentToken = _paymentToken;
        vault = _vault;
        rebalanceCooldown = 7 days;
        feePercentage = 100; // 1% default fee

        for (uint256 i = 0; i < _pairs.length; i++) {
            backingAssets.push(_pairs[i]);
            assets[_pairs[i]] = Asset({
                pair: _pairs[i],
                chainlinkFeed: _chainlinkFeeds[i],
                bandFeed: _bandFeeds[i],
                weight: _weights[i],
                decimals: _decimals[i],
                maxPriceAge: _maxPriceAges[i],
                cachedPrice: 0,
                cachedTimestamp: 0
            });
            updateCachedPrice(_pairs[i]);
        }
    }

    function getPrice(string memory pair) public view returns (uint256) {
        Asset memory asset = assets[pair];
        require(asset.chainlinkFeed != address(0) || asset.bandFeed != address(0), "No oracle set");

        if (asset.cachedTimestamp != 0 && block.timestamp - asset.cachedTimestamp <= asset.maxPriceAge) {
            return asset.cachedPrice;
        }

        return _fetchFreshPrice(pair);
    }

    function _fetchFreshPrice(string memory pair) internal view returns (uint256) {
        Asset memory asset = assets[pair];

        // Try Chainlink
        if (asset.chainlinkFeed != address(0)) {
            try IOracle(asset.chainlinkFeed).latestAnswer() returns (int256 price) {
                if (price > 0) {
                    return uint256(price) * (10 ** (18 - asset.decimals));
                }
            } catch {}
        }

        // Try Band Protocol
        if (asset.bandFeed != address(0)) {
            (string memory base, string memory quote) = _splitPair(pair);
            try IBandStdReference(asset.bandFeed).getReferenceData(base, quote) returns (
                uint256 rate,
                uint256 lastUpdatedBase,
                uint256 lastUpdatedQuote
            ) {
                if (rate > 0 && block.timestamp - lastUpdatedBase <= asset.maxPriceAge && block.timestamp - lastUpdatedQuote <= asset.maxPriceAge) {
                    return rate * (10 ** (18 - asset.decimals));
                }
            } catch {}
        }

        revert("No valid price feed");
    }

    function updateCachedPrice(string memory pair) public {
        uint256 price = _fetchFreshPrice(pair);
        assets[pair].cachedPrice = price;
        assets[pair].cachedTimestamp = block.timestamp;
        emit PriceCached(pair, price, block.timestamp);
    }

    function getZiGTPrice() public view returns (uint256) {
        int256 total = 0;
        for (uint256 i = 0; i < backingAssets.length; i++) {
            string memory pair = backingAssets[i];
            uint256 price = getPrice(pair);
            total += int256(price) * assets[pair].weight;
        }
        require(total > 0, "Invalid price model");
        return uint256(total) / 1e18; // Normalize to 18 decimals
    }

    function mint(uint256 amount) external nonReentrant {
        require(!emergencyStop, "Emergency stop active");
        uint256 price = getZiGTPrice();
        uint256 cost = price * amount / 1e18;
        uint256 fee = (cost * feePercentage) / 10000;
        uint256 totalCost = cost + fee;

        IERC20(paymentToken).transferFrom(msg.sender, address(this), totalCost);
        IERC20(paymentToken).approve(vault, cost);
        IRedistributionVault(vault).depositFromMint(paymentToken, cost);

        _mint(msg.sender, amount);
        if (fee > 0) {
            emit FeeCharged(msg.sender, fee);
        }
        emit Minted(msg.sender, amount, totalCost);
    }

    function burn(uint256 amount) external nonReentrant {
        require(!emergencyStop, "Emergency stop active");
        uint256 price = getZiGTPrice();
        uint256 payout = price * amount / 1e18;
        uint256 fee = (payout * feePercentage) / 10000;
        uint256 netPayout = payout - fee;

        _burn(msg.sender, amount);
        IRedistributionVault(vault).withdrawToUser(paymentToken, msg.sender, netPayout);
        if (fee > 0) {
            emit FeeCharged(msg.sender, fee);
        }
        emit Burned(msg.sender, amount, netPayout);
    }

    function rebalance(int256[] calldata newWeights) external onlyOwner {
        require(block.timestamp > lastRebalance + rebalanceCooldown, "Cooldown active");
        require(newWeights.length == backingAssets.length, "Mismatch");

        int256 totalWeight = 0;
        for (uint256 i = 0; i < newWeights.length; i++) {
            assets[backingAssets[i]].weight = newWeights[i];
            totalWeight += newWeights[i];
            emit WeightUpdated(backingAssets[i], newWeights[i]);
        }
        require(totalWeight > 0, "Invalid weights");

        lastRebalance = block.timestamp;
        emit Rebalanced(backingAssets, newWeights);
    }

    function setEmergencyAdmin(address admin, bool status) external onlyOwner {
        emergencyAdmins[admin] = status;
    }

    function toggleEmergencyStop(bool stop) external onlyEmergencyAdmin {
        emergencyStop = stop;
        emit EmergencyStop(msg.sender, stop);
    }

    function setFeePercentage(uint256 newFee) external onlyOwner {
        require(newFee <= 500, "Fee too high"); // Max 5%
        feePercentage = newFee;
    }

    function _splitPair(string memory pair) internal pure returns (string memory base, string memory quote) {
        bytes memory pairBytes = bytes(pair);
        require(pairBytes.length >= 6, "Invalid pair");
        bytes memory baseBytes = new bytes(3);
        bytes memory quoteBytes = new bytes(3);
        for (uint256 i = 0; i < 3; i++) {
            baseBytes[i] = pairBytes[i];
            quoteBytes[i] = pairBytes[i + 3];
        }
        base = string(baseBytes);
        quote = string(quoteBytes);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}