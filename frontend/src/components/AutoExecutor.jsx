import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';

// Define the IStrategy ABI
const strategyAbi = [
  'function checkOpportunity(address asset, uint256 amount) external view returns (uint256 profit, bytes memory executionData)',
  'function name() external view returns (string memory)',
];

// Define the ProfitMaximizerModularSystem ABI
const pmmAbi = [
  'function executeStrategy(string calldata name, address asset, uint256 amount, bytes calldata params) external',
];

const AutoExecutor = ({ isConnected, account, registryContract }) => {
  const [autoRun, setAutoRun] = useState(false);
  const [log, setLog] = useState([]);
  const [intervalId, setIntervalId] = useState(null);
  const [amount, setAmount] = useState('1');
  const [strategies, setStrategies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Ensure a provider is available for static calls
  const getProvider = () => {
    // Use MetaMask or another browser-based provider
    if (window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    // Fallback to a SKALE RPC endpoint (replace with your SKALE chain's RPC URL)
    return new ethers.JsonRpcProvider('https://your-skale-chain-rpc-url');
  };

  const loadStrategies = async () => {
    try {
      setIsLoading(true);
      if (!registryContract) {
        throw new Error('Registry contract not initialized');
      }

      const strategyNames = await registryContract.getStrategyNames();
      const results = [];
      for (let name of strategyNames) {
        const addr = await registryContract.getStrategy(name);
        if (addr !== ethers.ZeroAddress) {
          results.push({ name, address: addr });
        }
      }
      setStrategies(results);
      setLog(prev => [...prev, `✅ Loaded ${results.length} strategies`]);
    } catch (err) {
      console.error('Error loading strategies:', err);
      setLog(prev => [...prev, `❌ Could not load strategies: ${err.message}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const runOpportunityCheck = async () => {
    try {
      if (!registryContract || !isConnected) {
        throw new Error('Not connected or registry contract not initialized');
      }
      if (!strategies.length) {
        throw new Error('No strategies available');
      }

      // Get the provider for static calls
      const provider = getProvider();

      // Get USDC address
      const usdcAddress = await registryContract.getAddress('USDC');
      if (usdcAddress === ethers.ZeroAddress) {
        throw new Error('USDC address not found in registry');
      }

      // Get ProfitMaximizerModularSystem address
      const pmmAddress = await registryContract.getAddress('PMM');
      if (pmmAddress === ethers.ZeroAddress) {
        throw new Error('ProfitMaximizerModularSystem address not found in registry');
      }

      // Get USDC decimals (since USDC typically has 6 decimals, not 18)
      const usdcContract = new ethers.Contract(
        usdcAddress,
        ['function decimals() view external returns (uint8)'],
        provider
      );
      const decimals = await usdcContract.decimals();

      // Instantiate ProfitMaximizerModularSystem contract with signer
      const signer = await registryContract.signer;
      const pmmContract = new ethers.Contract(pmmAddress, pmmAbi, signer);

      setLog(prev => [...prev, `🔄 Running opportunity check for ${strategies.length} strategies`]);

      for (const strat of strategies) {
        // Instantiate strategy contract with provider for view calls
        const strategyContract = new ethers.Contract(strat.address, strategyAbi, provider);

        const amountWei = ethers.parseUnits(amount, decimals);
        // Call checkOpportunity
        let check;
        try {
          check = await strategyContract.checkOpportunity(usdcAddress, amountWei);
        } catch (err) {
          setLog(prev => [...prev, `❌ Error checking ${strat.name}: ${err.message}`]);
          continue;
        }

        const isProfitable = check.profit && check.profit > 0;
        if (isProfitable) {
          try {
            const tx = await pmmContract.executeStrategy(
              strat.name,
              usdcAddress,
              amountWei,
              check.executionData || '0x'
            );
            await tx.wait();
            setLog(prev => [...prev, `✅ Executed ${strat.name} | Tx: ${tx.hash}`]);
          } catch (err) {
            setLog(prev => [...prev, `❌ Error executing ${strat.name}: ${err.message}`]);
          }
        } else {
          setLog(prev => [...prev, `🔎 Checked ${strat.name} | No profit`]);
        }
      }
    } catch (err) {
      setLog(prev => [...prev, `❌ Error in opportunity check: ${err.message}`]);
      console.error('Error in opportunity check:', err);
    }
  };

  const toggleAutoRun = () => {
    setAutoRun(prev => !prev);
    if (!autoRun) {
      setLog(prev => [...prev, '🚀 AutoRun started']);
      const id = setInterval(runOpportunityCheck, 30000);
      setIntervalId(id);
    } else {
      clearInterval(intervalId);
      setIntervalId(null);
      setLog(prev => [...prev, '🛑 AutoRun stopped']);
    }
  };

  useEffect(() => {
    if (isConnected && registryContract) {
      loadStrategies();
    }
  }, [isConnected, registryContract]);

  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        setLog(prev => [...prev, '🛑 AutoRun stopped (component unmounted)']);
      }
    };
  }, [intervalId]);

  return (
    <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
      <h2 className="text-2xl font-bold text-blue-700 mb-4">Auto Strategy Executor</h2>
      {!isConnected ? (
        <p className="text-gray-600">Please connect your wallet to use the executor</p>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-600">
              Connected: <span className="font-mono text-green-600">{account}</span>
            </p>
            {autoRun && (
              <span className="text-sm text-green-600 font-semibold flex items-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                AutoRun Active
              </span>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Token Amount:</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded w-28"
                min="0"
                step="0.01"
                placeholder="Amount"
              />
            </div>
            <button
              onClick={toggleAutoRun}
              disabled={isLoading || !strategies.length}
              className={`px-4 py-2 text-white rounded ${
                autoRun ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              } ${isLoading || !strategies.length ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {autoRun ? 'Stop AutoRun' : 'Start AutoRun'}
            </button>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-2">Available Strategies</h3>
            {isLoading ? (
              <p className="text-gray-600">Loading strategies...</p>
            ) : strategies.length === 0 ? (
              <p className="text-gray-600">No strategies available</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {strategies.map((strat, i) => (
                  <div key={i} className="p-2 bg-gray-50 rounded">
                    <span className="font-medium">{strat.name}</span>
                    <p className="text-sm text-gray-600 break-all">Address: {strat.address}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4">
            <h4 className="text-lg font-semibold mb-2">Execution Log</h4>
            <ul className="text-sm bg-white border rounded p-3 max-h-60 overflow-y-auto space-y-1">
              {log.map((entry, i) => (
                <li key={i} className="whitespace-nowrap">{entry}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoExecutor;