// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "../cultural_utilty_layer/SoulReparationNFT.sol";

/**
 * @title Reparations DAO
 * @dev Governance for reparations distribution with African majority requirement
 */
contract ReparationsDAO is Ownable {
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
    }
    
    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public votingPower;
    mapping(address => bool) public africanVerified;
    mapping(uint256 => mapping(address => bool)) public hasVoted; // Separate voting tracker
    
    uint256 public proposalCount;
    uint256 public votingDuration = 7 days;
    uint256 public quorumRequirement = 1000e18;
    
    address public governanceToken;
    address public ethicalGuard;
    address public reparationNFT;
    
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, uint256 amount);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    
    constructor(
        address _initialOwner,
        address _governanceToken,
        address _ethicalGuard,
        address _reparationNFT
    ) Ownable(_initialOwner) {
        governanceToken = _governanceToken;
        ethicalGuard = _ethicalGuard;
        reparationNFT = _reparationNFT;
    }

    function createProposal(
        string memory _description,
        uint256 _amount,
        address _recipient
    ) external returns (uint256) {
        require(votingPower[msg.sender] > 0, "DAO: No voting power");
        require(africanVerified[msg.sender], "DAO: Must be verified African");
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.description = _description;
        proposal.amount = _amount;
        proposal.recipient = _recipient;
        proposal.deadline = block.timestamp + votingDuration;
        
        emit ProposalCreated(proposalId, msg.sender, _amount);
        return proposalId;
    }
    
    function vote(uint256 _proposalId, bool _support) external {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp < proposal.deadline, "DAO: Voting ended");
        require(!hasVoted[_proposalId][msg.sender], "DAO: Already voted");
        require(votingPower[msg.sender] > 0, "DAO: No voting power");
        
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
        
        emit VoteCast(_proposalId, msg.sender, _support, weight);
    }
    
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
        
        proposal.executed = true;
        
        SoulReparationNFT(reparationNFT).claimReparation(
            proposal.recipient,
            "DAO Approved Reparation",
            proposal.amount,
            proposal.description
        );
        
        emit ProposalExecuted(_proposalId);
    }
    
    function setVotingPower(address _user, uint256 _power) external onlyOwner {
        votingPower[_user] = _power;
    }
    
    function verifyAfrican(address _user) external onlyOwner {
        africanVerified[_user] = true;
    }
}