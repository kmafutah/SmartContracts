// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HelloWorld {
    string public message;

    constructor() {
        message = "Hello, SKALE!";
    }

    function setMessage(string calldata newMessage) external {
        message = newMessage;
    }
} 