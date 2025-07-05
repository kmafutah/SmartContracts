// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IZiGUtilityToken {
    function burn(address _from, uint256 _id, uint256 _amount) external;
    function balanceOf(address _owner, uint256 _id) external view returns (uint256);
}

interface IZiGOracleHub {
    function getPrice(string memory asset) external view returns (uint256);
    function calculateZiGPrice() external view returns (uint256);
}

/**
 * @title Regional Stablecoins for African Regions
 * @dev 6 regional stablecoins with different crypto+metal+fiat compositions
 * @dev Uses ZiGUtilityToken as fuel for transfers and remittances
 */
contract RegionalStablecoins is Ownable, ReentrancyGuard, Pausable {
    
    struct RegionalStablecoin {
        string name;
        string symbol;
        uint256 totalSupply;
        mapping(address => uint256) balances;
        mapping(address => mapping(address => uint256)) allowances;
        bool isActive;
        uint256 cryptoWeight;
        uint256 metalWeight;
        uint256 fiatWeight;
        string[] cryptoAssets;
        string[] metalAssets;
        string[] fiatAssets;
        uint256[] cryptoWeights;
        uint256[] metalWeights;
        uint256[] fiatWeights;
    }
    
    // Regional stablecoins mapping
    mapping(uint256 => RegionalStablecoin) public regionalStablecoins;
    
    // Region IDs
    uint256 public constant NORTH_AFRICA = 1;    // Egypt, Morocco, Algeria, Tunisia, Libya
    uint256 public constant WEST_AFRICA = 2;     // Nigeria, Ghana, Senegal, Ivory Coast, Mali
    uint256 public constant CENTRAL_AFRICA = 3;  // Cameroon, Chad, CAR, Congo, Gabon
    uint256 public constant EAST_AFRICA = 4;     // Kenya, Tanzania, Uganda, Ethiopia, Rwanda
    uint256 public constant SOUTHERN_AFRICA = 5; // South Africa, Zimbabwe, Zambia, Botswana, Namibia
    uint256 public constant HORN_AFRICA = 6;     // Somalia, Djibouti, Eritrea, Sudan, South Sudan
    
    // Fuel costs
    uint256 public constant TRANSFER_FUEL_COST = 5;      // 5 utility tokens per transfer
    uint256 public constant REMITTANCE_FUEL_COST = 10;   // 10 utility tokens per remittance
    uint256 public constant MINT_FUEL_COST = 20;         // 20 utility tokens per mint
    uint256 public constant BURN_FUEL_COST = 15;         // 15 utility tokens per burn
    
    address public utilityToken;
    address public oracleHub;
    address public dao;
    
    uint256 public totalRegions = 6;
    
    event RegionalStablecoinCreated(uint256 indexed regionId, string name, string symbol);
    event Transfer(uint256 indexed regionId, address indexed from, address indexed to, uint256 amount, uint256 fuelCost);
    event Remittance(uint256 indexed regionId, address indexed from, address indexed to, uint256 amount, string recipientName, uint256 fuelCost);
    event Mint(uint256 indexed regionId, address indexed to, uint256 amount, uint256 fuelCost);
    event Burn(uint256 indexed regionId, address indexed from, uint256 amount, uint256 fuelCost);
    event FuelBurned(address indexed user, uint256 tokenId, uint256 amount, string action);
    
    modifier onlyDao() {
        require(msg.sender == dao, "RegionalStablecoins: Only DAO can call this function");
        _;
    }
    
    modifier onlyActiveRegion(uint256 regionId) {
        require(regionId > 0 && regionId <= totalRegions, "Invalid region ID");
        require(regionalStablecoins[regionId].isActive, "Region not active");
        _;
    }
    
    constructor(
        address _utilityToken,
        address _oracleHub,
        address _dao
    ) Ownable(msg.sender) {
        utilityToken = _utilityToken;
        oracleHub = _oracleHub;
        dao = _dao;
        
        _initializeRegionalStablecoins();
    }
    
    function _initializeRegionalStablecoins() internal {
        // North Africa - Higher crypto, moderate metal, low fiat
        string[] memory northCrypto = new string[](3);
        northCrypto[0] = "BTCUSD";
        northCrypto[1] = "ETHUSD";
        northCrypto[2] = "BNBUSD";
        
        string[] memory northMetal = new string[](2);
        northMetal[0] = "XAUUSD";
        northMetal[1] = "XAGUSD";
        
        string[] memory northFiat = new string[](2);
        northFiat[0] = "EURUSD";
        northFiat[1] = "GBPUSD";
        
        _createRegionalStablecoin(
            NORTH_AFRICA,
            "North African Stablecoin",
            "NAS",
            50, 30, 20, // 50% crypto, 30% metal, 20% fiat
            northCrypto,
            northMetal,
            northFiat
        );
        
        // West Africa - Balanced composition
        string[] memory westCrypto = new string[](3);
        westCrypto[0] = "BTCUSD";
        westCrypto[1] = "ETHUSD";
        westCrypto[2] = "XRPUSD";
        
        string[] memory westMetal = new string[](3);
        westMetal[0] = "XAUUSD";
        westMetal[1] = "XPTUSD";
        westMetal[2] = "XAGUSD";
        
        string[] memory westFiat = new string[](3);
        westFiat[0] = "EURUSD";
        westFiat[1] = "GBPUSD";
        westFiat[2] = "USDZAR";
        
        _createRegionalStablecoin(
            WEST_AFRICA,
            "West African Stablecoin", 
            "WAS",
            40, 35, 25, // 40% crypto, 35% metal, 25% fiat
            westCrypto,
            westMetal,
            westFiat
        );
        
        // Central Africa - Higher metal, moderate crypto, low fiat
        string[] memory centralCrypto = new string[](2);
        centralCrypto[0] = "BTCUSD";
        centralCrypto[1] = "ETHUSD";
        
        string[] memory centralMetal = new string[](4);
        centralMetal[0] = "XAUUSD";
        centralMetal[1] = "XPTUSD";
        centralMetal[2] = "XPDUSD";
        centralMetal[3] = "XAGUSD";
        
        string[] memory centralFiat = new string[](2);
        centralFiat[0] = "EURUSD";
        centralFiat[1] = "USDZAR";
        
        _createRegionalStablecoin(
            CENTRAL_AFRICA,
            "Central African Stablecoin",
            "CAS", 
            35, 45, 20, // 35% crypto, 45% metal, 20% fiat
            centralCrypto,
            centralMetal,
            centralFiat
        );
        
        // East Africa - Higher crypto, balanced metal/fiat
        string[] memory eastCrypto = new string[](4);
        eastCrypto[0] = "BTCUSD";
        eastCrypto[1] = "ETHUSD";
        eastCrypto[2] = "SOLUSD";
        eastCrypto[3] = "ADAUSD";
        
        string[] memory eastMetal = new string[](2);
        eastMetal[0] = "XAUUSD";
        eastMetal[1] = "XAGUSD";
        
        string[] memory eastFiat = new string[](4);
        eastFiat[0] = "EURUSD";
        eastFiat[1] = "GBPUSD";
        eastFiat[2] = "USDZAR";
        eastFiat[3] = "USDJPY";
        
        _createRegionalStablecoin(
            EAST_AFRICA,
            "East African Stablecoin",
            "EAS",
            45, 30, 25, // 45% crypto, 30% metal, 25% fiat
            eastCrypto,
            eastMetal,
            eastFiat
        );
        
        // Southern Africa - Higher fiat, balanced crypto/metal
        string[] memory southCrypto = new string[](3);
        southCrypto[0] = "BTCUSD";
        southCrypto[1] = "ETHUSD";
        southCrypto[2] = "BNBUSD";
        
        string[] memory southMetal = new string[](3);
        southMetal[0] = "XAUUSD";
        southMetal[1] = "XPTUSD";
        southMetal[2] = "XAGUSD";
        
        string[] memory southFiat = new string[](5);
        southFiat[0] = "EURUSD";
        southFiat[1] = "GBPUSD";
        southFiat[2] = "USDZAR";
        southFiat[3] = "USDCHF";
        southFiat[4] = "USDCNH";
        
        _createRegionalStablecoin(
            SOUTHERN_AFRICA,
            "Southern African Stablecoin",
            "SAS",
            35, 30, 35, // 35% crypto, 30% metal, 35% fiat
            southCrypto,
            southMetal,
            southFiat
        );
        
        // Horn of Africa - Higher crypto, low metal, moderate fiat
        string[] memory hornCrypto = new string[](4);
        hornCrypto[0] = "BTCUSD";
        hornCrypto[1] = "ETHUSD";
        hornCrypto[2] = "SOLUSD";
        hornCrypto[3] = "XRPUSD";
        
        string[] memory hornMetal = new string[](2);
        hornMetal[0] = "XAUUSD";
        hornMetal[1] = "XAGUSD";
        
        string[] memory hornFiat = new string[](4);
        hornFiat[0] = "EURUSD";
        hornFiat[1] = "USDZAR";
        hornFiat[2] = "USDJPY";
        hornFiat[3] = "USDCHF";
        
        _createRegionalStablecoin(
            HORN_AFRICA,
            "Horn African Stablecoin",
            "HAS",
            50, 20, 30, // 50% crypto, 20% metal, 30% fiat
            hornCrypto,
            hornMetal,
            hornFiat
        );
    }
    
    function _createRegionalStablecoin(
        uint256 regionId,
        string memory name,
        string memory symbol,
        uint256 cryptoWeight,
        uint256 metalWeight,
        uint256 fiatWeight,
        string[] memory cryptoAssets,
        string[] memory metalAssets,
        string[] memory fiatAssets
    ) internal {
        RegionalStablecoin storage stablecoin = regionalStablecoins[regionId];
        stablecoin.name = name;
        stablecoin.symbol = symbol;
        stablecoin.isActive = true;
        stablecoin.cryptoWeight = cryptoWeight;
        stablecoin.metalWeight = metalWeight;
        stablecoin.fiatWeight = fiatWeight;
        
        // Set crypto assets and weights
        stablecoin.cryptoAssets = cryptoAssets;
        stablecoin.cryptoWeights = new uint256[](cryptoAssets.length);
        uint256 totalCryptoWeight = 0;
        for (uint256 i = 0; i < cryptoAssets.length; i++) {
            stablecoin.cryptoWeights[i] = 10000 / cryptoAssets.length; // Equal distribution
            totalCryptoWeight += stablecoin.cryptoWeights[i];
        }
        
        // Set metal assets and weights
        stablecoin.metalAssets = metalAssets;
        stablecoin.metalWeights = new uint256[](metalAssets.length);
        uint256 totalMetalWeight = 0;
        for (uint256 i = 0; i < metalAssets.length; i++) {
            stablecoin.metalWeights[i] = 10000 / metalAssets.length; // Equal distribution
            totalMetalWeight += stablecoin.metalWeights[i];
        }
        
        // Set fiat assets and weights
        stablecoin.fiatAssets = fiatAssets;
        stablecoin.fiatWeights = new uint256[](fiatAssets.length);
        uint256 totalFiatWeight = 0;
        for (uint256 i = 0; i < fiatAssets.length; i++) {
            stablecoin.fiatWeights[i] = 10000 / fiatAssets.length; // Equal distribution
            totalFiatWeight += stablecoin.fiatWeights[i];
        }
        
        emit RegionalStablecoinCreated(regionId, name, symbol);
    }
    
    /**
     * @dev Transfer regional stablecoins with fuel cost
     */
    function transfer(
        uint256 regionId,
        address to,
        uint256 amount
    ) external onlyActiveRegion(regionId) nonReentrant whenNotPaused {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be positive");
        require(regionalStablecoins[regionId].balances[msg.sender] >= amount, "Insufficient balance");
        
        // Burn fuel tokens
        _burnFuel(msg.sender, 1, TRANSFER_FUEL_COST, "transfer");
        
        regionalStablecoins[regionId].balances[msg.sender] -= amount;
        regionalStablecoins[regionId].balances[to] += amount;
        
        emit Transfer(regionId, msg.sender, to, amount, TRANSFER_FUEL_COST);
    }
    
    /**
     * @dev Remittance transfer with recipient name and higher fuel cost
     */
    function remittance(
        uint256 regionId,
        address to,
        uint256 amount,
        string memory recipientName
    ) external onlyActiveRegion(regionId) nonReentrant whenNotPaused {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be positive");
        require(bytes(recipientName).length > 0, "Recipient name required");
        require(regionalStablecoins[regionId].balances[msg.sender] >= amount, "Insufficient balance");
        
        // Burn fuel tokens for remittance
        _burnFuel(msg.sender, 1, REMITTANCE_FUEL_COST, "remittance");
        
        regionalStablecoins[regionId].balances[msg.sender] -= amount;
        regionalStablecoins[regionId].balances[to] += amount;
        
        emit Remittance(regionId, msg.sender, to, amount, recipientName, REMITTANCE_FUEL_COST);
    }
    
    /**
     * @dev Mint regional stablecoins with fuel cost
     */
    function mint(
        uint256 regionId,
        address to,
        uint256 amount
    ) external onlyActiveRegion(regionId) nonReentrant whenNotPaused {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be positive");
        
        // Burn fuel tokens for minting
        _burnFuel(msg.sender, 1, MINT_FUEL_COST, "mint");
        
        regionalStablecoins[regionId].balances[to] += amount;
        regionalStablecoins[regionId].totalSupply += amount;
        
        emit Mint(regionId, to, amount, MINT_FUEL_COST);
    }
    
    /**
     * @dev Burn regional stablecoins with fuel cost
     */
    function burn(
        uint256 regionId,
        uint256 amount
    ) external onlyActiveRegion(regionId) nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be positive");
        require(regionalStablecoins[regionId].balances[msg.sender] >= amount, "Insufficient balance");
        
        // Burn fuel tokens for burning
        _burnFuel(msg.sender, 1, BURN_FUEL_COST, "burn");
        
        regionalStablecoins[regionId].balances[msg.sender] -= amount;
        regionalStablecoins[regionId].totalSupply -= amount;
        
        emit Burn(regionId, msg.sender, amount, BURN_FUEL_COST);
    }
    
    /**
     * @dev Calculate regional stablecoin price based on asset composition
     */
    function calculateRegionalPrice(uint256 regionId) public view returns (uint256) {
        require(regionId > 0 && regionId <= totalRegions, "Invalid region ID");
        
        RegionalStablecoin storage stablecoin = regionalStablecoins[regionId];
        IZiGOracleHub oracle = IZiGOracleHub(oracleHub);
        
        uint256 cryptoComponent = 0;
        uint256 metalComponent = 0;
        uint256 fiatComponent = 0;
        
        // Calculate crypto component
        for (uint256 i = 0; i < stablecoin.cryptoAssets.length; i++) {
            uint256 price = oracle.getPrice(stablecoin.cryptoAssets[i]);
            cryptoComponent += (price * stablecoin.cryptoWeights[i]) / 10000;
        }
        
        // Calculate metal component
        for (uint256 i = 0; i < stablecoin.metalAssets.length; i++) {
            uint256 price = oracle.getPrice(stablecoin.metalAssets[i]);
            metalComponent += (price * stablecoin.metalWeights[i]) / 10000;
        }
        
        // Calculate fiat component
        for (uint256 i = 0; i < stablecoin.fiatAssets.length; i++) {
            uint256 price = oracle.getPrice(stablecoin.fiatAssets[i]);
            fiatComponent += (price * stablecoin.fiatWeights[i]) / 10000;
        }
        
        // Weight the components
        uint256 totalPrice = (
            (cryptoComponent * stablecoin.cryptoWeight) +
            (metalComponent * stablecoin.metalWeight) +
            (fiatComponent * stablecoin.fiatWeight)
        ) / 100;
        
        return totalPrice;
    }
    
    /**
     * @dev Internal function to burn fuel tokens
     */
    function _burnFuel(address _user, uint256 _tokenId, uint256 _amount, string memory _action) internal {
        require(
            IZiGUtilityToken(utilityToken).balanceOf(_user, _tokenId) >= _amount,
            "Insufficient fuel tokens"
        );
        
        IZiGUtilityToken(utilityToken).burn(_user, _tokenId, _amount);
        emit FuelBurned(_user, _tokenId, _amount, _action);
    }
    
    // Getter functions
    function getRegionalStablecoin(uint256 regionId) external view returns (
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        bool isActive,
        uint256 cryptoWeight,
        uint256 metalWeight,
        uint256 fiatWeight
    ) {
        RegionalStablecoin storage stablecoin = regionalStablecoins[regionId];
        return (
            stablecoin.name,
            stablecoin.symbol,
            stablecoin.totalSupply,
            stablecoin.isActive,
            stablecoin.cryptoWeight,
            stablecoin.metalWeight,
            stablecoin.fiatWeight
        );
    }
    
    function getBalance(uint256 regionId, address user) external view returns (uint256) {
        return regionalStablecoins[regionId].balances[user];
    }
    
    function getFuelCosts() external pure returns (
        uint256 transferCost,
        uint256 remittanceCost,
        uint256 mintCost,
        uint256 burnCost
    ) {
        return (TRANSFER_FUEL_COST, REMITTANCE_FUEL_COST, MINT_FUEL_COST, BURN_FUEL_COST);
    }
    
    // Admin functions
    function setDaoAddress(address _dao) external onlyOwner {
        dao = _dao;
    }
    
    function setFuelCosts(
        uint256 _transferCost,
        uint256 _remittanceCost,
        uint256 _mintCost,
        uint256 _burnCost
    ) external onlyDao {
        // Note: These would need to be made state variables instead of constants
        // For now, this is a placeholder for DAO-controlled fuel costs
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
} 