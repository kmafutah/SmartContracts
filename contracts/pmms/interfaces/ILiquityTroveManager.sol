// pmms/interfaces/ILiquityTroveManager.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface ILiquityTroveManager {
    function liquidate(address borrower) external;
    function getTroveDebt(address borrower) external view returns (uint256);
    function getTroveColl(address borrower) external view returns (uint256);
}
