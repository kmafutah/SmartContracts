// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ZiGMerchantRegistry
 * @dev Registry for merchants accepting ZiG/ZiGT, supporting on-chain and off-chain (IPFS) metadata.
 */
contract ZiGMerchantRegistry is Ownable {
    struct Merchant {
        address merchantAddress;
        string ipfsHash; // Points to off-chain JSON metadata
        string category;
        address payoutWallet;
        bool verified;
        bool trusted;
        uint256 registeredAt;
    }

    mapping(address => Merchant) public merchants;
    address[] public merchantList;

    event MerchantRegistered(address indexed merchant, string ipfsHash, string category, address payoutWallet);
    event MerchantVerified(address indexed merchant, bool verified);
    event MerchantTrusted(address indexed merchant, bool trusted);
    event MerchantUpdated(address indexed merchant, string ipfsHash, string category, address payoutWallet);

    modifier onlyMerchant() {
        require(merchants[msg.sender].merchantAddress == msg.sender, "Not registered");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function registerMerchant(string calldata ipfsHash, string calldata category, address payoutWallet) external {
        require(merchants[msg.sender].merchantAddress == address(0), "Already registered");
        require(payoutWallet != address(0), "Invalid wallet");
        merchants[msg.sender] = Merchant({
            merchantAddress: msg.sender,
            ipfsHash: ipfsHash,
            category: category,
            payoutWallet: payoutWallet,
            verified: false,
            trusted: false,
            registeredAt: block.timestamp
        });
        merchantList.push(msg.sender);
        emit MerchantRegistered(msg.sender, ipfsHash, category, payoutWallet);
    }

    function updateMerchant(string calldata ipfsHash, string calldata category, address payoutWallet) external onlyMerchant {
        Merchant storage m = merchants[msg.sender];
        m.ipfsHash = ipfsHash;
        m.category = category;
        m.payoutWallet = payoutWallet;
        emit MerchantUpdated(msg.sender, ipfsHash, category, payoutWallet);
    }

    function setVerified(address merchant, bool status) external onlyOwner {
        require(merchants[merchant].merchantAddress != address(0), "Not registered");
        merchants[merchant].verified = status;
        emit MerchantVerified(merchant, status);
    }

    function setTrusted(address merchant, bool status) external onlyOwner {
        require(merchants[merchant].merchantAddress != address(0), "Not registered");
        merchants[merchant].trusted = status;
        emit MerchantTrusted(merchant, status);
    }

    function getMerchant(address merchant) external view returns (Merchant memory) {
        return merchants[merchant];
    }

    function getAllMerchants() external view returns (Merchant[] memory) {
        Merchant[] memory result = new Merchant[](merchantList.length);
        for (uint256 i = 0; i < merchantList.length; i++) {
            result[i] = merchants[merchantList[i]];
        }
        return result;
    }

    function isVerified(address merchant) external view returns (bool) {
        return merchants[merchant].verified;
    }

    function isTrusted(address merchant) external view returns (bool) {
        return merchants[merchant].trusted;
    }
} 