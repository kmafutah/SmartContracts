// contracts/pmms/strategies/StrategyLiquityLiquidation.sol
pragma solidity ^0.8.20;

import {IStrategy} from "../interfaces/IStrategy.sol";
import {IRegistry} from "../interfaces/IRegistry.sol";
import {ILiquityTroveManager} from "../interfaces/ILiquityTroveManager.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract StrategyLiquityLiquidation is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    IRegistry public registry;

    event ArbitrageExecuted(address indexed asset, uint256 amount, uint256 profit, uint256 timestamp);

    function initialize(address _registry) external initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        registry = IRegistry(_registry);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function name() external pure override returns (string memory) {
        return "LiquityLiquidation";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        address troveManager = registry.getAddress("LIQUITY_TROVE_MANAGER");
        // Placeholder: Assume off-chain bot identifies undercollateralized trove
        address borrower = address(0); // Replace with real borrower address in production
        uint256 debt = ILiquityTroveManager(troveManager).getTroveDebt(borrower);
        uint256 coll = ILiquityTroveManager(troveManager).getTroveColl(borrower);
        // Liquity V2: Liquidation if collateral ratio < 110%
        if (coll * 110 / 100 < debt && debt > 0) {
            profit = coll - debt; // Simplified profit estimate (ETH - LUSD debt)
            executionData = abi.encode(borrower);
        }
        return (profit, executionData);
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool success, bytes memory result, uint256)
    {
        address borrower = abi.decode(executionData, (address));
        address troveManager = registry.getAddress("LIQUITY_TROVE_MANAGER");
        address lusd = registry.getAddress("LUSD");
        IERC20(lusd).approve(troveManager, amount);
        ILiquityTroveManager(troveManager).liquidate(borrower);
        address weth = registry.getAddress("WETH");
        uint256 profit = IERC20(weth).balanceOf(address(this)) - amount - premium;
        if (profit > 0) {
            emit ArbitrageExecuted(lusd, amount, profit, block.timestamp); // Fix: Use lusd instead of asset
            return (true, abi.encode(profit), profit);
        }
        return (false, abi.encode("No profit"), 0);
    }
}