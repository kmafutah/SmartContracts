// SPDX-License-Identifier: UNLICENSED
/**
 * @custom:dev-run-script scripts/deploy.js --network skale
 */
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";
import "@chainlink/contracts-ccip/contracts/interfaces/IAny2EVMMessageReceiver.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract ZiGGovernance is ERC20Votes, CCIPReceiver {
    using Math for uint256;

    struct Proposal {
        uint256 id;
        address target;
        bytes data;
        uint256 voteStart;
        uint256 voteEnd;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => mapping(uint256 => bool)) public hasVoted;

    uint256 public constant MIN_PROPOSAL_THRESHOLD = 1000e18;
    uint256 public constant VOTING_PERIOD = 3 days;

    event ProposalCreated(uint256 indexed proposalId);
    event VoteCast(address indexed voter, uint256 proposalId, bool support);
    event ProposalExecuted(uint256 indexed proposalId);
    event MessageReceived(address indexed sender, bytes data);

    constructor(address router, string memory name, string memory symbol, string memory version) 
        ERC20(name, symbol) 
        EIP712(name, version) 
        CCIPReceiver(router) {
        // Constructor logic if needed
    }

    function _ccipReceive(Client.Any2EVMMessage memory message) internal override {
        // Decode the message
        address sender = abi.decode(message.sender, (address));
        bytes memory data = message.data;

        // Emit an event to log the received message
        emit MessageReceived(sender, data);

        // Add custom logic to process the message if needed
        // For example, you could parse the data and take specific actions
    }

    function createProposal(address target, bytes calldata data) external {
        require(balanceOf(msg.sender) >= MIN_PROPOSAL_THRESHOLD, "Insufficient power");

        proposalCount++;
        proposals[proposalCount] = Proposal({
            id: proposalCount,
            target: target,
            data: data,
            voteStart: block.timestamp,
            voteEnd: block.timestamp + VOTING_PERIOD,
            forVotes: 0,
            againstVotes: 0,
            executed: false
        });

        emit ProposalCreated(proposalCount);
    }

    function castVote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp <= proposal.voteEnd, "Voting ended");
        require(!hasVoted[msg.sender][proposalId], "Already voted");

        uint256 votes = balanceOf(msg.sender);
        if(support) {
            proposal.forVotes += votes;
        } else {
            proposal.againstVotes += votes;
        }

        hasVoted[msg.sender][proposalId] = true;
        emit VoteCast(msg.sender, proposalId, support);
    }

    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.voteEnd, "Voting ongoing");
        require(!proposal.executed, "Already executed");
        require(proposal.forVotes > proposal.againstVotes, "Proposal failed");

        (bool success, ) = proposal.target.call(proposal.data);
        require(success, "Execution failed");

        proposal.executed = true;
        emit ProposalExecuted(proposalId);
    }
}
