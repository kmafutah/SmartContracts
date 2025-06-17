// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ZiGT Token - Fiat-pegged Token
 * @dev Token pegged to ZWG (Zimbabwean fiat)
 */
contract ZiGT is ERC20, ERC20Burnable, Ownable, Pausable, ReentrancyGuard {
    address public vaultAddress;
    address public zigToken;
    address public oracleHub;
    uint256 public exchangeRate; // ZiGT per ZiG (with 18 decimals)
    
    mapping(address => bool) public authorized;
    
    event VaultAddressUpdated(address indexed newVault);
    event ZigTokenUpdated(address indexed newZigToken);
    event AuthorizedAdded(address indexed user);
    event AuthorizedRemoved(address indexed user);
    event ExchangeRateUpdated(uint256 newRate);
    event TokensRedeemed(address indexed user, uint256 zigAmount, uint256 zigtAmount);
    event TokensMinted(address indexed user, uint256 zigAmount, uint256 zigtAmount);
    
    constructor(
        address _zigToken,
        address _vaultAddress
    ) ERC20("Zimbabwe Gold Tether", "ZiGT") Ownable(msg.sender) {
        require(_zigToken != address(0), "Invalid ZiG token address");
        require(_vaultAddress != address(0), "Invalid vault address");
        
        vaultAddress = _vaultAddress;
        zigToken = _zigToken;
        exchangeRate = 1e18; // 1:1 initial rate
        authorized[msg.sender] = true;
    }

    modifier onlyVault() {
        require(msg.sender == vaultAddress, "Only Vault can call");
        _;
    }
    
    modifier onlyAuthorized() {
        require(authorized[msg.sender], "ZiGT: Not authorized");
        _;
    }
    
    function setVaultAddress(address _vaultAddress) external onlyOwner {
        require(_vaultAddress != address(0), "Invalid vault address");
        vaultAddress = _vaultAddress;
        emit VaultAddressUpdated(_vaultAddress);
    }
    
    function setZigToken(address _zigToken) external onlyOwner {
        require(_zigToken != address(0), "Invalid ZiG token address");
        zigToken = _zigToken;
        emit ZigTokenUpdated(_zigToken);
    }
    
    function setOracleHub(address _oracleHub) external onlyOwner {
        require(_oracleHub != address(0), "Invalid oracle hub address");
        oracleHub = _oracleHub;
    }
    
    function addAuthorized(address _user) external onlyOwner {
        require(_user != address(0), "Invalid user address");
        authorized[_user] = true;
        emit AuthorizedAdded(_user);
    }
    
    function removeAuthorized(address _user) external onlyOwner {
        authorized[_user] = false;
        emit AuthorizedRemoved(_user);
    }
    
    function updateExchangeRate(uint256 _newRate) external onlyAuthorized {
        require(_newRate > 0, "Exchange rate must be greater than 0");
        exchangeRate = _newRate;
        emit ExchangeRateUpdated(_newRate);
    }
    
    function mint(address account, uint256 amount) public onlyVault {
        require(account != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) public onlyVault {
        require(account != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be greater than 0");
        _burn(account, amount);
    }
    
    function mintWithZiG(uint256 _zigAmount) external whenNotPaused nonReentrant {
        require(_zigAmount > 0, "Amount must be greater than 0");
        require(zigToken != address(0), "ZiG token not set");
        
        // Calculate ZiGT amount to mint
        uint256 zigtAmount = (_zigAmount * exchangeRate) / 1e18;
        require(zigtAmount > 0, "Calculated amount is zero");
        
        // Transfer ZiG tokens from user to this contract
        require(
            IERC20(zigToken).transferFrom(msg.sender, address(this), _zigAmount),
            "ZiGT: ZiG transfer failed"
        );
        
        // Mint ZiGT tokens to user
        _mint(msg.sender, zigtAmount);
        
        emit TokensMinted(msg.sender, _zigAmount, zigtAmount);
    }
    
    function redeemForZiG(uint256 _zigtAmount) external whenNotPaused nonReentrant {
        require(_zigtAmount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= _zigtAmount, "ZiGT: Insufficient balance");
        require(zigToken != address(0), "ZiG token not set");
        
        // Calculate ZiG amount to return
        uint256 zigAmount = (_zigtAmount * 1e18) / exchangeRate;
        require(zigAmount > 0, "Calculated amount is zero");
        
        // Check if contract has enough ZiG tokens
        require(
            IERC20(zigToken).balanceOf(address(this)) >= zigAmount,
            "ZiGT: Insufficient ZiG reserves"
        );
        
        // Burn ZiGT tokens from user
        _burn(msg.sender, _zigtAmount);
        
        // Transfer ZiG tokens to user
        require(
            IERC20(zigToken).transfer(msg.sender, zigAmount),
            "ZiGT: ZiG transfer failed"
        );
        
        emit TokensRedeemed(msg.sender, zigAmount, _zigtAmount);
    }
    
    function getZiGReserves() external view returns (uint256) {
        if (zigToken == address(0)) return 0;
        return IERC20(zigToken).balanceOf(address(this));
    }
    
    function calculateZigtFromZig(uint256 _zigAmount) external view returns (uint256) {
        return (_zigAmount * exchangeRate) / 1e18;
    }
    
    function calculateZigFromZigt(uint256 _zigtAmount) external view returns (uint256) {
        return (_zigtAmount * 1e18) / exchangeRate;
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
    
    // Emergency function to recover stuck tokens (only owner)
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(IERC20(token).transfer(owner(), amount), "Transfer failed");
    }
}