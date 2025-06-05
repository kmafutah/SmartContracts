// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

interface IReparationsModel {
    function proposeRebalance(uint256[] calldata newWeights) external;
    function executeRebalance() external;
    function setAccessVerifier(address verifier) external;
    function setVault(address vault) external;
    function setOracleRouter(address router) external;
    function setZigtToken(address token) external;
    function setEthicalGuard(address guard) external;
    function setFeeBps(uint256 bps) external;
    function setReducedFeeBps(uint256 bps) external;
    function setRebalanceInterval(uint256 interval) external;
    function setDao(address dao) external;
    function getBasketWeights() external view returns (uint256[] memory);
    function getLastRebalance() external view returns (uint256);
    function getFeeBps() external view returns (uint256);
    function getReducedFeeBps() external view returns (uint256);
    function getRebalanceInterval() external view returns (uint256);
    function getDao() external view returns (address);
}
