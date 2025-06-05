// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IRegistry.sol";
import "../interfaces/IStrategy.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

interface ISkaleNftLending {
    function liquidate(address nftContract, uint256 tokenId, uint256 amount) external;
}

contract StrategyNFTCollateralLiquidation is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, IERC721Receiver {
    using SafeERC20 for IERC20;

    address public registry;

    event NFTLiquidationExecuted(address indexed nftContract, uint256 indexed tokenId, uint256 profit, uint256 timestamp);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); // Prevent initialization during deployment
    }

    function initialize(address _registry) external initializer {
        require(_registry != address(0), "Invalid registry");       
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        registry = _registry;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function name() external pure override returns (string memory) {
        return "NFTCollateralLiquidation";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        address usdc = IRegistry(registry).getAddress("USDC");
        if (asset != usdc || amount == 0) return (0, "");

        address skaleLending = IRegistry(registry).getAddress("SKALE_NFT_LENDING");
        address nftContract = IRegistry(registry).getAddress("NFT_CONTRACT");
        if (skaleLending == address(0) || nftContract == address(0)) return (0, "");

        uint256 tokenId = 1; // Off-chain monitoring for liquidatable tokenId
        uint256 debt = amount; // Debt in USDC
        uint256 nftValue;
        try IRegistry(registry).getNftFloorPrice(nftContract) returns (uint256 value) {
            nftValue = value;
        } catch {
            return (0, "");
        }

        if (nftValue > debt && tokenId != 0) {
            profit = nftValue - debt;
            executionData = abi.encode(nftContract, tokenId, debt);
        }
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool success, bytes memory result, uint256 profit)
    {
        (address nftContract, uint256 tokenId, uint256 debt) = abi.decode(executionData, (address, uint256, uint256));
        require(nftContract != address(0) && debt == amount && tokenId != 0, "Invalid NFT contract, debt, or tokenId");
        address skaleLending = IRegistry(registry).getAddress("SKALE_NFT_LENDING");
        address usdc = IRegistry(registry).getAddress("USDC");
        require(skaleLending != address(0) && usdc != address(0), "Invalid lending or USDC address");

        require(IERC20(usdc).balanceOf(address(this)) >= debt, "Insufficient USDC balance");

        IERC20(usdc).approve(skaleLending, debt);
        try ISkaleNftLending(skaleLending).liquidate(nftContract, tokenId, debt) {
            // Liquidation successful
        } catch {
            revert("Liquidation failed");
        }
        IERC20(usdc).approve(skaleLending, 0);

        require(IERC721(nftContract).ownerOf(tokenId) == address(this), "NFT not received");

        uint256 nftValue;
        try IRegistry(registry).getNftFloorPrice(nftContract) returns (uint256 value) {
            nftValue = value;
        } catch {
            revert("Failed to fetch NFT floor price");
        }
        require(nftValue > debt + premium, "Insufficient profit");
        profit = nftValue - debt - premium;

        emit NFTLiquidationExecuted(nftContract, tokenId, profit, block.timestamp);

        success = true;
        result = abi.encode(nftContract, tokenId, debt, profit);
        return (success, result, profit);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}