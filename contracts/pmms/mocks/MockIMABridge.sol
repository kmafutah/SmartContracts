// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;
contract MockIMABridge {
    event MessageSent(address sender, address recipient, bytes data);
    event MessageReceived(address sender, address recipient, bytes data);
    function sendMessage(address recipient, bytes calldata data) external {
        emit MessageSent(msg.sender, recipient, data);
    }
    function receiveMessage(address sender, bytes calldata data) external {
        emit MessageReceived(sender, msg.sender, data);
    }
}