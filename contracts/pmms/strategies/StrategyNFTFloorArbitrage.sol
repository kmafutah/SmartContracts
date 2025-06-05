// SPDX-License-License: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IStrategy.sol";
import "../interfaces/IRegistry.sol";
import "../interfaces/INftFloorOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface ISkaleNftMarket {
    function getFloorPrice(address nftCollection) external view returns (uint256);
    function buy(address nftCollection, uint256 tokenId, uint256 price) external returns (bool);
    function sell(address nftCollection, uint256 tokenId, uint256 price) external returns (bool);
}

contract StrategyNFTFloorArbitrage is IStrategy, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable registry;
    uint256 public minProfitMargin = 500; // 5% (basis points)

    event ArbitrageExecuted(
        address indexed nftCollection,
        uint256 buyPrice,
        uint256 sellPrice,
        uint256 profit,
        address indexed marketplace
    );

    constructor(address _registry, address _initialOwner) Ownable(_initialOwner) {
        registry = _registry;
    }

    function name() external pure returns (string memory) {
        return "NFT Floor Arbitrage";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        address marketplace = IRegistry(registry).getAddress("NFT_MARKETPLACE");
        address externalMarket = IRegistry(registry).getAddress("EXTERNAL_NFT_MARKET");
        require(marketplace != address(0) && externalMarket != address(0), "Markets not set");

        uint256 chainlinkPrice = IRegistry(registry).getNftFloorPrice(asset);
        if (chainlinkPrice == 0) return (0, "");

        uint256 marketplacePrice = ISkaleNftMarket(marketplace).getFloorPrice(asset);
        uint256 externalPrice = ISkaleNftMarket(externalMarket).getFloorPrice(asset);
        if (marketplacePrice == 0 || externalPrice == 0) return (0, "");

        uint256 buyPrice;
        uint256 sellPrice;
        bool buyFromMarketplace;

        if (externalPrice < marketplacePrice) {
            buyPrice = externalPrice;
            sellPrice = marketplacePrice;
            buyFromMarketplace = false;
        } else if (marketplacePrice < externalPrice) {
            buyPrice = marketplacePrice;
            sellPrice = externalPrice;
            buyFromMarketplace = true;
        } else {
            return (0, "");
        }

        if (buyPrice > amount) return (0, "");

        uint256 profitMargin = ((sellPrice - buyPrice) * 10000) / buyPrice;
        if (profitMargin < minProfitMargin) return (0, "");

        profit = sellPrice - buyPrice;
        executionData = abi.encode(asset, marketplace, externalMarket, buyFromMarketplace);
        return (profit, executionData);
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool success, bytes memory result, uint256)
    {
        (address nftCollection, address marketplace, address externalMarket, bool buyFromMarketplace) = abi.decode(
            executionData,
            (address, address, address, bool)
        );
        require(nftCollection != address(0), "Invalid NFT collection");

        uint256 chainlinkPrice = IRegistry(registry).getNftFloorPrice(nftCollection);
        require(chainlinkPrice > 0, "Invalid Chainlink price");

        uint256 marketplacePrice = ISkaleNftMarket(marketplace).getFloorPrice(nftCollection);
        uint256 externalPrice = ISkaleNftMarket(externalMarket).getFloorPrice(nftCollection);
        require(marketplacePrice > 0 && externalPrice > 0, "Invalid market prices");

        uint256 buyPrice;
        uint256 sellPrice;
        if (externalPrice < marketplacePrice && !buyFromMarketplace) {
            buyPrice = externalPrice;
            sellPrice = marketplacePrice;
        } else if (marketplacePrice < externalPrice && buyFromMarketplace) {
            buyPrice = marketplacePrice;
            sellPrice = externalPrice;
        } else {
            revert("No arbitrage opportunity");
        }

        require(((sellPrice - buyPrice) * 10000) / buyPrice >= minProfitMargin, "Profit margin too low");
        require(buyPrice <= amount, "Buy price exceeds amount");

        address weth = IRegistry(registry).getAddress("WETH");
        require(weth != address(0), "WETH not set");
        IERC20 token = IERC20(weth);
        require(token.balanceOf(address(this)) >= buyPrice, "Insufficient WETH");

        bool buySuccess;
        uint256 tokenId = 0; // Simplified; real tokenId from event
        if (buyFromMarketplace) {
            token.approve(marketplace, buyPrice);
            buySuccess = ISkaleNftMarket(marketplace).buy(nftCollection, tokenId, buyPrice);
            token.approve(marketplace, 0);
        } else {
            token.approve(externalMarket, buyPrice);
            buySuccess = ISkaleNftMarket(externalMarket).buy(nftCollection, tokenId, buyPrice);
            token.approve(externalMarket, 0);
        }
        require(buySuccess, "Buy failed");

        bool sellSuccess;
        IERC721(nftCollection).approve(buyFromMarketplace ? externalMarket : marketplace, tokenId);
        if (buyFromMarketplace) {
            sellSuccess = ISkaleNftMarket(externalMarket).sell(nftCollection, tokenId, sellPrice);
        } else {
            sellSuccess = ISkaleNftMarket(marketplace).sell(nftCollection, tokenId, sellPrice);
        }
        IERC721(nftCollection).approve(address(0), tokenId);
        require(sellSuccess, "Sell failed");

        uint256 profit = sellPrice - buyPrice;
        require(profit > premium, "Profit does not cover premium");

        emit ArbitrageExecuted(nftCollection, buyPrice, sellPrice, profit, buyFromMarketplace ? marketplace : externalMarket);

        success = true;
        result = abi.encode(nftCollection, tokenId, profit);
        return (success, result, profit - premium);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}