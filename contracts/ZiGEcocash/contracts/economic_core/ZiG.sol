// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ZiG Token - Gold-backed Stablecoin
 * @dev Main stablecoin pegged to Zimbabwe's physical gold coin
 */
contract ZiG is ERC20, ERC20Burnable, Ownable, Pausable {
    address public vault;
    uint256 public goldBackingPerToken; // mg of gold per ZiG token
    
    event VaultUpdated(address newVault);
    event GoldBackingUpdated(uint256 newBacking);
    
    uint8 private _decimals = 18;
    uint256 public totalMinted;
    uint256 public totalBurned;
    
    mapping(address => bool) public minters;
    mapping(address => bool) public burners;
    
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event BurnerAdded(address indexed burner);
    event BurnerRemoved(address indexed burner);
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    
    constructor(uint256 initialGoldBacking) ERC20("ZiG Goldcoin-backed Stablecoin", "ZiG") Ownable(msg.sender) {
        minters[msg.sender] = true;
        burners[msg.sender] = true;
        goldBackingPerToken = initialGoldBacking;
    }
    
    function setVault(address _vault) external onlyOwner {
        require(_vault != address(0), "Invalid vault address");
        vault = _vault;
        emit VaultUpdated(_vault);
    }
    
    function updateGoldBacking(uint256 newBacking) external onlyOwner {
        goldBackingPerToken = newBacking;
        emit GoldBackingUpdated(newBacking);
    }
    
    modifier onlyMinter() {
        require(minters[msg.sender], "ZiG: Not authorized minter");
        _;
    }
    
    modifier onlyBurner() {
        require(burners[msg.sender], "ZiG: Not authorized burner");
        _;
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    function addMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "Invalid minter address");
        minters[_minter] = true;
        emit MinterAdded(_minter);
    }
    
    function removeMinter(address _minter) external onlyOwner {
        minters[_minter] = false;
        emit MinterRemoved(_minter);
    }
    
    function addBurner(address _burner) external onlyOwner {
        require(_burner != address(0), "Invalid burner address");
        burners[_burner] = true;
        emit BurnerAdded(_burner);
    }
    
    function removeBurner(address _burner) external onlyOwner {
        burners[_burner] = false;
        emit BurnerRemoved(_burner);
    }
    
    function mint(address _to, uint256 _amount) external onlyMinter whenNotPaused {
        require(_to != address(0), "Cannot mint to zero address");
        require(_amount > 0, "Amount must be greater than 0");
        _mint(_to, _amount);
        totalMinted += _amount;
        emit TokensMinted(_to, _amount);
    }
    
    function burn(uint256 _amount) public override onlyBurner {
        require(_amount > 0, "Amount must be greater than 0");
        super.burn(_amount);
        totalBurned += _amount;
        emit TokensBurned(msg.sender, _amount);
    }
    
    function burnFrom(address account, uint256 amount) public override onlyBurner {
        require(amount > 0, "Amount must be greater than 0");
        super.burnFrom(account, amount);
        totalBurned += amount;
        emit TokensBurned(account, amount);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Override _update to add pausable functionality to transfers
    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        super._update(from, to, value);
    }
}