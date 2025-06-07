// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@prb/math/src/UD60x18.sol";
import {SD59x18, sd} from "@prb/math/src/SD59x18.sol";
import {UD60x18, ud, unwrap} from "@prb/math/src/UD60x18.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

abstract contract ZiGBondingCurve is Initializable, OwnableUpgradeable {
    using {unwrap} for UD60x18;
    function __ZiGBondingCurve_init() internal onlyInitializing {
        __ZiGBondingCurve_init_unchained();
    }

    function __ZiGBondingCurve_init_unchained() internal onlyInitializing {
        // Initialization logic
    }    
    string public constant version = "1.0.0";
    uint256 public totalMinted;
    address public __governance; // Added governance variable

    // Phase transition thresholds
    uint256 public sigmoidPhaseEnd;
    uint256 public linearPhaseEnd;

    // Price constants
    UD60x18 public basePrice;
    UD60x18 public linearSlope;
    UD60x18 public expBase;

    mapping(address => uint256) public positions;

    event Minted(address indexed user, uint256 amount, uint256 cost);
    event Burned(address indexed user, uint256 amount, uint256 refund);
    event UpdatedThresholds(uint256 sigmoidEnd, uint256 linearEnd);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _governance) public virtual initializer {
        __Ownable_init(msg.sender);
        
        __governance = _governance;
        // Initialize default values
        sigmoidPhaseEnd = 1_000 ether;
        linearPhaseEnd = 10_000 ether;
        basePrice = ud(1e18); // 1.0
        linearSlope = ud(1e15); // 0.001
        expBase = ud(1005e15); // 1.005
    }

    modifier onlyGovernance() virtual {
        require(msg.sender == __governance, "Not authorized");
        _;
    }

    function updatePhases(uint256 _sigmoidEnd, uint256 _linearEnd) external virtual onlyGovernance {
        require(_sigmoidEnd < _linearEnd, "Invalid thresholds");
        sigmoidPhaseEnd = _sigmoidEnd;
        linearPhaseEnd = _linearEnd;
        emit UpdatedThresholds(_sigmoidEnd, _linearEnd);
    }

    function _calculatePrice(uint256 currentSupply) internal view virtual returns (UD60x18 price) {
        UD60x18 supply = ud(currentSupply);

        if (currentSupply < sigmoidPhaseEnd) {
            UD60x18 m = ud(sigmoidPhaseEnd).div(ud(2e18));
            UD60x18 k = ud(sigmoidPhaseEnd).div(ud(10e18));

            int256 s = int256(unwrap(supply));
            int256 mVal = int256(unwrap(m));
            int256 kVal = int256(unwrap(k));

            SD59x18 exponent = sd(mVal - s).div(sd(kVal));
            SD59x18 expResultSD = exponent.exp();
            uint256 expValueUnsigned = uint256(SD59x18.unwrap(expResultSD));
            UD60x18 expResult = ud(expValueUnsigned);

            price = basePrice.div(ud(1e18).add(expResult));
        } else if (currentSupply < linearPhaseEnd) {
            price = basePrice.add(linearSlope.mul(ud(currentSupply - sigmoidPhaseEnd)));
        } else {
            UD60x18 expAmount = expBase.pow(ud(currentSupply - linearPhaseEnd));
            price = basePrice.mul(expAmount);
        }
    }

    function getPrice() public view virtual returns (uint256) {
        return unwrap(_calculatePrice(totalMinted));
    }

    function mint(uint256 amount) external payable virtual {
        require(amount > 0, "Amount must be > 0");

        uint256 totalCost = 0;
        for (uint256 i = 0; i < amount; i++) {
            totalCost += unwrap(_calculatePrice(totalMinted + i));
        }

        require(msg.value >= totalCost, "Insufficient payment");

        totalMinted += amount;
        positions[msg.sender] += amount;

        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }

        emit Minted(msg.sender, amount, totalCost);
    }

    function burn(uint256 amount) external virtual {
        require(positions[msg.sender] >= amount, "Insufficient balance");

        uint256 refund = 0;
        for (uint256 i = 0; i < amount; i++) {
            refund += unwrap(_calculatePrice(totalMinted - 1 - i));
        }

        totalMinted -= amount;
        positions[msg.sender] -= amount;

        payable(msg.sender).transfer(refund);

        emit Burned(msg.sender, amount, refund);
    }

    function _authorizeUpgrade(address newImplementation) internal virtual onlyOwner {}
}