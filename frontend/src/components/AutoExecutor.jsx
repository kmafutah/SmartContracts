// src/components/AutoExecutor.jsx
import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useContract } from '../hooks/useContract';
// import RegistryABI from '../abi/Registry.json';
import RegistryABI from '../abi/RegistryVerifiedABI.json';


const AutoExecutor = () => {
  const { registryContract, isConnected, connectWallet, switchToSkaleNetwork, account } = useContract();
  const [autoRun, setAutoRun] = useState(false);
  const [log, setLog] = useState([]);
  const [intervalId, setIntervalId] = useState(null);
  const [amount, setAmount] = useState('1');
  const [strategies, setStrategies] = useState([]);

  const registryAddress = "0xCCBF4c54915B58e8dC5Dd6B0fe178467698A3a3C";

  const loadStrategies = async () => {
    try {
      if (!registryContract) return;
      
      // Get all strategy names from the registry
      const strategyNames = await registryContract.getAllStrategyNames();
      
      const results = [];
      for (let name of strategyNames) {
        const addr = await registryContract.getStrategy(name);
        results.push({ name, address: addr });
      }
      setStrategies(results);
    } catch (err) {
      console.error("Error loading strategies:", err);
      setLog(log => [`❌ Could not load strategies: ${err.message}`, ...log]);
    }
  };


  const runOpportunityCheck = async () => {
    try {
      if (!contract || !isConnected) return;
      for (const strat of strategies) {
        const amountWei = ethers.parseUnits(amount, 18);
        const check = await contract.checkOpportunity(strat.address, amountWei);
        const isProfitable = check && check.profit && check.profit > 0;
        if (isProfitable) {
          const tx = await contract.executeStrategy(strat.name, strat.address, amountWei, check.data || '0x');
          setLog(log => [`✅ Executed ${strat.name} | Tx: ${tx.hash}`, ...log]);
        } else {
          setLog(log => [`🔎 Checked ${strat.name} | No profit`, ...log]);
        }
      }
    } catch (err) {
      setLog(log => [`❌ Error: ${err.message}`, ...log]);
    }
  };

  const toggleAutoRun = () => {
    setAutoRun(!autoRun);
    if (!autoRun) {
      const id = setInterval(runOpportunityCheck, 30000);
      setIntervalId(id);
    } else {
      clearInterval(intervalId);
    }
  };

  useEffect(() => {
    if (isConnected) loadStrategies();
  }, [isConnected]);

  return (
    <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
      <h2 className="text-2xl font-bold text-blue-700 mb-4">Auto Strategy Executor</h2>
      {!isConnected ? (
        <button
          onClick={connectWallet}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Connected: <span className="font-mono text-green-600">{account}</span></p>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Token Amount:</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded w-28"
            />
            <button
              onClick={toggleAutoRun}
              className={`px-4 py-2 text-white rounded ${autoRun ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {autoRun ? 'Stop AutoRun' : 'Start AutoRun'}
            </button>
            

          </div>
        </div>
      )}
      <div className="mt-6">
        <h4 className="text-lg font-semibold mb-2">Execution Log</h4>
        <ul className="text-sm bg-white border rounded p-3 max-h-60 overflow-y-auto space-y-1">
          {log.map((entry, i) => (
            <li key={i} className="whitespace-nowrap">{entry}</li>
          ))}
        </ul>
      </div>
      <div>
                <button
  onClick={async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const storageSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
    const raw = await provider.getStorage(registryAddress, storageSlot);
    const implAddress = ethers.getAddress("0x" + raw.slice(-40));
    setLog(log => [`🔍 Registry implementation: ${implAddress}`, ...log]);
  }}
  className="mt-4 px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
>
  Check Proxy Implementation
</button>
</div>
    </div>
    
  );
};

export default AutoExecutor;


