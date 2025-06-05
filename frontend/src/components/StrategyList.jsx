import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useContract } from '../hooks/useContract';
import strategyOptions from '../data/strategyOptions';

const StrategyList = () => {
  const { strategyExecutorContract, isConnected, connectWallet, switchToSkaleNetwork, error } = useContract();
  const [strategies, setStrategies] = useState(strategyOptions);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [amount, setAmount] = useState('1');
  const [txStatus, setTxStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionType, setActionType] = useState(''); // 'find' or 'execute'

  const handleStrategyChange = (e) => {
    const strategyValue = e.target.value;
    const strategy = strategies.find(s => s.value === strategyValue);
    setSelectedStrategy(strategy);
  };

  const handleAction = async (type) => {
    if (!selectedStrategy) {
      setTxStatus('Please select a strategy');
      return;
    }

    if (!isConnected) {
      await connectWallet();
      await switchToSkaleNetwork();
      return;
    }

    if (!strategyExecutorContract) {
      setTxStatus('Contract not initialized');
      return;
    }

    setIsLoading(true);
    setActionType(type);
    setTxStatus('');

    try {
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      
      if (type === 'find') {
        const result = await strategyExecutorContract.checkOpportunity(selectedStrategy.value, amountWei);
        setTxStatus(`Opportunity check completed. Profit: ${ethers.formatUnits(result.profit || 0, 18)}`);
      } else {
        const tx = await strategyExecutorContract.executeStrategy(
          selectedStrategy.label,
          selectedStrategy.value,
          amountWei,
          '0x'
        );
        setTxStatus('Transaction sent. Waiting for confirmation...');
        const receipt = await tx.wait();
        setTxStatus(`Transaction confirmed! Hash: ${receipt.transactionHash}`);
      }
    } catch (err) {
      setTxStatus(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setActionType('');
    }
  };

  return (
    <div className="strategy-list p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Strategy Dashboard</h2>
      
      {error && <p className="text-red-500 mb-4">{error}</p>}
      
      {!isConnected ? (
        <button
          onClick={connectWallet}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Strategy:</label>
            <select
              value={selectedStrategy?.value || ''}
              onChange={handleStrategyChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={isLoading}
            >
              <option value="">-- Select a strategy --</option>
              {strategies.map((strategy) => (
                <option key={strategy.value} value={strategy.value}>
                  {strategy.label}
                </option>
              ))}
            </select>
          </div>

          {selectedStrategy && (
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-medium text-lg mb-2">{selectedStrategy.label}</h3>
              <p className="text-sm text-gray-600 mb-2">
                Address: <code className="bg-gray-100 px-1 rounded">{selectedStrategy.value}</code>
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount:</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="p-2 border border-gray-300 rounded-md w-full"
                  disabled={isLoading}
                  placeholder="Enter amount in tokens"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => handleAction('find')}
                  disabled={isLoading && actionType !== 'find'}
                  className={`px-4 py-2 rounded-md ${
                    isLoading && actionType === 'find'
                      ? 'bg-yellow-400 cursor-not-allowed'
                      : 'bg-yellow-500 hover:bg-yellow-600'
                  } text-white`}
                >
                  {isLoading && actionType === 'find' ? 'Checking...' : 'Find Opportunity'}
                </button>

                <button
                  onClick={() => handleAction('execute')}
                  disabled={isLoading && actionType !== 'execute'}
                  className={`px-4 py-2 rounded-md ${
                    isLoading && actionType === 'execute'
                      ? 'bg-green-500 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white`}
                >
                  {isLoading && actionType === 'execute' ? 'Executing...' : 'Execute Strategy'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {txStatus && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">{txStatus}</p>
        </div>
      )}
    </div>
  );
};

export default StrategyList;