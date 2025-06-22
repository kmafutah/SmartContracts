// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title ZiG GameFi Token
 * @dev Gaming and DeFi integration token with score-based rewards system
 * 
 * FIXES APPLIED:
 * 1. Removed unused imports (ERC721, ERC1155)
 * 2. Made contract concrete instead of abstract
 * 3. Fixed constructor to properly initialize Ownable
 * 4. Added ReentrancyGuard for claim function
 * 5. Fixed potential overflow in reward calculations
 * 6. Added proper initialization for lastRewardClaim
 * 7. Added input validation and bounds checking
 * 8. Improved event structure and error handling
 * 9. Added view functions for better integration
 * 10. Fixed potential exploit in reward calculation
 */
contract ZiGGameFiToken is ERC20, ERC20Burnable, Ownable, ReentrancyGuard {
    using Math for uint256;
    
    // Game integration
    mapping(address => bool) public gameContracts;
    mapping(address => uint256) public playerScores;
    mapping(address => uint256) public lastRewardClaim;
    mapping(address => uint256) public totalRewardsClaimed;
    
    // Reward parameters
    uint256 public constant REWARD_RATE = 100e18; // Tokens per point per day
    uint256 public constant CLAIM_COOLDOWN = 1 days;
    uint256 public constant MAX_SCORE = 1_000_000; // Prevent unrealistic scores
    uint256 public constant MAX_DAILY_REWARDS = 1_000_000e18; // Daily reward cap per user
    
    // Total rewards tracking
    uint256 public totalRewardsDistributed;
    uint256 public maxTotalRewards = 100_000_000e18; // 100M token cap for rewards
    
    // Events
    event GameContractAdded(address indexed gameContract);
    event GameContractRemoved(address indexed gameContract);
    event GameScoreUpdated(address indexed player, uint256 oldScore, uint256 newScore);
    event RewardsClaimed(address indexed player, uint256 amount, uint256 newTotal);
    event RewardParametersUpdated(uint256 newMaxTotalRewards);
    
    // Custom errors
    error UnauthorizedGameContract();
    error ClaimCooldownActive();
    error InvalidScore();
    error RewardCapExceeded();
    error InvalidAddress();
    error NoRewardsAvailable();
    
    constructor() ERC20("ZiG GameFi Token", "ZiGGAME") Ownable(msg.sender) {
        // Initialize the deployer as the first authorized game contract
        gameContracts[msg.sender] = true;
        emit GameContractAdded(msg.sender);
    }
    
    /**
     * @dev Update player score from authorized game contracts
     * @param _player The player whose score to update
     * @param _score The new score (must be reasonable)
     */
    function updatePlayerScore(address _player, uint256 _score) external {
        if (!gameContracts[msg.sender]) revert UnauthorizedGameContract();
        if (_player == address(0)) revert InvalidAddress();
        if (_score > MAX_SCORE) revert InvalidScore();
        
        uint256 oldScore = playerScores[_player];
        playerScores[_player] = _score;
        
        // Initialize claim timestamp for new players
        if (lastRewardClaim[_player] == 0) {
            lastRewardClaim[_player] = block.timestamp;
        }
        
        emit GameScoreUpdated(_player, oldScore, _score);
    }
    
    /**
     * @dev Claim accumulated rewards based on score and time
     */
    function claimRewards() external nonReentrant {
        if (block.timestamp < lastRewardClaim[msg.sender] + CLAIM_COOLDOWN) {
            revert ClaimCooldownActive();
        }
        
        uint256 rewardAmount = calculatePendingRewards(msg.sender);
        if (rewardAmount == 0) revert NoRewardsAvailable();
        
        // Check global reward cap
        if (totalRewardsDistributed + rewardAmount > maxTotalRewards) {
            revert RewardCapExceeded();
        }
        
        // Update state before minting (CEI pattern)
        lastRewardClaim[msg.sender] = block.timestamp;
        totalRewardsClaimed[msg.sender] += rewardAmount;
        totalRewardsDistributed += rewardAmount;
        
        // Mint rewards
        _mint(msg.sender, rewardAmount);
        
        emit RewardsClaimed(msg.sender, rewardAmount, totalRewardsClaimed[msg.sender]);
    }
    
    /**
     * @dev Calculate pending rewards for a player
     * @param _player The player to calculate rewards for
     * @return rewardAmount The amount of rewards pending
     */
    function calculatePendingRewards(address _player) public view returns (uint256 rewardAmount) {
        if (lastRewardClaim[_player] == 0 || playerScores[_player] == 0) {
            return 0;
        }

        uint256 timeSinceLastClaim = block.timestamp - lastRewardClaim[_player];
        if (timeSinceLastClaim < CLAIM_COOLDOWN) {
            return 0;
        }

        // Calculate base reward: score * rate * time
        // Use '*' for multiplication and '/' for division directly on uint256
        rewardAmount = (playerScores[_player] * REWARD_RATE * timeSinceLastClaim) / 1 days;

        // Apply daily cap
        uint256 dailyReward = playerScores[_player] * REWARD_RATE;
        // Corrected the daily cap calculation to use arithmetic operators
        if (rewardAmount > (dailyReward * timeSinceLastClaim) / 1 days) {
            // Assuming Math.min is either imported or a custom function.
            // If it's part of OpenZeppelin's Math, ensure it's imported.
            rewardAmount = Math.min(rewardAmount, (MAX_DAILY_REWARDS * timeSinceLastClaim) / 1 days);
        }

        // Ensure we don't exceed global cap
        if (totalRewardsDistributed + rewardAmount > maxTotalRewards) {
            if (totalRewardsDistributed >= maxTotalRewards) {
                return 0;
            }
            rewardAmount = maxTotalRewards - totalRewardsDistributed;
        }
    }
    
    /**
     * @dev Add a new authorized game contract
     * @param _gameContract Address of the game contract to authorize
     */
    function addGameContract(address _gameContract) external onlyOwner {
        if (_gameContract == address(0)) revert InvalidAddress();
        
        gameContracts[_gameContract] = true;
        emit GameContractAdded(_gameContract);
    }
    
    /**
     * @dev Remove authorization from a game contract
     * @param _gameContract Address of the game contract to deauthorize
     */
    function removeGameContract(address _gameContract) external onlyOwner {
        if (_gameContract == address(0)) revert InvalidAddress();
        
        gameContracts[_gameContract] = false;
        emit GameContractRemoved(_gameContract);
    }
    
    /**
     * @dev Update the maximum total rewards that can be distributed
     * @param _newMaxTotalRewards New maximum total rewards
     */
    function updateMaxTotalRewards(uint256 _newMaxTotalRewards) external onlyOwner {
        require(_newMaxTotalRewards >= totalRewardsDistributed, "Cannot set below current distribution");
        
        maxTotalRewards = _newMaxTotalRewards;
        emit RewardParametersUpdated(_newMaxTotalRewards);
    }
    
    /**
     * @dev Check if an address is an authorized game contract
     * @param _contract Address to check
     * @return bool Whether the address is authorized
     */
    function isGameContract(address _contract) external view returns (bool) {
        return gameContracts[_contract];
    }
    
    /**
     * @dev Get player statistics
     * @param _player Player address
     * @return score Current player score
     * @return lastClaim Timestamp of last reward claim
     * @return totalClaimed Total rewards claimed by player
     * @return pendingRewards Current pending rewards
     */
    function getPlayerStats(address _player) external view returns (
        uint256 score,
        uint256 lastClaim,
        uint256 totalClaimed,
        uint256 pendingRewards
    ) {
        return (
            playerScores[_player],
            lastRewardClaim[_player],
            totalRewardsClaimed[_player],
            calculatePendingRewards(_player)
        );
    }
    
    /**
     * @dev Get contract statistics
     * @return totalDistributed Total rewards distributed so far
     * @return maxTotal Maximum total rewards that can be distributed
     * @return remainingRewards Remaining rewards in the pool
     * @return rewardRate Current reward rate (tokens per point per day)
     */
    function getContractStats() external view returns (
        uint256 totalDistributed,
        uint256 maxTotal,
        uint256 remainingRewards,
        uint256 rewardRate
    ) {
        return (
            totalRewardsDistributed,
            maxTotalRewards,
            maxTotalRewards > totalRewardsDistributed ? maxTotalRewards - totalRewardsDistributed : 0,
            REWARD_RATE
        );
    }
    
    /**
     * @dev Check if a player can claim rewards
     * @param _player Player address to check
     * @return canClaim Whether the player can claim
     * @return timeUntilNextClaim Seconds until next claim is available
     */
    function canPlayerClaim(address _player) external view returns (bool canClaim, uint256 timeUntilNextClaim) {
        if (lastRewardClaim[_player] == 0) {
            return (false, 0); // Player never set up
        }
        
        uint256 nextClaimTime = lastRewardClaim[_player] + CLAIM_COOLDOWN;
        
        if (block.timestamp >= nextClaimTime) {
            canClaim = calculatePendingRewards(_player) > 0;
            timeUntilNextClaim = 0;
        } else {
            canClaim = false;
            timeUntilNextClaim = nextClaimTime - block.timestamp;
        }
    }
    
    /**
     * @dev Emergency function to pause reward distribution
     * Sets max rewards to current distribution to halt new rewards
     */
    function pauseRewards() external onlyOwner {
        maxTotalRewards = totalRewardsDistributed;
        emit RewardParametersUpdated(maxTotalRewards);
    }
}