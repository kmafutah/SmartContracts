// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/IRegistry.sol";

interface IAaveLendingPool {
    function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external;
    function repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf) external returns (uint256);
    function getUserAccountData(address user)
        external
        view
        returns (
            uint256 totalCollateralETH,
            uint256 totalDebtETH,
            uint256 availableBorrowsETH,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        );
}

contract StrategyYieldLoop is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    IRegistry public registry;
    address public usdc;
    address public dai;
    uint256 public constant MAX_LTV = 8000; // 80% LTV (basis points)
    uint256 public constant MIN_HEALTH_FACTOR = 1.1 ether; // 1.1 in 18 decimals
    uint256 public constant LOOP_COUNT = 2; // Number of leverage loops

    event YieldLoopExecuted(
        address indexed depositAsset,
        address indexed borrowAsset,
        uint256 amountIn,
        uint256 profit,
        uint256 timestamp
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _registry) external initializer {        
        require(_registry != address(0), "Invalid registry address");
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        registry = IRegistry(_registry);
        usdc = registry.getAddress("USDC");
        dai = registry.getAddress("DAI");
        require(usdc != address(0), "USDC address not set");
        require(dai != address(0), "DAI address not set");
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function name() external pure override returns (string memory) {
        return "YieldLoop";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        if (amount == 0 || (asset != usdc && asset != dai)) {
            return (0, "");
        }

        address lendingPoolAddress = registry.getAddress("AAVE_LENDING_POOL");
        if (lendingPoolAddress == address(0)) {
            return (0, "");
        }

        // Mock APY calculation (simplified for SKALE testing)
        // Assume supply APY = 5%, borrow APY = 3%, net yield = 2% per loop
        uint256 netYieldBps = 200; // 2% in basis points
        uint256 totalProfit = (amount * netYieldBps * LOOP_COUNT) / 10000;

        if (totalProfit > 0) {
            // Borrow the same asset for simplicity in mock environment
            executionData = abi.encode(asset, asset, totalProfit);
            return (totalProfit, executionData);
        }
        return (0, "");
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool success, bytes memory result, uint256 finalProfit)
    {
        (address depositAsset, address borrowAsset, uint256 expectedProfit) = abi.decode(
            executionData,
            (address, address, uint256)
        );
        require(depositAsset == usdc || depositAsset == dai, "Invalid deposit asset");
        require(borrowAsset == usdc || borrowAsset == dai, "Invalid borrow asset");

        address lendingPoolAddress = registry.getAddress("AAVE_LENDING_POOL");
        require(lendingPoolAddress != address(0), "Aave Lending Pool not set");
        IAaveLendingPool lendingPool = IAaveLendingPool(lendingPoolAddress);

        IERC20 depositToken = IERC20(depositAsset);
        require(depositToken.balanceOf(address(this)) >= amount, "Insufficient deposit balance");

        uint256 currentDeposit = amount;
        uint256 totalBorrowed = 0;

        // Perform leverage loops
        for (uint256 i = 0; i < LOOP_COUNT; i++) {
            // Deposit
            depositToken.approve(lendingPoolAddress, currentDeposit);
            try lendingPool.deposit(depositAsset, currentDeposit, address(this), 0) {
                // Success
            } catch {
                depositToken.approve(lendingPoolAddress, 0);
                revert("Deposit failed");
            }
            depositToken.approve(lendingPoolAddress, 0);

            // Check health factor and borrowing capacity
            (, ,uint256 availableBorrowsETH, , uint256 ltv, uint256 healthFactor) = lendingPool.getUserAccountData(
                address(this)
            );
            require(healthFactor >= MIN_HEALTH_FACTOR, "Health factor too low");
            require(ltv <= MAX_LTV, "LTV too high");

            // Calculate borrow amount (80% of deposited value for safety)
            uint256 borrowAmount = (currentDeposit * MAX_LTV) / 10000;
            if (borrowAmount == 0) break;

            // Borrow
            IERC20 borrowToken = IERC20(borrowAsset);
            try lendingPool.borrow(borrowAsset, borrowAmount, 2, 0, address(this)) {
                totalBorrowed += borrowAmount;
            } catch {
                revert("Borrow failed");
            }

            // Prepare for next loop
            currentDeposit = borrowAmount;
            require(borrowToken.balanceOf(address(this)) >= borrowAmount, "Insufficient borrow balance");
        }

        // Mock profit calculation (simplified for SKALE)
        finalProfit = totalBorrowed > premium ? totalBorrowed - premium : 0;
        require(finalProfit >= expectedProfit, "Profit below expected");

        // Ensure funds are available for flashloan repayment
        require(depositToken.balanceOf(address(this)) >= amount + premium, "Insufficient funds for repayment");

        emit YieldLoopExecuted(depositAsset, borrowAsset, amount, finalProfit, block.timestamp);

        return (true, abi.encode(amount + finalProfit, finalProfit), finalProfit);
    }

    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}