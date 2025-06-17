// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// Interface definitions for ZiG tokens
interface IZiG {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

interface IZiGT {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

interface IZiGOracleHub {
    function getTokenPrice(address token) external view returns (uint256);
    function getGoldPricePerMg(address paxgAddress) external view returns (uint256);
    function calculateZiGPrice() external view returns (uint256);
}

/**
 * @title Vault Contract
 * @dev Collects ZiG on mint and splits revenue, handles collateralized minting
 */
contract Vault is Ownable, ReentrancyGuard, Pausable {
    
    // Revenue distribution addresses
    address public zigToken;
    address public treasury;
    address public futureReserve;
    address public diasporaFund;
    
    // Contract references
    IZiG public zig;
    IZiGT public zigt;
    IZiGOracleHub public oracleHub;
    address public paxgAddress;
    
    // Split percentages (basis points)
    uint256 public treasuryShare = 4000;  // 40%
    uint256 public futureShare = 3000;    // 30%
    uint256 public diasporaShare = 3000;  // 30%
    
    uint256 public totalCollected;
    
    // Collateral tracking
    mapping(address => mapping(address => uint256)) public userCollateralForZiG;
    mapping(address => mapping(address => uint256)) public userCollateralForZiGT;
    mapping(address => uint256) public userMintedZiG;
    mapping(address => uint256) public userMintedZiGT;
    
    // Supported tokens and their configurations
    address[] public supportedTokens;
    mapping(address => bool) public isSupportedToken;
    mapping(address => uint256) public collateralRatio; // Collateral ratio in basis points (e.g., 15000 = 150%)
    
    // Constants
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant DEFAULT_COLLATERAL_RATIO = 15000; // 150%
    
    event FundsCollected(uint256 amount);
    event FundsDistributed(uint256 treasury, uint256 future, uint256 diaspora);
    event SharesUpdated(uint256 treasuryShare, uint256 futureShare, uint256 diasporaShare);
    event CollateralDeposited(address indexed user, address indexed token, uint256 amount, bool forZiG);
    event CollateralWithdrawn(address indexed user, address indexed token, uint256 amount, bool forZiG);
    event ZiGMinted(address indexed user, uint256 amount);
    event ZiGTMinted(address indexed user, uint256 amount);
    event ZiGBurned(address indexed user, uint256 amount);
    event ZiGTBurned(address indexed user, uint256 amount);
    event TokenAdded(address indexed token, uint256 collateralRatio);
    event TokenRemoved(address indexed token);
    event CollateralRatioUpdated(address indexed token, uint256 newRatio);
    
    constructor(
        address _zigToken,
        address _treasury,
        address _futureReserve,
        address _diasporaFund,
        address _zigAddress,
        address _zigtAddress,
        address _oracleHubAddress,
        address _paxgAddress
    ) Ownable(msg.sender) {
        require(_zigToken != address(0), "Invalid ZiG token address");
        require(_treasury != address(0), "Invalid treasury address");
        require(_futureReserve != address(0), "Invalid future reserve address");
        require(_diasporaFund != address(0), "Invalid diaspora fund address");
        require(_zigAddress != address(0), "Invalid ZiG contract address");
        require(_zigtAddress != address(0), "Invalid ZiGT contract address");
        require(_oracleHubAddress != address(0), "Invalid oracle hub address");
        require(_paxgAddress != address(0), "Invalid PAXG address");
        
        zigToken = _zigToken;
        treasury = _treasury;
        futureReserve = _futureReserve;
        diasporaFund = _diasporaFund;
        
        zig = IZiG(_zigAddress);
        zigt = IZiGT(_zigtAddress);
        oracleHub = IZiGOracleHub(_oracleHubAddress);
        paxgAddress = _paxgAddress;
    }
    
    function updateShares(
        uint256 _treasuryShare,
        uint256 _futureShare,
        uint256 _diasporaShare
    ) external onlyOwner {
        require(_treasuryShare + _futureShare + _diasporaShare == BASIS_POINTS, "Vault: Shares must sum to 100%");
        
        treasuryShare = _treasuryShare;
        futureShare = _futureShare;
        diasporaShare = _diasporaShare;
        
        emit SharesUpdated(_treasuryShare, _futureShare, _diasporaShare);
    }
    
    function collectFunds(uint256 _amount) external nonReentrant whenNotPaused {
        require(_amount > 0, "Amount must be greater than 0");
        require(IERC20(zigToken).transferFrom(msg.sender, address(this), _amount), "Vault: Transfer failed");
        totalCollected += _amount;
        emit FundsCollected(_amount);
    }
    
    function distributeFunds() external onlyOwner nonReentrant {
        uint256 balance = IERC20(zigToken).balanceOf(address(this));
        require(balance > 0, "Vault: No funds to distribute");
        
        uint256 treasuryAmount = (balance * treasuryShare) / BASIS_POINTS;
        uint256 futureAmount = (balance * futureShare) / BASIS_POINTS;
        uint256 diasporaAmount = (balance * diasporaShare) / BASIS_POINTS;
        
        require(IERC20(zigToken).transfer(treasury, treasuryAmount), "Vault: Treasury transfer failed");
        require(IERC20(zigToken).transfer(futureReserve, futureAmount), "Vault: Future transfer failed");
        require(IERC20(zigToken).transfer(diasporaFund, diasporaAmount), "Vault: Diaspora transfer failed");
        
        emit FundsDistributed(treasuryAmount, futureAmount, diasporaAmount);
    }
    
    function addSupportedToken(address token, uint256 _collateralRatio) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(_collateralRatio >= BASIS_POINTS, "Collateral ratio must be at least 100%");
        require(!isSupportedToken[token], "Token already supported");
        
        supportedTokens.push(token);
        isSupportedToken[token] = true;
        collateralRatio[token] = _collateralRatio;
        
        emit TokenAdded(token, _collateralRatio);
    }
    
    function removeSupportedToken(address token) external onlyOwner {
        require(isSupportedToken[token], "Token not supported");
        
        // Remove from array
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            if (supportedTokens[i] == token) {
                supportedTokens[i] = supportedTokens[supportedTokens.length - 1];
                supportedTokens.pop();
                break;
            }
        }
        
        isSupportedToken[token] = false;
        collateralRatio[token] = 0;
        
        emit TokenRemoved(token);
    }
    
    function updateCollateralRatio(address token, uint256 _collateralRatio) external onlyOwner {
        require(isSupportedToken[token], "Token not supported");
        require(_collateralRatio >= BASIS_POINTS, "Collateral ratio must be at least 100%");
        
        collateralRatio[token] = _collateralRatio;
        emit CollateralRatioUpdated(token, _collateralRatio);
    }

    function depositCollateral(address token, uint256 amount, bool forZiG) external nonReentrant whenNotPaused {
        require(isSupportedToken[token], "Token not supported");
        require(amount > 0, "Amount must be greater than 0");
        
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        if (forZiG) {
            userCollateralForZiG[msg.sender][token] += amount;
        } else {
            userCollateralForZiGT[msg.sender][token] += amount;
        }
        
        emit CollateralDeposited(msg.sender, token, amount, forZiG);
    }
    
    function withdrawCollateral(address token, uint256 amount, bool forZiG) external nonReentrant whenNotPaused {
        require(isSupportedToken[token], "Token not supported");
        require(amount > 0, "Amount must be greater than 0");
        
        uint256 currentCollateral;
        if (forZiG) {
            currentCollateral = userCollateralForZiG[msg.sender][token];
            require(currentCollateral >= amount, "Insufficient collateral");
            userCollateralForZiG[msg.sender][token] -= amount;
            
            // Check if remaining collateral is sufficient for minted ZiG
            uint256 remainingValue = getTotalCollateralValueForZiG(msg.sender);
            uint256 goldPrice = oracleHub.getGoldPricePerMg(paxgAddress);
            uint256 requiredCollateral = (userMintedZiG[msg.sender] * goldPrice * DEFAULT_COLLATERAL_RATIO) / BASIS_POINTS;
            require(remainingValue >= requiredCollateral, "Would leave position undercollateralized");
        } else {
            currentCollateral = userCollateralForZiGT[msg.sender][token];
            require(currentCollateral >= amount, "Insufficient collateral");
            userCollateralForZiGT[msg.sender][token] -= amount;
            
            // Check if remaining collateral is sufficient for minted ZiGT
            uint256 remainingValue = getTotalCollateralValueForZiGT(msg.sender);
            uint256 requiredCollateral = (userMintedZiGT[msg.sender] * DEFAULT_COLLATERAL_RATIO) / BASIS_POINTS;
            require(remainingValue >= requiredCollateral, "Would leave position undercollateralized");
        }
        
        require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");
        emit CollateralWithdrawn(msg.sender, token, amount, forZiG);
    }

    function mintZiG(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        
        uint256 totalValue = getTotalCollateralValueForZiG(msg.sender);
        uint256 goldPrice = oracleHub.getGoldPricePerMg(paxgAddress);
        require(goldPrice > 0, "Invalid gold price");
        
        uint256 newTotalMinted = userMintedZiG[msg.sender] + amount;
        uint256 requiredCollateral = (newTotalMinted * goldPrice * DEFAULT_COLLATERAL_RATIO) / BASIS_POINTS;
        
        require(totalValue >= requiredCollateral, "Insufficient collateral");
        
        zig.mint(msg.sender, amount);
        userMintedZiG[msg.sender] = newTotalMinted;
        
        emit ZiGMinted(msg.sender, amount);
    }

    function mintZiGT(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        
        uint256 totalValue = getTotalCollateralValueForZiGT(msg.sender);
        uint256 newTotalMinted = userMintedZiGT[msg.sender] + amount;
        uint256 requiredCollateral = (newTotalMinted * DEFAULT_COLLATERAL_RATIO) / BASIS_POINTS;
        
        require(totalValue >= requiredCollateral, "Insufficient collateral");
        
        zigt.mint(msg.sender, amount);
        userMintedZiGT[msg.sender] = newTotalMinted;
        
        emit ZiGTMinted(msg.sender, amount);
    }
    
    function burnZiG(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(userMintedZiG[msg.sender] >= amount, "Cannot burn more than minted");
        
        zig.burn(msg.sender, amount);
        userMintedZiG[msg.sender] -= amount;
        
        emit ZiGBurned(msg.sender, amount);
    }
    
    function burnZiGT(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(userMintedZiGT[msg.sender] >= amount, "Cannot burn more than minted");
        
        zigt.burn(msg.sender, amount);
        userMintedZiGT[msg.sender] -= amount;
        
        emit ZiGTBurned(msg.sender, amount);
    }

    function getTotalCollateralValueForZiG(address user) public view returns (uint256) {
        uint256 totalValue = 0;
        
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            uint256 amount = userCollateralForZiG[user][token];
            
            if (amount > 0) {
                uint256 price = oracleHub.getTokenPrice(token);
                uint256 decimals = IERC20Metadata(token).decimals();
                totalValue += (amount * price) / (10**decimals);
            }
        }
        
        return totalValue;
    }

    function getTotalCollateralValueForZiGT(address user) public view returns (uint256) {
        uint256 totalValue = 0;
        
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            uint256 amount = userCollateralForZiGT[user][token];
            
            if (amount > 0) {
                uint256 price = oracleHub.getTokenPrice(token);
                uint256 decimals = IERC20Metadata(token).decimals();
                totalValue += (amount * price) / (10**decimals);
            }
        }
        
        return totalValue;
    }
    
    function getCollateralizationRatioZiG(address user) external view returns (uint256) {
        uint256 mintedValue = userMintedZiG[user];
        if (mintedValue == 0) return 0;
        
        uint256 goldPrice = oracleHub.getGoldPricePerMg(paxgAddress);
        uint256 totalValue = getTotalCollateralValueForZiG(user);
        
        return (totalValue * BASIS_POINTS) / (mintedValue * goldPrice);
    }
    
    function getCollateralizationRatioZiGT(address user) external view returns (uint256) {
        uint256 mintedValue = userMintedZiGT[user];
        if (mintedValue == 0) return 0;
        
        uint256 totalValue = getTotalCollateralValueForZiGT(user);
        return (totalValue * BASIS_POINTS) / mintedValue;
    }
    
    function getSupportedTokensCount() external view returns (uint256) {
        return supportedTokens.length;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Emergency function to recover stuck tokens
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(IERC20(token).transfer(owner(), amount), "Transfer failed");
    }
}