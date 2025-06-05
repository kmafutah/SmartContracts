// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./RedistributionVault.sol";
import "./AccessVerifier.sol";
import "./EthicalGuard.sol";
import { IERC20 as wZiGT} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IReparationsDAO {
    function isAuthorized(address caller) external view returns (bool);
}

interface IOracleRouter {
    function getPrice(string calldata symbol) external view returns (uint256 price, uint8 decimals);
}

contract ReparationsModel is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, EthicalGuard {
    // Asset symbols
    string public constant XAU = "XAU";
    string public constant USD = "USD";
    string public constant BTC = "BTC";
    string public constant ETH = "ETH";
    string public constant XOF = "XOF";
    string public constant ZAR = "ZAR";

    // Asset weights (basis points, 10000 = 100%)
    uint256 public constant XAU_WEIGHT = 3600;
    uint256 public constant USD_WEIGHT = 1800;
    uint256 public constant BTC_WEIGHT = 1800;
    uint256 public constant ETH_WEIGHT = 1200;
    uint256 public constant XOF_WEIGHT = 800;
    uint256 public constant ZAR_WEIGHT = 800;

    uint256 public constant FEE_BPS = 200; // 2%
    uint256 public constant REDUCED_FEE_BPS = 100; // 1%
    uint256 public constant REBALANCE_INTERVAL = 90 days;

    wZiGT public zigtToken;
    AccessVerifier public accessVerifier;
    IReparationsDAO public reparationsDAO;
    IOracleRouter public oracleRouter;

    uint256 public lastRebalance;

    event Minted(address indexed user, uint256 amount, uint256 fee);
    event Redeemed(address indexed user, uint256 amount, uint256 fee);
    event Rebalanced(uint256 timestamp);
    wZiGT public paymentToken;

    constructor(address _paymentToken, address _zigtToken) {
        paymentToken = wZiGT(_paymentToken);
        zigtToken = wZiGT(_zigtToken);
    }

    modifier onlyDAOorTimelock() {
        require(
            msg.sender == address(reparationsDAO) || reparationsDAO.isAuthorized(msg.sender),
            "Not authorized for rebalance"
        );
        _;
    }

    function initialize(
        address _zigtToken,
        address _vault,
        address _verifier,
        address _dao,
        address _oracleRouter
    ) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        zigtToken = wZiGT(_zigtToken);
        redistributionVault = IRedistributionVault(_vault); // Use interface type
        accessVerifier = AccessVerifier(_verifier);
        reparationsDAO = IReparationsDAO(_dao);
        oracleRouter = IOracleRouter(_oracleRouter);
        lastRebalance = block.timestamp;
    }

    // function mint(uint256 amount) external payable nonReentrant {
    //     require(amount > 0, "Zero amount");
    //     uint256 fee = _getFee(msg.sender, amount);
    //     uint256 net = amount - fee;
    //     // Accept payment in ETH or stablecoin (mocked as msg.value for now)
    //     require(msg.value >= amount, "Insufficient payment");
    //     // Route fee to vault
    //     (bool sent, ) = payable(address(redistributionVault)).call{value: fee}("");
    //     require(sent, "Fee transfer failed");
    //     // Mint tokens to user
    //     zigtToken.transfer(msg.sender, net);
    //     emit Minted(msg.sender, net, fee);
    // }

    function mint(uint256 amount) external nonReentrant {
        require(amount > 0, "Zero amount");

        uint256 fee = _getFee(msg.sender, amount);
        uint256 net = amount - fee;

        // Accept payment in ERC-20 token (e.g., USDC, DAI, etc.)
        require(paymentToken.transferFrom(msg.sender, address(this), amount), "Payment failed");

        // Route fee to vault
        require(paymentToken.transfer(address(redistributionVault), fee), "Fee transfer failed");

        // Mint ZiGT tokens to user
        require(zigtToken.transfer(msg.sender, net), "ZiGT transfer failed");

        emit Minted(msg.sender, net, fee);
    }


    function redeem(uint256 amount) external nonReentrant reparationBeforeProfit {
        require(amount > 0, "Zero amount");
        require(zigtToken.balanceOf(msg.sender) >= amount, "Insufficient balance");
        uint256 fee = _getFee(msg.sender, amount);
        uint256 net = amount - fee;
        // Burn tokens
        zigtToken.transferFrom(msg.sender, address(this), amount);
        // Route fee to vault
        (bool sent, ) = payable(address(redistributionVault)).call{value: fee}("");
        require(sent, "Fee transfer failed");
        // Payout basket (mock: just send ETH, in real: send basket assets)
        payable(msg.sender).transfer(net);
        emit Redeemed(msg.sender, net, fee);
    }

    function _getFee(address user, uint256 amount) internal view returns (uint256) {
        if (accessVerifier.eligibleForReducedFee(user)) {
            return (amount * REDUCED_FEE_BPS) / 10000;
        } else {
            return (amount * FEE_BPS) / 10000;
        }
    }

    // Calculate the basket value for a given amount of ZiGT
    function getRedemptionValue(uint256 amount) public view returns (uint256) {
        (uint256 value, ) = _basketValue(amount);
        return value;
    }

    function _basketValue(uint256 amount) internal view returns (uint256 value, uint256[] memory assetValues) {
        assetValues = new uint256[](6);
        (uint256 xau, ) = oracleRouter.getPrice(XAU);
        (uint256 usd, ) = oracleRouter.getPrice(USD);
        (uint256 btc, ) = oracleRouter.getPrice(BTC);
        (uint256 eth, ) = oracleRouter.getPrice(ETH);
        (uint256 xof, ) = oracleRouter.getPrice(XOF);
        (uint256 zar, ) = oracleRouter.getPrice(ZAR);
        assetValues[0] = (amount * xau * XAU_WEIGHT) / 10000;
        assetValues[1] = (amount * usd * USD_WEIGHT) / 10000;
        assetValues[2] = (amount * btc * BTC_WEIGHT) / 10000;
        assetValues[3] = (amount * eth * ETH_WEIGHT) / 10000;
        assetValues[4] = (amount * xof * XOF_WEIGHT) / 10000;
        assetValues[5] = (amount * zar * ZAR_WEIGHT) / 10000;
        value = assetValues[0] + assetValues[1] + assetValues[2] + assetValues[3] + assetValues[4] + assetValues[5];
    }

    // Rebalance basket weights/prices (only DAO/timelock)
    function rebalance() external onlyDAOorTimelock {
        require(block.timestamp >= lastRebalance + REBALANCE_INTERVAL, "Rebalance interval");
        // In a real implementation, update weights/prices from oracles and emit event
        lastRebalance = block.timestamp;
        emit Rebalanced(block.timestamp);
    }

    // Prevent direct USD redemption
    function redeemForUSD(uint256) external pure {
        revert("Direct USD redemption disabled");
    }
}
