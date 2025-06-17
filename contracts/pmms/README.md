```rtf
[Owner/User]
    |
    | executeStrategy(name, asset, amount, params)
    v
[ProfitMaximizerModularSystem]
    | getStrategy(name)
    |----------------> [Registry]
    |                     | getStrategy(name) -> returns strategyAddress
    |                     | getAddress(key) -> returns protocol addresses (e.g., AAVE_LENDING_POOL, USDC)
    |                     | getStrategyNames() -> for strategy iteration
    |                     v
    | initiateFlashLoan(asset, amount, params)
    v
[FlashloanExecutor]
    | flashLoanSimple(this, asset, amount, params, 0)
    |----------------> [MockPool/AavePool]
    |                     | transfer(asset, amount) -> Simulate loan
    |                     | executeOperation(asset, amount, premium, initiator, params)
    |                     v
    | executeOperation(asset, amount, premium, initiator, params)
    | findAndExecute(asset, amount, premium, params)
    |----------------> [StrategyExecutor]
    |                     | getStrategyNames()
    |                     |----------------> [Registry]
    |                     |                     | returns strategyNames
    |                     | getStrategy(name)
    |                     |----------------> [Registry]
    |                     |                     | returns strategyAddress
    |                     | checkOpportunity(asset, amount)
    |                     |----------------> [Strategy (e.g., StrategyYieldLoop, StrategyStablecoinMetaProtocolArbitrage)]
    |                     |                     | returns (profit, executionData)
    |                     | execute(executionData, amount, premium)
    |                     |----------------> [Strategy]
    |                     |                     | deposit(), borrow(), swap(), etc.
    |                     |                     | interacts with external protocols (e.g., MockAaveLendingPool, MockCurve3Pool, MockSwapRouter)
    |                     |                     | returns (success, result, finalProfit)
    |                     | emit StrategyExecuted(strategy, asset, profit)
    |                     v
    | approve(asset, amount + premium)
    |----------------> [MockPool/AavePool]
    |                     | transferFrom(this, pool, amount + premium) -> Repay loan
    | emit FlashloanExecuted(asset, amount, premium, success)
    v
[ProfitMaximizerModularSystem]
    | emit StrategyExecuted(name, strategyAddress, true)
```