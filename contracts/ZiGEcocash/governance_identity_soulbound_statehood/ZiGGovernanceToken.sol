// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Interface for ReparationsDAO to avoid circular dependency
interface IReparationsDAO {
    function setVotingPower(address user, uint256 power) external;
}

/**
 * @title ZiG Governance Token
 * @dev Governance token for the ZiG ecosystem
 */
contract ZiGGovernanceToken is ERC20, Ownable, ReentrancyGuard {
    
    mapping(address => bool) public minters;
    address public reparationsDAO;
    uint256 public maxSupply;
    bool public mintingPaused;
    
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event ReparationsDAOUpdated(address indexed oldDAO, address indexed newDAO);
    event MintingPaused();
    event MintingUnpaused();
    event MaxSupplyUpdated(uint256 oldMaxSupply, uint256 newMaxSupply);
    
    modifier onlyMinter() {
        require(minters[msg.sender], "ZiGGOV: Not authorized minter");
        _;
    }
    
    modifier whenMintingNotPaused() {
        require(!mintingPaused, "ZiGGOV: Minting is paused");
        _;
    }
    
    constructor(uint256 _maxSupply) ERC20("ZiG Governance Token", "ZiGGOV") Ownable(msg.sender) {
        require(_maxSupply > 0, "ZiGGOV: Max supply must be greater than 0");
        maxSupply = _maxSupply;
        minters[msg.sender] = true;
        emit MinterAdded(msg.sender);
    }
    
    function mint(address _to, uint256 _amount) external onlyMinter whenMintingNotPaused nonReentrant {
        require(_to != address(0), "ZiGGOV: Cannot mint to zero address");
        require(_amount > 0, "ZiGGOV: Amount must be greater than 0");
        require(totalSupply() + _amount <= maxSupply, "ZiGGOV: Would exceed max supply");
        
        _mint(_to, _amount);
        
        // Update voting power in DAO
        _updateVotingPower(_to);
    }
    
    function burn(uint256 _amount) external {
        require(_amount > 0, "ZiGGOV: Amount must be greater than 0");
        require(balanceOf(msg.sender) >= _amount, "ZiGGOV: Insufficient balance");
        
        _burn(msg.sender, _amount);
        
        // Update voting power in DAO
        _updateVotingPower(msg.sender);
    }
    
    function setReparationsDAO(address _dao) external onlyOwner {
        require(_dao != address(0), "ZiGGOV: Invalid DAO address");
        require(_dao != reparationsDAO, "ZiGGOV: Same DAO address");
        
        address oldDAO = reparationsDAO;
        reparationsDAO = _dao;
        emit ReparationsDAOUpdated(oldDAO, _dao);
    }
    
    function addMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "ZiGGOV: Invalid minter address");
        require(!minters[_minter], "ZiGGOV: Already a minter");
        
        minters[_minter] = true;
        emit MinterAdded(_minter);
    }
    
    function removeMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "ZiGGOV: Invalid minter address");
        require(minters[_minter], "ZiGGOV: Not a minter");
        require(_minter != owner(), "ZiGGOV: Cannot remove owner as minter");
        
        minters[_minter] = false;
        emit MinterRemoved(_minter);
    }
    
    function pauseMinting() external onlyOwner {
        require(!mintingPaused, "ZiGGOV: Already paused");
        mintingPaused = true;
        emit MintingPaused();
    }
    
    function unpauseMinting() external onlyOwner {
        require(mintingPaused, "ZiGGOV: Not paused");
        mintingPaused = false;
        emit MintingUnpaused();
    }
    
    function updateMaxSupply(uint256 _newMaxSupply) external onlyOwner {
        require(_newMaxSupply > 0, "ZiGGOV: Max supply must be greater than 0");
        require(_newMaxSupply >= totalSupply(), "ZiGGOV: New max supply below current supply");
        require(_newMaxSupply != maxSupply, "ZiGGOV: Same max supply");
        
        uint256 oldMaxSupply = maxSupply;
        maxSupply = _newMaxSupply;
        emit MaxSupplyUpdated(oldMaxSupply, _newMaxSupply);
    }
    
    function _updateVotingPower(address _user) internal {
        if (reparationsDAO != address(0)) {
            try IReparationsDAO(reparationsDAO).setVotingPower(_user, balanceOf(_user)) {
                // Success - voting power updated
            } catch {
                // Silently fail to avoid blocking token transfers
                // Could emit an event here for monitoring
            }
        }
    }
    
    // Override transfer functions to update voting power
    function _update(address from, address to, uint256 value) internal virtual override {
        super._update(from, to, value);
        
        // Update voting power for both sender and receiver
        if (from != address(0)) {
            _updateVotingPower(from);
        }
        if (to != address(0)) {
            _updateVotingPower(to);
        }
    }
    
    function isMinter(address _account) external view returns (bool) {
        return minters[_account];
    }
    
    function getRemainingMintableSupply() external view returns (uint256) {
        return maxSupply - totalSupply();
    }
}