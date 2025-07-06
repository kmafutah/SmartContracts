// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IStrategy.sol";
import "../interfaces/IRegistry.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
// import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

interface ISkaleNftMarket {
    function getFloorPrice(address nftCollection) external view returns (uint256);
    function buy(address nftCollection, uint256 tokenId, uint256 price) external returns (bool);
    function sell(address nftCollection, uint256 tokenId, uint256 price) external returns (bool);
}

contract StrategyNFTFloorArbitrage is IStrategy, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, IERC721Receiver {
    using SafeERC20 for IERC20;

    address public registry;
    uint256 public minProfitMargin; // 5% (500 basis points)

    event ArbitrageExecuted(
        address indexed nftCollection,
        uint256 indexed tokenId,
        uint256 buyPrice,
        uint256 sellPrice,
        uint256 profit,
        address indexed marketplace
    );

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
        minProfitMargin = 500; // 5%
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function name() external pure override returns (string memory) {
        return "NFTFloorArbitrage";
    }

    function checkOpportunity(address asset, uint256 amount)
        external
        view
        override
        returns (uint256 profit, bytes memory executionData)
    {
        address marketplace = IRegistry(registry).getAddress("NFT_MARKETPLACE");
        address externalMarket = IRegistry(registry).getAddress("EXTERNAL_NFT_MARKET");
        if (marketplace == address(0) || externalMarket == address(0)) return (0, "");

        uint256 chainlinkPrice;
        try IRegistry(registry).getNftFloorPrice(asset) returns (uint256 price) {
            chainlinkPrice = price;
        } catch {
            return (0, "");
        }
        if (chainlinkPrice == 0) return (0, "");

        uint256 marketplacePrice;
        try ISkaleNftMarket(marketplace).getFloorPrice(asset) returns (uint256 price) {
            marketplacePrice = price;
        } catch {
            return (0, "");
        }

        uint256 externalPrice;
        try ISkaleNftMarket(externalMarket).getFloorPrice(asset) returns (uint256 price) {
            externalPrice = price;
        } catch {
            return (0, "");
        }
        if (marketplacePrice == 0 || externalPrice == 0) return (0, "");

        uint256 buyPrice;
        uint256 sellPrice;
        bool buyFromMarketplace;
        uint256 tokenId = 1; // Off-chain monitoring provides tokenId

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

        if (buyPrice > amount || tokenId == 0) return (0, "");

        uint256 profitMargin = ((sellPrice - buyPrice) * 10000) / buyPrice;
        if (profitMargin < minProfitMargin) return (0, "");

        profit = sellPrice - buyPrice;
        executionData = abi.encode(asset, marketplace, externalMarket, buyFromMarketplace, tokenId);
        return (profit, executionData);
    }

    function execute(bytes memory executionData, uint256 amount, uint256 premium)
        external
        override
        nonReentrant
        returns (bool success, bytes memory result, uint256 profit)
    {
        (address nftCollection, address marketplace, address externalMarket, bool buyFromMarketplace, uint256 tokenId) = abi.decode(
            executionData,
            (address, address, address, bool, uint256)
        );
        require(nftCollection != address(0) && tokenId != 0, "Invalid NFT collection or tokenId");

        uint256 chainlinkPrice;
        try IRegistry(registry).getNftFloorPrice(nftCollection) returns (uint256 price) {
            chainlinkPrice = price;
        } catch {
            revert("Invalid Chainlink price");
        }
        require(chainlinkPrice > 0, "Invalid Chainlink price");

        uint256 marketplacePrice;
        try ISkaleNftMarket(marketplace).getFloorPrice(nftCollection) returns (uint256 price) {
            marketplacePrice = price;
        } catch {
            revert("Invalid marketplace price");
        }

        uint256 externalPrice;
        try ISkaleNftMarket(externalMarket).getFloorPrice(nftCollection) returns (uint256 price) {
            externalPrice = price;
        } catch {
            revert("Invalid external market price");
        }
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
        if (buyFromMarketplace) {
            token.approve(marketplace, buyPrice);
            try ISkaleNftMarket(marketplace).buy(nftCollection, tokenId, buyPrice) returns (bool success) {
                buySuccess = success;
            } catch {
                revert("Buy failed");
            }
            token.approve(marketplace, 0);
        } else {
            token.approve(externalMarket, buyPrice);
            try ISkaleNftMarket(externalMarket).buy(nftCollection, tokenId, buyPrice) returns (bool success) {
                buySuccess = success;
            } catch {
                revert("Buy failed");
            }
            token.approve(externalMarket, 0);
        }
        require(buySuccess, "Buy failed");
        require(IERC721(nftCollection).ownerOf(tokenId) == address(this), "NFT not received");

        bool sellSuccess;
        IERC721(nftCollection).approve(buyFromMarketplace ? externalMarket : marketplace, tokenId);
        if (buyFromMarketplace) {
            try ISkaleNftMarket(externalMarket).sell(nftCollection, tokenId, sellPrice) returns (bool success) {
                sellSuccess = success;
            } catch {
                revert("Sell failed");
            }
        } else {
            try ISkaleNftMarket(marketplace).sell(nftCollection, tokenId, sellPrice) returns (bool success) {
                sellSuccess = success;
            } catch {
                revert("Sell failed");
            }
        }
        IERC721(nftCollection).approve(address(0), tokenId);
        require(sellSuccess, "Sell failed");

        profit = sellPrice - buyPrice;
        require(profit > premium, "Profit does not cover premium");

        emit ArbitrageExecuted(
            nftCollection,
            tokenId,
            buyPrice,
            sellPrice,
            profit,
            buyFromMarketplace ? marketplace : externalMarket
        );

        success = true;
        result = abi.encode(nftCollection, tokenId, profit);
        return (success, result, profit);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}