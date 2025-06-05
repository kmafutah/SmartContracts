#!/bin/bash

# Path to your JSON file
JSON_FILE="deployments/deployment-skale_testnet.json"

# Network to use for verification
NETWORK="skale_testnet"

# Function to verify a contract
verify_contract() {
    local address=$1
    echo "Verifying contract at address: $address"
    npx hardhat verify --network "$NETWORK" "$address"
    if [ $? -eq 0 ]; then
        echo "Successfully verified $address"
    else
        echo "Failed to verify $address"
    fi
    echo ""
}

# Read top-level contracts
top_level_contracts=("Registry" "StrategyExecutor" "FlashloanExecutor" "PMMS")
for contract in "${top_level_contracts[@]}"; do
    address=$(jq -r ".$contract" "$JSON_FILE")
    verify_contract "$address"
done

# Read mock contracts
mock_contracts=$(jq -r '.Mocks | keys[]' "$JSON_FILE")
for contract in $mock_contracts; do
    address=$(jq -r ".Mocks.$contract" "$JSON_FILE")
    verify_contract "$address"
done

# Read strategy contracts
strategy_contracts=$(jq -r '.Strategies | keys[]' "$JSON_FILE")
for contract in $strategy_contracts; do
    address=$(jq -r ".Strategies.$contract" "$JSON_FILE")
    verify_contract "$address"
done

echo "All contracts verification completed."