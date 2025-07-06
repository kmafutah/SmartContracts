// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

// Interface for SoulReparationNFT to avoid relative imports
interface ISoulReparationNFT {
    function claimReparation(
        address recipient,
        string memory title,
        uint256 amount,
        string memory description
    ) external;
}

// Interface for ZiGUtilityToken
interface IZiGUtilityToken {
    function mint(address _to, uint256 _id, uint256 _amount, bytes memory _data) external;
    function burn(address _from, uint256 _id, uint256 _amount) external;
    function balanceOf(address _owner, uint256 _id) external view returns (uint256);
}

/**
 * @title Reparations DAO with Utility Token Fuel System
 * @dev Governance for reparations distribution with African majority requirement
 * @dev Uses ZiGUtilityToken as fuel for governance operations
 */
contract ReparationsDAO is Ownable, ReentrancyGuard {
    using Math for uint256;
    
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        uint256 amount;
        address recipient;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 africanVotes; // Track African votes separately
        uint256 deadline;
        bool executed;
        uint256 fuelCost; // Track fuel cost for the proposal
    }
    
    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public votingPower;
    mapping(address => bool) public africanVerified;
    mapping(uint256 => mapping(address => bool)) public hasVoted; // Separate voting tracker
    
    // Utility token integration
    address public utilityToken;
    uint256 public PROPOSAL_FUEL_COST = 100; // 100 utility tokens to create proposal
    uint256 public VOTE_FUEL_COST = 10;      // 10 utility tokens to vote
    uint256 public EXECUTION_FUEL_COST = 50; // 50 utility tokens to execute
    uint256 public GOVERNANCE_BONUS_FUEL_COST = 25; // 25 utility tokens for governance bonus
    
    uint256 public proposalCount;
    uint256 public votingDuration = 7 days;
    uint256 public quorumRequirement = 1000e18;
    
    address public governanceToken;
    address public ethicalGuard;
    address public reparationNFT;
    
    // Fuel cost tracking
    mapping(address => uint256) public userFuelSpent;
    mapping(uint256 => uint256) public proposalFuelSpent;
    
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, uint256 amount, uint256 fuelCost);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight, uint256 fuelCost);
    event ProposalExecuted(uint256 indexed proposalId, uint256 fuelCost);
    event FuelBurned(address indexed user, uint256 tokenId, uint256 amount, string action);
    event GovernanceBonusAwarded(address indexed user, uint256 amount);
    
    constructor(
        address _initialOwner,
        address _governanceToken,
        address _ethicalGuard,
        address _reparationNFT,
        address _utilityToken
    ) Ownable(_initialOwner) {
        governanceToken = _governanceToken;
        ethicalGuard = _ethicalGuard;
        reparationNFT = _reparationNFT;
        utilityToken = _utilityToken;
    }

    /**
     * @dev Create a proposal with utility token fuel cost
     * Requires TRANSACTION_FEE_TOKEN (ID: 1) as fuel
     */
    function createProposal(
        string memory _description,
        uint256 _amount,
        address _recipient
    ) external returns (uint256) {
        require(votingPower[msg.sender] > 0, "DAO: No voting power");
        require(africanVerified[msg.sender], "DAO: Must be verified African");
        
        // Burn fuel tokens for proposal creation
        _burnFuel(msg.sender, 1, PROPOSAL_FUEL_COST, "proposal_creation");
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.description = _description;
        proposal.amount = _amount;
        proposal.recipient = _recipient;
        proposal.deadline = block.timestamp + votingDuration;
        proposal.fuelCost = PROPOSAL_FUEL_COST;
        
        userFuelSpent[msg.sender] += PROPOSAL_FUEL_COST;
        proposalFuelSpent[proposalId] += PROPOSAL_FUEL_COST;
        
        emit ProposalCreated(proposalId, msg.sender, _amount, PROPOSAL_FUEL_COST);
        return proposalId;
    }
    
    /**
     * @dev Vote on a proposal with utility token fuel cost
     * Requires TRANSACTION_FEE_TOKEN (ID: 1) as fuel
     */
    function vote(uint256 _proposalId, bool _support) external {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp < proposal.deadline, "DAO: Voting ended");
        require(!hasVoted[_proposalId][msg.sender], "DAO: Already voted");
        require(votingPower[msg.sender] > 0, "DAO: No voting power");
        
        // Burn fuel tokens for voting
        _burnFuel(msg.sender, 1, VOTE_FUEL_COST, "voting");
        
        hasVoted[_proposalId][msg.sender] = true;
        uint256 weight = votingPower[msg.sender];
        
        if (_support) {
            proposal.votesFor += weight;
        } else {
            proposal.votesAgainst += weight;
        }
        
        // Track African votes separately
        if (africanVerified[msg.sender]) {
            proposal.africanVotes += weight;
        }
        
        userFuelSpent[msg.sender] += VOTE_FUEL_COST;
        proposalFuelSpent[_proposalId] += VOTE_FUEL_COST;
        
        emit VoteCast(_proposalId, msg.sender, _support, weight, VOTE_FUEL_COST);
    }
    
    /**
     * @dev Execute a proposal with utility token fuel cost
     * Requires TRANSACTION_FEE_TOKEN (ID: 1) as fuel
     */
    function executeProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp >= proposal.deadline, "DAO: Voting not ended");
        require(!proposal.executed, "DAO: Already executed");
        require(proposal.votesFor > proposal.votesAgainst, "DAO: Proposal rejected");
        
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        require(totalVotes >= quorumRequirement, "DAO: Quorum not met");
        require(
            (proposal.africanVotes * 100) / totalVotes >= 51,
            "DAO: Need 51% African votes"
        );
        
        // Burn fuel tokens for execution
        _burnFuel(msg.sender, 1, EXECUTION_FUEL_COST, "proposal_execution");
        
        proposal.executed = true;
        proposal.fuelCost += EXECUTION_FUEL_COST;
        
        userFuelSpent[msg.sender] += EXECUTION_FUEL_COST;
        proposalFuelSpent[_proposalId] += EXECUTION_FUEL_COST;
        
        ISoulReparationNFT(reparationNFT).claimReparation(
            proposal.recipient,
            "DAO Approved Reparation",
            proposal.amount,
            proposal.description
        );
        
        emit ProposalExecuted(_proposalId, EXECUTION_FUEL_COST);
    }
    
    /**
     * @dev Award governance bonus tokens to active participants
     * Requires GOVERNANCE_BONUS_TOKEN (ID: 3) as fuel
     */
    function awardGovernanceBonus(address _user, uint256 _amount) external {
        require(msg.sender == owner() || africanVerified[msg.sender], "DAO: Not authorized");
        require(_amount > 0, "DAO: Invalid bonus amount");
        
        // Burn fuel tokens for governance bonus
        _burnFuel(msg.sender, 3, GOVERNANCE_BONUS_FUEL_COST, "governance_bonus");
        
        // Mint staking reward tokens as bonus
        IZiGUtilityToken(utilityToken).mint(_user, 2, _amount, ""); // STAKING_REWARD_TOKEN = 2
        
        userFuelSpent[msg.sender] += GOVERNANCE_BONUS_FUEL_COST;
        
        emit GovernanceBonusAwarded(_user, _amount);
    }
    
    /**
     * @dev Internal function to burn fuel tokens
     */
    function _burnFuel(address _user, uint256 _tokenId, uint256 _amount, string memory _action) internal {
        require(
            IZiGUtilityToken(utilityToken).balanceOf(_user, _tokenId) >= _amount,
            "DAO: Insufficient fuel tokens"
        );
        
        IZiGUtilityToken(utilityToken).burn(_user, _tokenId, _amount);
        emit FuelBurned(_user, _tokenId, _amount, _action);
    }
    
    /**
     * @dev Check if user has sufficient fuel for an action
     */
    function hasSufficientFuel(address _user, string memory _action) public view returns (bool) {
        uint256 requiredFuel = 0;
        uint256 tokenId = 1; // Default to TRANSACTION_FEE_TOKEN
        
        if (keccak256(bytes(_action)) == keccak256(bytes("proposal_creation"))) {
            requiredFuel = PROPOSAL_FUEL_COST;
        } else if (keccak256(bytes(_action)) == keccak256(bytes("voting"))) {
            requiredFuel = VOTE_FUEL_COST;
        } else if (keccak256(bytes(_action)) == keccak256(bytes("proposal_execution"))) {
            requiredFuel = EXECUTION_FUEL_COST;
        } else if (keccak256(bytes(_action)) == keccak256(bytes("governance_bonus"))) {
            requiredFuel = GOVERNANCE_BONUS_FUEL_COST;
            tokenId = 3; // GOVERNANCE_BONUS_TOKEN
        }
        
        return IZiGUtilityToken(utilityToken).balanceOf(_user, tokenId) >= requiredFuel;
    }
    
    /**
     * @dev Get fuel costs for different actions
     */
    function getFuelCosts() external view returns (
        uint256 proposalCost,
        uint256 voteCost,
        uint256 executionCost,
        uint256 governanceBonusCost
    ) {
        return (PROPOSAL_FUEL_COST, VOTE_FUEL_COST, EXECUTION_FUEL_COST, GOVERNANCE_BONUS_FUEL_COST);
    }
    
    /**
     * @dev Get user's fuel statistics
     */
    function getUserFuelStats(address _user) external view returns (
        uint256 totalSpent,
        uint256 transactionFeeBalance,
        uint256 stakingRewardBalance,
        uint256 governanceBonusBalance,
        uint256 culturalAccessBalance
    ) {
        totalSpent = userFuelSpent[_user];
        transactionFeeBalance = IZiGUtilityToken(utilityToken).balanceOf(_user, 1);
        stakingRewardBalance = IZiGUtilityToken(utilityToken).balanceOf(_user, 2);
        governanceBonusBalance = IZiGUtilityToken(utilityToken).balanceOf(_user, 3);
        culturalAccessBalance = IZiGUtilityToken(utilityToken).balanceOf(_user, 4);
    }
    
    function setVotingPower(address _user, uint256 _power) external onlyOwner {
        votingPower[_user] = _power;
    }
    
    function verifyAfrican(address _user) external onlyOwner {
        africanVerified[_user] = true;
    }
    
    function setUtilityToken(address _utilityToken) external onlyOwner {
        utilityToken = _utilityToken;
    }
    
    function setFuelCosts(
        uint256 _proposalCost,
        uint256 _voteCost,
        uint256 _executionCost,
        uint256 _governanceBonusCost
    ) external onlyOwner {
        PROPOSAL_FUEL_COST = _proposalCost;
        VOTE_FUEL_COST = _voteCost;
        EXECUTION_FUEL_COST = _executionCost;
        GOVERNANCE_BONUS_FUEL_COST = _governanceBonusCost;
    }

    function getProposal(uint256 id) public view returns (Proposal memory) {
        return proposals[id];
    }

    function getAllProposals(uint256 limit, uint256 offset) public view returns (Proposal[] memory) {
        uint256 count = proposalCount;
        if (offset >= count) {
            return new Proposal[](0);
        }
        uint256 end = offset + limit;
        if (end > count) {
            end = count;
        }
        Proposal[] memory result = new Proposal[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = proposals[i + 1]; // proposals are 1-indexed
        }
        return result;
    }

    function getUserInfo(address user) public view returns (uint256, bool) {
        return (votingPower[user], africanVerified[user]);
    }

    function getProposalCount() public view returns (uint256) {
        return proposalCount;
    }
}