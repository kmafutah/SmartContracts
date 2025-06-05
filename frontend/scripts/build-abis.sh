#!/bin/bash

ABI_DIR="./frontend/src/abi"
ARTIFACTS_DIR="./artifacts/contracts/pmms"

mkdir -p $ABI_DIR

declare -A contracts=(
  ["Registry"]="core/Registry.sol/Registry.json"
  ["StrategyExecutor"]="core/StrategyExecutor.sol/StrategyExecutor.json"
  ["FlashloanExecutor"]="core/FlashloanExecutor.sol/FlashloanExecutor.json"
  ["ProfitMaximizerModularSystem"]="ProfitMaximizerModularSystem.sol/ProfitMaximizerModularSystem.json"
  ["StrategyRegistry"]="core/StrategyRegistry.sol/StrategyRegistry.json"
  ["DeFiStrategies"]="core/DeFiStrategies.sol/DeFiStrategies.json"
  ["StrategyIds"]="core/StrategyIds.sol/StrategyIds.json"
)

for name in \"${!contracts[@]}\"; do
  path=\"$ARTIFACTS_DIR/${contracts[$name]}\"
  ln -sf \"../../../$path\" \"$ABI_DIR/$name.json\"
  echo \"Linked $name.json -> $path\"
done
