// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract ReparationsDAO is 
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    address public timelock;
    mapping(address => bool) public authorized;
    uint256 public proposalCount;
    uint256 public minDelay;

    struct Proposal {
        address proposer;
        uint256 eta;
        bytes callData;
        address target;
        bool executed;
    }

    mapping(uint256 => Proposal) public proposals;

    event ProposalCreated(uint256 indexed id, address indexed proposer, address target, bytes callData, uint256 eta);
    event ProposalExecuted(uint256 indexed id);
    event Authorized(address indexed user, bool status);
    event TimelockChanged(address indexed newTimelock);
    event MinDelayChanged(uint256 newDelay);

    modifier onlyTimelock() {
        require(msg.sender == timelock, "Not timelock");
        _;
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
    }

    // Required override for UUPS
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setTimelock(address _timelock) external onlyOwner {
        timelock = _timelock;
        emit TimelockChanged(_timelock);
    }

    function setMinDelay(uint256 _minDelay) external onlyOwner {
        minDelay = _minDelay;
        emit MinDelayChanged(_minDelay);
    }

    function setAuthorized(address user, bool status) external onlyOwner {
        authorized[user] = status;
        emit Authorized(user, status);
    }

    function isAuthorized(address user) external view returns (bool) {
        return authorized[user];
    }

    function propose(address target, bytes calldata callData, uint256 eta) external returns (uint256) {
        require(eta >= block.timestamp + minDelay, "Insufficient delay");
        proposalCount++;
        proposals[proposalCount] = Proposal({
            proposer: msg.sender,
            eta: eta,
            callData: callData,
            target: target,
            executed: false
        });
        emit ProposalCreated(proposalCount, msg.sender, target, callData, eta);
        return proposalCount;
    }

    function execute(uint256 proposalId) external nonReentrant {
        Proposal storage prop = proposals[proposalId];
        require(block.timestamp >= prop.eta, "Too early");
        require(!prop.executed, "Already executed");
        (bool success, ) = prop.target.call(prop.callData);
        require(success, "Execution failed");
        prop.executed = true;
        emit ProposalExecuted(proposalId);
    }
}