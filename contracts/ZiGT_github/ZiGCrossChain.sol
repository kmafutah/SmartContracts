// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

abstract contract ZiGCrossChain is Initializable, UUPSUpgradeable, CCIPReceiver, OwnableUpgradeable {
    uint64 public constant DEST_CHAIN_SELECTOR = 16015286601757825753;
    address public i_router;

    // Events
    event MessageSent(bytes32 messageId);
    event MessageReceived(bytes32 messageId);

    // Disable initializers in the implementation contract
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // Initializer for upgradable contract
    function initialize(address ccipRouter, address initialOwner) public virtual initializer {
        require(ccipRouter != address(0), "Invalid router address");
        require(initialOwner != address(0), "Invalid owner address");
        __UUPSUpgradeable_init();
        __Ownable_init(initialOwner);
        __ZiGCrossChain_init(ccipRouter);
    }

    // Internal initializer for ZiGCrossChain
    function __ZiGCrossChain_init(address ccipRouter) internal onlyInitializing {
        i_router = ccipRouter;
    }

    // Required for UUPSUpgradeable: Authorize upgrade (only owner/governance)
    function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {
        // Only owner can authorize upgrades
    }

    // Send cross-chain message
    function _sendCrossChainMessage(
        address receiver,
        bytes memory data
    ) internal returns (bytes32) {
        require(receiver != address(0), "Invalid receiver address");
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: data,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: address(0)
        });

        uint256 fee = IRouterClient(i_router).getFee(
            DEST_CHAIN_SELECTOR,
            message
        );

        bytes32 messageId = IRouterClient(i_router).ccipSend{value: fee}(
            DEST_CHAIN_SELECTOR,
            message
        );

        emit MessageSent(messageId);
        return messageId;
    }

    // Receive cross-chain message
    function _ccipReceive(Client.Any2EVMMessage memory message) internal virtual override {
        require(message.sourceChainSelector == DEST_CHAIN_SELECTOR, "Invalid chain");

        (address target, bytes memory data) = abi.decode(message.data, (address, bytes));
        require(target != address(0), "Invalid target address");
        (bool success, ) = target.call(data);
        require(success, "Cross-chain call failed");

        emit MessageReceived(message.messageId);
    }
}