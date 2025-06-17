// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RedistributionVault is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    IERC20 public token; // Changed from paymentToken to token for consistency
    address payable public panAfricanTreasury;
    address payable public diasporaDevelopmentPool;
    address payable public historicalRestitutionFund;

    uint256 public totalReceived;
    uint256 public minRedistributionShare; // e.g., 25% (2500 basis points)

    event FundsReceived(address indexed from, uint256 amount);
    event FundsDistributed(uint256 panAfrican, uint256 diaspora, uint256 restitution);
    event TokensDeposited(address indexed from, uint256 amount);

    function initialize(
        address _tokenAddress,
        address payable _panAfricanTreasury,
        address payable _diasporaDevelopmentPool,
        address payable _historicalRestitutionFund,
        uint256 _minRedistributionShare
    ) public initializer {
        __Ownable_init(msg.sender);
        token = IERC20(_tokenAddress);
        panAfricanTreasury = _panAfricanTreasury;
        diasporaDevelopmentPool = _diasporaDevelopmentPool;
        historicalRestitutionFund = _historicalRestitutionFund;
        minRedistributionShare = _minRedistributionShare;
    }

    function deposit(uint256 amount) external {
        require(token.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        totalReceived += amount;
        emit TokensDeposited(msg.sender, amount);
    }

    // function distribute() public onlyOwner {
    //     uint256 balance = address(this).balance;
    //     require(balance > 0, "No funds");
    //     uint256 panAfrican = (balance * 40) / 100;
    //     uint256 diaspora = (balance * 30) / 100;
    //     uint256 restitution = balance - panAfrican - diaspora;
    //     panAfricanTreasury.transfer(panAfrican);
    //     diasporaDevelopmentPool.transfer(diaspora);
    //     historicalRestitutionFund.transfer(restitution);
    //     emit FundsDistributed(panAfrican, diaspora, restitution);
    // }

function distribute() public onlyOwner {
    uint256 balance = token.balanceOf(address(this));
    require(balance > 0, "No funds");
    uint256 panAfrican = (balance * 40) / 100;
    uint256 diaspora = (balance * 30) / 100;
    uint256 restitution = balance - panAfrican - diaspora;
    require(token.transfer(panAfricanTreasury, panAfrican), "Transfer failed");
    require(token.transfer(diasporaDevelopmentPool, diaspora), "Transfer failed");
    require(token.transfer(historicalRestitutionFund, restitution), "Transfer failed");
    emit FundsDistributed(panAfrican, diaspora, restitution);
}
    function setRecipients(
        address payable _panAfricanTreasury,
        address payable _diasporaDevelopmentPool,
        address payable _historicalRestitutionFund
    ) external onlyOwner {
        panAfricanTreasury = _panAfricanTreasury;
        diasporaDevelopmentPool = _diasporaDevelopmentPool;
        historicalRestitutionFund = _historicalRestitutionFund;
    }

    function setMinRedistributionShare(uint256 _bps) external onlyOwner {
        require(_bps <= 10000, "Too high");
        minRedistributionShare = _bps;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}