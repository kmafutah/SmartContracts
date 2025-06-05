// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol"; // Assuming this exists or you manage checkpoints
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract ZiGGovernanceToken is Initializable, ERC20Upgradeable, ERC20PermitUpgradeable, ERC20VotesUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    address public treasuryAddress; // State variable for treasury

    // Constructor should be empty for UUPS implementation contracts
    // constructor() ERC20PermitUpgradeable("ZiGGovernanceToken") {} // ERC20PermitUpgradeable might need name in constructor

    function initialize(
        address _treasuryAddress,
        uint256 initialSupply,
        address _initialOwner
    ) public initializer {
        __ERC20_init("ZiGGovernanceToken", "ZGT");
        __ERC20Permit_init("ZiGGovernanceToken"); // Initialize ERC20Permit
        __ERC20Votes_init(); // Initialize ERC20Votes
        __Ownable_init(_initialOwner);
        __UUPSUpgradeable_init();

        require(_treasuryAddress != address(0), "Treasury cannot be zero address");
        require(_initialOwner != address(0), "Owner cannot be zero address");
        require(initialSupply > 0, "Initial supply must be greater than zero");

        treasuryAddress = _treasuryAddress; // Store treasury address
        _mint(treasuryAddress, initialSupply);
    }

    // ... rest of the contract (mint, _authorizeUpgrade, _update, nonces, snapshot) ...

    // Ensure _update and nonces correctly override all necessary parents
    // For ERC20VotesUpgradeable, you'd need to manage checkpoints (_writeCheckpoint)
    // and potentially override _afterTokenTransfer, _mint, _burn.
    // OpenZeppelin's ERC20VotesUpgradeable handles this internally.

    // --- Overrides required by Solidity for ERC20Votes ---
    // (Adjust based on actual ERC20VotesUpgradeable structure)
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20Upgradeable, ERC20VotesUpgradeable) // Ensure correct parents
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20PermitUpgradeable, NoncesUpgradeable) // Ensure correct parents
        returns (uint256)
    {
        return super.nonces(owner);
    }

    // Minting function
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // Snapshot (if still needed alongside ERC20Votes)
    event Snapshot(uint256 id);
    uint256 public currentSnapshotId;
    function snapshot() external onlyOwner returns (uint256) {
        currentSnapshotId++;
        emit Snapshot(currentSnapshotId);
        return currentSnapshotId;
    }
}
