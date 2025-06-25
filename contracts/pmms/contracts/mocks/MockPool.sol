// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@aave/core-v3/contracts/flashloan/interfaces/IFlashLoanSimpleReceiver.sol";

contract MockPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 /* referralCode */
    ) external {
        IERC20 token = IERC20(asset);
        token.transfer(receiverAddress, amount); // Simulate loan
        require(
            IFlashLoanSimpleReceiver(receiverAddress).executeOperation(
                asset,
                amount,
                0,
                msg.sender,
                params
            ),
            "Flash loan execution failed"
        );
        token.transferFrom(receiverAddress, address(this), amount); // Simulate repayment
    }

    // Other Aave pool methods are NOT needed unless explicitly called
}
