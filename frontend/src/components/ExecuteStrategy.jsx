import React, { useState } from 'react';
import { useContract } from '../hooks/useContract';
import { ethers } from 'ethers';
import strategyOptions from '../data/strategyOptions';

const ExecuteStrategy = () => {
  const { strategyExecutorContract, isConnected, connectWallet, switchToSkaleNetwork, error } = useContract();
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [amount, setAmount] = useState('');
  const [params, setParams] = useState('');
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState('');

  const handleExecuteStrategy = async (e) => {
    e.preventDefault();
    if (!isConnected) {
      await connectWallet();
      await switchToSkaleNetwork();
      return;
    }

    if (!strategyExecutorContract) {
      setTxStatus('Contract not initialized');
      return;
    }


    if (!selectedStrategy) {
      setTxStatus('Please select a strategy');
      return;
    }

    setLoading(true);
    try {
      const amountWei = ethers.parseUnits(amount || '0', 18);
      const encodedParams = params || '0x';

      const strategy = strategyOptions.find(opt => opt.value === selectedStrategy);
      const strategyName = strategy ? strategy.label : '';
      const tx = await contract.executeStrategy(strategyName, selectedStrategy, amountWei, encodedParams);

      setTxStatus('Transaction sent! Waiting for confirmation...');
      const receipt = await tx.wait();
      setTxStatus(`Transaction confirmed! Hash: ${receipt.transactionHash}`);
    } catch (err) {
      setTxStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="execute-strategy">
      <h2>Execute Strategy</h2>
      {error && <p className="error">{error}</p>}
      {!isConnected && <button onClick={connectWallet}>Connect Wallet</button>}
      {isConnected && (
        <form onSubmit={handleExecuteStrategy}>
          <div>
            <label>Select Strategy:</label>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              required
            >
              <option value="">-- Select a strategy --</option>
              {strategyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Amount:</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount in tokens"
              required
            />
          </div>
          <div>
            <label>Params (bytes):</label>
            <input
              type="text"
              value={params}
              onChange={(e) => setParams(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Executing...' : 'Execute Strategy'}
          </button>
        </form>
      )}
      {txStatus && <p>{txStatus}</p>}
    </div>
  );
};

export default ExecuteStrategy;
