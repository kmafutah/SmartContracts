// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ZiGAddressRegistry
/// @notice Maps custom ZiG1-prefixed addresses to real EVM addresses with group metadata
contract ZiGAddressRegistry {
    enum AddressGroup {
        MAIN_REPARATIONS,
        STRATEGIC,
        PAN_AFRICAN,
        UTILITY,
        GOVERNANCE,
        NFT,
        SOUL_ID,
        ACCESS_AF,
        DIASPORA
    }

    struct Entry {
        address evmAddress;
        AddressGroup group;
        string encodedZiG;
    }

    mapping(bytes32 => Entry) public registry;
    mapping(address => string) public evmToZig;

    event AddressRegistered(string zigEncoded, address indexed evmAddress, AddressGroup group);

    /// @notice Registers a new ZIG1 address
    /// @param zigEncoded Full encoded ZIG1 string (e.g., ZIG1-R-7FGX6Z...)
    /// @param evmAddress The actual EVM address
    /// @param group The logical group the address belongs to
    function registerZigAddress(string memory zigEncoded, address evmAddress, AddressGroup group) external {
        bytes32 hash = keccak256(bytes(zigEncoded));
        require(registry[hash].evmAddress == address(0), "Already registered");

        registry[hash] = Entry({
            evmAddress: evmAddress,
            group: group,
            encodedZiG: zigEncoded
        });

        evmToZig[evmAddress] = zigEncoded;
        emit AddressRegistered(zigEncoded, evmAddress, group);
    }

    /// @notice Returns EVM address for a given encoded ZIG address
    function resolve(string memory zigEncoded) external view returns (address) {
        return registry[keccak256(bytes(zigEncoded))].evmAddress;
    }

    /// @notice Returns encoded ZIG address for an EVM address
    function reverse(address evmAddress) external view returns (string memory) {
        return evmToZig[evmAddress];
    }

    /// @notice Returns metadata entry for a given ZIG string
    function getEntry(string memory zigEncoded) external view returns (Entry memory) {
        return registry[keccak256(bytes(zigEncoded))];
    }
}
