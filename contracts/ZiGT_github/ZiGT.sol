// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.6;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./Interfaces/IZiGGovernance.sol";
import "./lib/PriceUtils.sol";

contract ZiGT is Initializable, ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    // Core protocol addresses
    address public feeRouter;
    address public bandFeedRegistry;
    address public governance;
    address public treasury;
    address public liquidityPool;
    address public stakingContract;
    address public reserveManager;
    
    // Token configuration
    uint8 public selectedDirection; // 0: Famous8PlusZAR, 1: ZiGMirrorModel
    // bool private _notInitialized;
    bool public immutableFee;
    
    // Custom token addresses for different assets
    mapping(string => address) public assetTokens; // e.g., "GOLD" => token address
    mapping(address => bool) public authorizedMinters;
    mapping(address => bool) public authorizedBurners;

    // Struct for reserve ratios (metal, fiat, crypto) scaled by 1e18
    struct Ratio {
        uint256 metal;
        uint256 fiat;
        uint256 crypto;
    }

    // Struct for oracle configuration
    struct Oracle {
        address oracle;
        uint256 maxPriceAge;
        uint8 decimals;
        string name;
        bool isTrusted;
    }

    // Reserve Models
    mapping(string => Ratio) private reserveModels;
    // Cached prices and timestamps
    mapping(bytes32 => Oracle) public assetOracles;
    mapping(bytes32 => uint256) private cachedPrice;
    mapping(bytes32 => uint256) private cachedTimestamp;

    // Events
    event OracleUpdated(bytes32 indexed token, address indexed oracle);
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event Rebalance();
    event AssetTokenUpdated(string indexed asset, address indexed tokenAddress);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event LiquidityPoolUpdated(address indexed oldPool, address indexed newPool);
    event AuthorizedMinterUpdated(address indexed minter, bool authorized);
    event AuthorizedBurnerUpdated(address indexed burner, bool authorized);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract with governance, oracle, and reserve model settings.
     * @param _router Fee router address
     * @param _bandFeedRegistry Band oracle feed registry address
     * @param _governance Governance contract address
     * @param _treasury Treasury contract address
     * @param _direction Selected direction (0 or 1)
     * @param _ratio Initial reserve ratio
     */
    function initialize(
        address _router,
        address _bandFeedRegistry,
        address _governance,
        address _treasury,
        uint8 _direction,
        Ratio memory _ratio
    ) external initializer {
        // require(!_notInitialized, "Contract already initialized");
        require(_governance != address(0), "Invalid governance address");
        require(_bandFeedRegistry != address(0), "Invalid feed registry");
        require(_treasury != address(0), "Invalid treasury address");
        
        __ERC20_init("Mansa's Mbizo Yzuri Refu Tano", unicode"₥MYRT");
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        // Set core addresses
        feeRouter = _router;
        bandFeedRegistry = _bandFeedRegistry;
        governance = _governance;
        treasury = _treasury;
        selectedDirection = _direction;
        immutableFee = _router != address(0);
        // _notInitialized = true;

        // Initialize reserve models
        initializeReserveModels();
        
        // Set default authorized addresses
        authorizedMinters[msg.sender] = true;
        authorizedBurners[msg.sender] = true;
    }

    /**
     * @dev Initializes hardcoded reserve models.
     */
    function initializeReserveModels() internal {
        reserveModels["Stability-Oriented"] = Ratio(0.6e18, 0.3e18, 0.1e18);
        reserveModels["Digital Forward"] = Ratio(0.4e18, 0.3e18, 0.3e18);
        reserveModels["Geopolitical Hedge"] = Ratio(0.5e18, 0.2e18, 0.3e18);
        reserveModels["Afro-centric Trust"] = Ratio(0.55e18, 0.25e18, 0.2e18);
    }

    /**
     * @dev Mints tokens to a specified address. Restricted to authorized minters.
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        require(authorizedMinters[msg.sender] || 
                IZiGGovernance(governance).hasRole(msg.sender, governanceRole()), 
                "Not authorized to mint");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Burns tokens from a specified address. Restricted to authorized burners.
     * @param from Source address
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external {
        require(authorizedBurners[msg.sender] || 
                IZiGGovernance(governance).hasRole(msg.sender, governanceRole()), 
                "Not authorized to burn");
        _burn(from, amount);
        emit TokensBurned(from, amount);
    }

    // ============ ADDRESS MANAGEMENT FUNCTIONS ============

    /**
     * @dev Sets the treasury contract address. Restricted to owner.
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury address");
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    /**
     * @dev Sets the liquidity pool address. Restricted to owner.
     * @param _pool New liquidity pool address
     */
    function setLiquidityPool(address _pool) external onlyOwner {
        require(_pool != address(0), "Invalid pool address");
        address oldPool = liquidityPool;
        liquidityPool = _pool;
        emit LiquidityPoolUpdated(oldPool, _pool);
    }

    /**
     * @dev Sets the staking contract address. Restricted to owner.
     * @param _staking New staking contract address
     */
    function setStakingContract(address _staking) external onlyOwner {
        require(_staking != address(0), "Invalid staking address");
        stakingContract = _staking;
    }

    /**
     * @dev Sets the reserve manager address. Restricted to owner.
     * @param _reserveManager New reserve manager address
     */
    function setReserveManager(address _reserveManager) external onlyOwner {
        require(_reserveManager != address(0), "Invalid reserve manager address");
        reserveManager = _reserveManager;
    }

    /**
     * @dev Sets a custom token address for an asset. Restricted to owner.
     * @param asset Asset name (e.g., "GOLD", "USD", "BTC")
     * @param tokenAddress Token contract address for the asset
     */
    function setAssetToken(string memory asset, address tokenAddress) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        require(bytes(asset).length > 0, "Invalid asset name");
        assetTokens[asset] = tokenAddress;
        emit AssetTokenUpdated(asset, tokenAddress);
    }

    /**
     * @dev Authorizes or revokes minting permissions. Restricted to owner.
     * @param minter Address to authorize/revoke
     * @param authorized True to authorize, false to revoke
     */
    function setAuthorizedMinter(address minter, bool authorized) external onlyOwner {
        require(minter != address(0), "Invalid minter address");
        authorizedMinters[minter] = authorized;
        emit AuthorizedMinterUpdated(minter, authorized);
    }

    /**
     * @dev Authorizes or revokes burning permissions. Restricted to owner.
     * @param burner Address to authorize/revoke
     * @param authorized True to authorize, false to revoke
     */
    function setAuthorizedBurner(address burner, bool authorized) external onlyOwner {
        require(burner != address(0), "Invalid burner address");
        authorizedBurners[burner] = authorized;
        emit AuthorizedBurnerUpdated(burner, authorized);
    }

    /**
     * @dev Batch set multiple asset tokens. Restricted to owner.
     * @param assets Array of asset names
     * @param tokenAddresses Array of corresponding token addresses
     */
    function batchSetAssetTokens(
        string[] memory assets, 
        address[] memory tokenAddresses
    ) external onlyOwner {
        require(assets.length == tokenAddresses.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < assets.length; i++) {
            require(tokenAddresses[i] != address(0), "Invalid token address");
            require(bytes(assets[i]).length > 0, "Invalid asset name");
            assetTokens[assets[i]] = tokenAddresses[i];
            emit AssetTokenUpdated(assets[i], tokenAddresses[i]);
        }
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Gets the token address for a specific asset.
     * @param asset Asset name
     * @return Token contract address
     */
    function getAssetToken(string memory asset) external view returns (address) {
        return assetTokens[asset];
    }

    /**
     * @dev Checks if an address is authorized to mint.
     * @param minter Address to check
     * @return True if authorized
     */
    function isAuthorizedMinter(address minter) external view returns (bool) {
        return authorizedMinters[minter];
    }

    /**
     * @dev Checks if an address is authorized to burn.
     * @param burner Address to check
     * @return True if authorized
     */
    function isAuthorizedBurner(address burner) external view returns (bool) {
        return authorizedBurners[burner];
    }

    /**
     * @dev Rebalances the stablecoin based on a reserve model. Restricted to governance or owner.
     * @param reserveModel Name of the reserve model
     */
    function rebalance(string memory reserveModel) external onlyRoleOrOwner(governanceRole()) {
        Ratio memory ratio = reserveModels[reserveModel];
        require(ratio.metal + ratio.fiat + ratio.crypto == 1e18, "Invalid reserve model");
        // Simplified rebalance logic; extend as needed
        emit Rebalance();
    }

    /**
     * @dev Sets an oracle for a specific asset. Restricted to owner.
     * @param key Asset key (keccak256 hash)
     * @param _oracle Oracle configuration
     */
    function setOracle(bytes32 key, Oracle memory _oracle) external onlyOwner {
        require(_oracle.oracle != address(0), "Invalid oracle address");
        assetOracles[key] = _oracle;
        emit OracleUpdated(key, _oracle.oracle);
    }


function updateCachedPrices(bytes32[] memory keys) external onlyRoleOrOwner(governanceRole()) {
    for (uint256 i = 0; i < keys.length; i++) {
        (uint256 price, uint8 decimals) = getPrice(keys[i]);
        require(price > 0, "Invalid price");
        cachedPrice[keys[i]] = price;
        cachedTimestamp[keys[i]] = block.timestamp;
    }
}

function getPrice(bytes32 key) public view returns (uint256 price, uint8 decimals) {
    Oracle memory oracle = assetOracles[key];
    require(oracle.isTrusted, "Oracle not trusted");
    
    // Directly call _fetchPrice instead of using try/catch with this.
    (price, decimals) = _fetchPrice(oracle);
    
    require(price > 0, "Invalid price from oracle");
    return (price, decimals);
}

function _fetchPrice(Oracle memory oracle) internal view returns (uint256 price, uint8 decimals) {
    // Get price from Band Protocol feed
    (string memory base, string memory quote) = _splitSymbol(oracle.name);
    (uint256 rate,,) = IBandStdReference(oracle.oracle).getReferenceData(base, quote);
    
    // Normalize to 18 decimals
    uint256 normalizedPrice = rate * (10 ** (18 - oracle.decimals));
    return (normalizedPrice, 18);
}

function _splitSymbol(string memory symbol) internal pure returns (string memory base, string memory quote) {
    bytes memory symbolBytes = bytes(symbol);
    require(symbolBytes.length == 6, "Invalid symbol length");
    
    bytes memory baseBytes = new bytes(3);
    bytes memory quoteBytes = new bytes(3);
    
    for (uint i = 0; i < 3; i++) {
        baseBytes[i] = symbolBytes[i];
        quoteBytes[i] = symbolBytes[i+3];
    }
    
    return (string(baseBytes), string(quoteBytes));
}
    /**
     * @dev Calculates the value of an amount in USD based on a reserve model.
     * @param amount Amount of tokens
     * @param reserveModel Name of the reserve model
     * @return Value in USD
     */
    function getValueInUSD(uint256 amount, string memory reserveModel) public view returns (uint256) {
        Ratio memory ratio = reserveModels[reserveModel];
        require(ratio.metal + ratio.fiat + ratio.crypto == 1e18, "Invalid reserve model");

        // Simplified value calculation; assumes cached prices are sufficient
        uint256 totalValue = 0;
        bytes32 key = keccak256(abi.encodePacked("XAUUSD")); // Example: Gold price as base
        if (assetOracles[key].isTrusted) {
            (uint256 price, uint8 decimals) = getPrice(key);
            totalValue = PriceUtils.calculateValue(amount, price, decimals);
        }
        return totalValue;
    }

    /**
     * @dev Retrieves the reserve model details.
     * @param name Reserve model name
     * @return Ratio struct of the reserve model
     */
    function getReserveModel(string memory name) external view returns (Ratio memory) {
        return reserveModels[name];
    }

    /**
     * @dev Gets the governance role from the governance contract.
     * @return Governance role identifier
     */
    function governanceRole() public view returns (bytes32) {
        return IZiGGovernance(governance).governanceRole();
    }

    /**
     * @dev Modifier to restrict access to a specific governance role.
     * @param role Role to check
     */
    modifier onlyRole(bytes32 role) {
        require(IZiGGovernance(governance).hasRole(msg.sender, role), "Unauthorized");
        _;
    }

    /**
     * @dev Modifier to restrict access to a governance role or the owner.
     * @param role Role to check
     */
    modifier onlyRoleOrOwner(bytes32 role) {
        require(
            IZiGGovernance(governance).hasRole(msg.sender, role) || owner() == msg.sender,
            "Unauthorized"
        );
        _;
    }

    /**
     * @dev Authorizes contract upgrades. Restricted to owner.
     * @param newImplementation New contract implementation address
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}