// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// import "@gnosis.pm/safe-contracts@1.3.0/contracts/GnosisSafe.sol";
/**
 * @title ZiG Wallet
 * @dev Secure wallet that only accepts specific tokens
 */
contract ZiGWallet is /*GnosisSafe,*/ Ownable, ReentrancyGuard {
    
    mapping(address => bool) public allowedTokens;
    mapping(address => mapping(address => uint256)) public userBalances; // user => token => balance
    mapping(address => address[]) private userTokenList; // user => array of tokens they hold
    mapping(address => mapping(address => uint256)) private userTokenIndex; // user => token => index in userTokenList
    
    // Predefined token addresses (would be set during deployment or via governance)
    struct TokenInfo {
        address tokenAddress;
        string symbol;
        string name;
    }
    
    // Standard supported tokens
    TokenInfo[] public supportedTokens;
    
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event Deposit(address indexed user, address indexed token, uint256 amount);
    event Withdrawal(address indexed user, address indexed token, uint256 amount);
    
    constructor(address initialOwner) Ownable(initialOwner) {
        // Initialize with common supported tokens (addresses would be set on deployment)
        _initializeSupportedTokens();
    }
    
    function _initializeSupportedTokens() private {
        // Core crypto tokens
        supportedTokens.push(TokenInfo(address(0), "ZiG", "Zimbabwe Gold"));
        supportedTokens.push(TokenInfo(address(0), "ZiGT", "Zimbabwe Gold Token"));
        supportedTokens.push(TokenInfo(address(0), "WBTC", "Wrapped Bitcoin"));
        supportedTokens.push(TokenInfo(address(0), "WETH", "Wrapped Ethereum"));
        supportedTokens.push(TokenInfo(address(0), "WBCH", "Wrapped Bitcoin Cash"));
        supportedTokens.push(TokenInfo(address(0), "USDT", "Tether USD"));
        supportedTokens.push(TokenInfo(address(0), "WLTC", "Wrapped Litecoin"));
        supportedTokens.push(TokenInfo(address(0), "WZEC", "Wrapped Zcash"));
        supportedTokens.push(TokenInfo(address(0), "WXRP", "Wrapped XRP"));
        
        // Major world currencies (tokenized)
        supportedTokens.push(TokenInfo(address(0), "USD", "US Dollar"));
        supportedTokens.push(TokenInfo(address(0), "EUR", "Euro"));
        supportedTokens.push(TokenInfo(address(0), "GBP", "British Pound"));
        supportedTokens.push(TokenInfo(address(0), "JPY", "Japanese Yen"));
        supportedTokens.push(TokenInfo(address(0), "CHF", "Swiss Franc"));
        supportedTokens.push(TokenInfo(address(0), "CAD", "Canadian Dollar"));
        supportedTokens.push(TokenInfo(address(0), "AUD", "Australian Dollar"));
        supportedTokens.push(TokenInfo(address(0), "CNY", "Chinese Yuan"));
        
        // African currencies by region
        // West Africa
        supportedTokens.push(TokenInfo(address(0), "NGN", "Nigerian Naira"));
        supportedTokens.push(TokenInfo(address(0), "GHS", "Ghanaian Cedi"));
        supportedTokens.push(TokenInfo(address(0), "XOF", "West African CFA Franc"));
        supportedTokens.push(TokenInfo(address(0), "SLL", "Sierra Leonean Leone"));
        supportedTokens.push(TokenInfo(address(0), "LRD", "Liberian Dollar"));
        
        // East Africa
        supportedTokens.push(TokenInfo(address(0), "KES", "Kenyan Shilling"));
        supportedTokens.push(TokenInfo(address(0), "UGX", "Ugandan Shilling"));
        supportedTokens.push(TokenInfo(address(0), "TZS", "Tanzanian Shilling"));
        supportedTokens.push(TokenInfo(address(0), "ETB", "Ethiopian Birr"));
        supportedTokens.push(TokenInfo(address(0), "RWF", "Rwandan Franc"));
        
        // North Africa
        supportedTokens.push(TokenInfo(address(0), "EGP", "Egyptian Pound"));
        supportedTokens.push(TokenInfo(address(0), "MAD", "Moroccan Dirham"));
        supportedTokens.push(TokenInfo(address(0), "TND", "Tunisian Dinar"));
        supportedTokens.push(TokenInfo(address(0), "DZD", "Algerian Dinar"));
        supportedTokens.push(TokenInfo(address(0), "LYD", "Libyan Dinar"));
        
        // Central Africa
        supportedTokens.push(TokenInfo(address(0), "XAF", "Central African CFA Franc"));
        supportedTokens.push(TokenInfo(address(0), "CDF", "Congolese Franc"));
        supportedTokens.push(TokenInfo(address(0), "AOA", "Angolan Kwanza"));
        supportedTokens.push(TokenInfo(address(0), "CMR", "Cameroonian Franc"));
        supportedTokens.push(TokenInfo(address(0), "GAB", "Gabonese Franc"));
        
        // Southern Africa
        supportedTokens.push(TokenInfo(address(0), "ZAR", "South African Rand"));
        supportedTokens.push(TokenInfo(address(0), "BWP", "Botswanan Pula"));
        supportedTokens.push(TokenInfo(address(0), "NAD", "Namibian Dollar"));
        supportedTokens.push(TokenInfo(address(0), "SZL", "Swazi Lilangeni"));
        supportedTokens.push(TokenInfo(address(0), "LSL", "Lesotho Loti"));
        
        // Island Nations
        supportedTokens.push(TokenInfo(address(0), "MUR", "Mauritian Rupee"));
        supportedTokens.push(TokenInfo(address(0), "SCR", "Seychellois Rupee"));
        supportedTokens.push(TokenInfo(address(0), "CVE", "Cape Verdean Escudo"));
        supportedTokens.push(TokenInfo(address(0), "KMF", "Comorian Franc"));
        supportedTokens.push(TokenInfo(address(0), "STN", unicode"São Tomé and Príncipe Dobra"));
        
        // Precious metals (tokenized)
        supportedTokens.push(TokenInfo(address(0), "XAU", "Gold"));
        supportedTokens.push(TokenInfo(address(0), "XAG", "Silver"));
        supportedTokens.push(TokenInfo(address(0), "XPT", "Platinum"));
        supportedTokens.push(TokenInfo(address(0), "XPD", "Palladium"));
        supportedTokens.push(TokenInfo(address(0), "RHODIUM", "Rhodium"));
        supportedTokens.push(TokenInfo(address(0), "IRIDIUM", "Iridium"));
    }
    
    function addAllowedToken(address _token) external onlyOwner {
        require(_token != address(0), "ZiGWallet: Invalid token address");
        allowedTokens[_token] = true;
        emit TokenAdded(_token);
    }
    
    function removeAllowedToken(address _token) external onlyOwner {
        allowedTokens[_token] = false;
        emit TokenRemoved(_token);
    }
    
    function deposit(address _token, uint256 _amount) external nonReentrant {
        require(allowedTokens[_token], "ZiGWallet: Token not allowed");
        require(_amount > 0, "ZiGWallet: Amount must be greater than 0");
        
        IERC20 token = IERC20(_token);
        require(token.transferFrom(msg.sender, address(this), _amount), "ZiGWallet: Transfer failed");
        
        // If this is the first deposit of this token for this user, add to their token list
        if (userBalances[msg.sender][_token] == 0) {
            userTokenList[msg.sender].push(_token);
            userTokenIndex[msg.sender][_token] = userTokenList[msg.sender].length - 1;
        }
        
        userBalances[msg.sender][_token] += _amount;
        emit Deposit(msg.sender, _token, _amount);
    }
    
    function withdraw(address _token, uint256 _amount) external nonReentrant {
        require(_amount > 0, "ZiGWallet: Amount must be greater than 0");
        require(userBalances[msg.sender][_token] >= _amount, "ZiGWallet: Insufficient balance");
        
        userBalances[msg.sender][_token] -= _amount;
        
        // If balance becomes zero, remove token from user's list
        if (userBalances[msg.sender][_token] == 0) {
            _removeTokenFromUserList(msg.sender, _token);
        }
        
        IERC20 token = IERC20(_token);
        require(token.transfer(msg.sender, _amount), "ZiGWallet: Transfer failed");
        
        emit Withdrawal(msg.sender, _token, _amount);
    }
    
    function _removeTokenFromUserList(address _user, address _token) private {
        uint256 index = userTokenIndex[_user][_token];
        uint256 lastIndex = userTokenList[_user].length - 1;
        
        if (index != lastIndex) {
            address lastToken = userTokenList[_user][lastIndex];
            userTokenList[_user][index] = lastToken;
            userTokenIndex[_user][lastToken] = index;
        }
        
        userTokenList[_user].pop();
        delete userTokenIndex[_user][_token];
    }
    
    function getBalance(address _user, address _token) external view returns (uint256) {
        return userBalances[_user][_token];
    }
    
    function getUserTokens(address _user) external view returns (address[] memory tokens, uint256[] memory balances) {
        address[] memory userTokens = userTokenList[_user];
        uint256[] memory userBalancesList = new uint256[](userTokens.length);
        
        for (uint256 i = 0; i < userTokens.length; i++) {
            userBalancesList[i] = userBalances[_user][userTokens[i]];
        }
        
        return (userTokens, userBalancesList);
    }
    
    function getUserTokenCount(address _user) external view returns (uint256) {
        return userTokenList[_user].length;
    }
    
    function getSupportedTokens() external view returns (TokenInfo[] memory) {
        return supportedTokens;
    }
    
    function getSupportedTokenCount() external view returns (uint256) {
        return supportedTokens.length;
    }
    
    function updateTokenAddress(uint256 _index, address _newAddress) external onlyOwner {
        require(_index < supportedTokens.length, "ZiGWallet: Invalid token index");
        supportedTokens[_index].tokenAddress = _newAddress;
    }
    
    function addNewSupportedToken(address _tokenAddress, string memory _symbol, string memory _name) external onlyOwner {
        supportedTokens.push(TokenInfo(_tokenAddress, _symbol, _name));
    }
}