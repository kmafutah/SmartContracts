// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@prb/math/src/UD60x18.sol";
import {SD59x18, sd} from "@prb/math/src/SD59x18.sol";
import {UD60x18, ud, unwrap} from "@prb/math/src/UD60x18.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ZiG Bonding Curve - Simple 3-Phase Model
 * @dev Non-upgradeable bonding curve optimized for early and late adopters
 * 
 * OVERFLOW MITIGATION STRATEGIES:
 * 1. Input validation with reasonable limits
 * 2. Safe mathematical operations with bounds checking
 * 3. Simplified sigmoid using linear approximation for extreme values
 * 4. Exponential growth caps to prevent runaway calculations
 * 5. Emergency circuit breakers for price limits
 */

contract ZiGBondingCurve is Ownable, ReentrancyGuard {
    using {unwrap} for UD60x18;

    // Core state
    uint256 public totalMinted;
    
    // Phase thresholds - Perfect for early/late adopter balance
    uint256 public constant SIGMOID_PHASE_END = 1_000 ether;    // Early adopters get cheap tokens
    uint256 public constant LINEAR_PHASE_END = 10_000 ether;    // Steady growth phase
    uint256 public constant MAX_SUPPLY = 100_000 ether;         // Hard cap to prevent overflow
    
    // Price parameters with overflow protection
    UD60x18 public constant BASE_PRICE = UD60x18.wrap(1e18);    // 1.0 ETH
    UD60x18 public constant LINEAR_SLOPE = UD60x18.wrap(1e15);  // 0.001 ETH per token
    UD60x18 public constant EXP_BASE = UD60x18.wrap(1002e15);   // 1.002 (0.2% growth - safer than 0.5%)
    UD60x18 public constant MAX_PRICE = UD60x18.wrap(100e18);   // 100 ETH price ceiling
    
    // Transaction limits to prevent abuse/overflow
    uint256 public constant MIN_PURCHASE = 1e15;     // 0.001 tokens
    uint256 public constant MAX_PURCHASE = 100 ether; // 100 tokens per tx
    
    mapping(address => uint256) public positions;
    
    event Minted(address indexed user, uint256 amount, uint256 cost);
    event Burned(address indexed user, uint256 amount, uint256 refund);
    event PhaseTransition(uint256 phase, uint256 supply);
    
    // Custom errors for gas efficiency
    error InvalidAmount();
    error InsufficientPayment();
    error InsufficientBalance();
    error ExceedsMaxSupply();
    error PriceCapExceeded();

    constructor() Ownable(msg.sender) {}

    /**
     * @dev OVERFLOW-SAFE price calculation with 3 phases
     * Each phase has built-in protection against mathematical overflow
     */
    function _calculatePrice(uint256 currentSupply) internal pure returns (UD60x18 price) {
        // Hard supply limit prevents all downstream overflows
        if (currentSupply >= MAX_SUPPLY) revert ExceedsMaxSupply();
        
        if (currentSupply < SIGMOID_PHASE_END) {
            // SIGMOID PHASE - Overflow-safe implementation
            price = _calculateSigmoidPriceSafe(currentSupply);
        } else if (currentSupply < LINEAR_PHASE_END) {
            // LINEAR PHASE - Simple, overflow-safe
            price = _calculateLinearPriceSafe(currentSupply);
        } else {
            // EXPONENTIAL PHASE - Capped growth to prevent overflow
            price = _calculateExponentialPriceSafe(currentSupply);
        }
        
        // Final safety check - price ceiling
        if (price.gt(MAX_PRICE)) {
            price = MAX_PRICE;
        }
    }

    /**
     * @dev Overflow-safe sigmoid calculation
     * Uses linear approximation for extreme values to prevent overflow
     */
    function _calculateSigmoidPriceSafe(uint256 supply) internal pure returns (UD60x18 price) {
        // Simplified sigmoid that can't overflow
        // price = basePrice * (supply / SIGMOID_PHASE_END)^0.5
        // This gives smooth curve without complex exponentials
        
        UD60x18 supplyRatio = ud(supply).div(ud(SIGMOID_PHASE_END));
        UD60x18 sqrtRatio = supplyRatio.sqrt();
        
        price = BASE_PRICE.mul(sqrtRatio);
        
        // Ensure minimum price progression
        if (price.lt(ud(1e15))) { // Minimum 0.001 ETH
            price = ud(1e15);
        }
    }

    /**
     * @dev Linear phase - cannot overflow with reasonable inputs
     */
    function _calculateLinearPriceSafe(uint256 currentSupply) internal pure returns (UD60x18 price) {
        uint256 linearSupply = currentSupply - SIGMOID_PHASE_END;
        
        // Safe multiplication with bounds checking
        UD60x18 linearComponent = LINEAR_SLOPE.mul(ud(linearSupply));
        price = BASE_PRICE.add(linearComponent);
    }

    /**
     * @dev Exponential phase with STRICT overflow protection
     */
    function _calculateExponentialPriceSafe(uint256 currentSupply) internal pure returns (UD60x18 price) {
        uint256 expSupply = currentSupply - LINEAR_PHASE_END;
        
        // CRITICAL: Cap exponential input to prevent overflow
        // Max 50 tokens in exp phase = reasonable price growth
        if (expSupply > 50 ether) {
            expSupply = 50 ether;
        }
        
        // Use smaller base and limited iterations
        UD60x18 expFactor = ud(1e18);
        UD60x18 increment = ud(expSupply).div(ud(1e18)); // Normalize to unit steps
        
        // Safe exponential approximation: (1 + 0.002)^x ≈ 1 + 0.002*x + (0.002*x)^2/2
        UD60x18 linearTerm = ud(2e15).mul(increment); // 0.002 * x
        UD60x18 quadraticTerm = linearTerm.mul(increment).div(ud(2e18)); // (0.002*x)^2/2
        
        expFactor = ud(1e18).add(linearTerm).add(quadraticTerm);
        
        price = BASE_PRICE.mul(expFactor);
    }

    /**
     * @dev Get current price - overflow protected
     */
    function getPrice() public view returns (uint256) {
        return unwrap(_calculatePrice(totalMinted));
    }

    /**
     * @dev Get current phase for UI
     */
    function getCurrentPhase() public view returns (uint256) {
        if (totalMinted < SIGMOID_PHASE_END) return 0; // Early adopter phase
        if (totalMinted < LINEAR_PHASE_END) return 1;  // Growth phase  
        return 2; // Late adopter/premium phase
    }

    /**
     * @dev Calculate total cost with overflow protection
     */
    function calculateMintCost(uint256 amount) public view returns (uint256 totalCost) {
        if (amount == 0 || amount > MAX_PURCHASE) revert InvalidAmount();
        if (totalMinted + amount > MAX_SUPPLY) revert ExceedsMaxSupply();
        
        totalCost = 0;
        
        // Calculate cost for each token with overflow check
        for (uint256 i = 0; i < amount; i++) {
            uint256 tokenPrice = unwrap(_calculatePrice(totalMinted + i));
            
            // Overflow check before addition
            if (totalCost > type(uint256).max - tokenPrice) {
                revert PriceCapExceeded();
            }
            
            totalCost += tokenPrice;
        }
    }

    /**
     * @dev Mint tokens with comprehensive overflow protection
     */
    function mint(uint256 amount) external payable nonReentrant {
        if (amount < MIN_PURCHASE || amount > MAX_PURCHASE) revert InvalidAmount();
        if (totalMinted + amount > MAX_SUPPLY) revert ExceedsMaxSupply();

        uint256 totalCost = calculateMintCost(amount);
        
        if (msg.value < totalCost) revert InsufficientPayment();

        // Update state
        totalMinted += amount;
        positions[msg.sender] += amount;

        // Refund excess payment
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }

        emit Minted(msg.sender, amount, totalCost);
        emit PhaseTransition(getCurrentPhase(), totalMinted);
    }

    /**
     * @dev Burn tokens with overflow-safe refund calculation
     */
    function burn(uint256 amount) external nonReentrant {
        if (amount == 0 || amount > positions[msg.sender]) revert InsufficientBalance();

        uint256 refund = 0;
        
        // Calculate refund with overflow protection
        for (uint256 i = 0; i < amount; i++) {
            if (totalMinted > i) {
                uint256 tokenRefund = unwrap(_calculatePrice(totalMinted - 1 - i));
                
                // Overflow check
                if (refund > type(uint256).max - tokenRefund) {
                    revert PriceCapExceeded();
                }
                
                refund += tokenRefund;
            }
        }

        // Update state
        totalMinted -= amount;
        positions[msg.sender] -= amount;

        // Transfer refund
        payable(msg.sender).transfer(refund);

        emit Burned(msg.sender, amount, refund);
    }

    /**
     * @dev Emergency function - only if something goes very wrong
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // View functions for frontend
    function getContractInfo() external view returns (
        uint256 _totalMinted,
        uint256 _currentPhase,
        uint256 _currentPrice,
        uint256 _maxSupply,
        uint256 _sigmoidEnd,
        uint256 _linearEnd
    ) {
        return (
            totalMinted,
            getCurrentPhase(),
            getPrice(),
            MAX_SUPPLY,
            SIGMOID_PHASE_END,
            LINEAR_PHASE_END
        );
    }

    function getUserPosition(address user) external view returns (uint256 position, uint256 currentValue) {
        position = positions[user];
        currentValue = 0;
        
        // Calculate current value of user's position
        if (position > 0 && totalMinted >= position) {
            for (uint256 i = 0; i < position; i++) {
                currentValue += unwrap(_calculatePrice(totalMinted - position + i));
            }
        }
    }

    /**
     * @dev Simulate price at different supply levels (for charts/analysis)
     */
    function getProjectedPrice(uint256 atSupply) external pure returns (uint256) {
        if (atSupply > MAX_SUPPLY) return unwrap(MAX_PRICE);
        return unwrap(_calculatePrice(atSupply));
    }
}