import React, { useState } from 'react';
import { useContract } from '../hooks/useContract';
import { ethers } from 'ethers';

const ExecuteStrategy = () => {
  const { contract, account, isConnected, connectWallet, switchToSkaleNetwork, error } = useContract();
  const [strategyName, setStrategyName] = useState('');
  const [asset, setAsset] = useState('');
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

    if (!contract) {
      setTxStatus('Contract not initialized');
      return;
    }

    setLoading(true);
    try {
      // Convert amount to wei (assuming 18 decimals for simplicity)
      const amountWei = ethers.parseUnits(amount || '0', 18);
      // Encode params as bytes (assuming params is a hex string or empty)
      const encodedParams = params || '0x';

      const tx = await contract.executeStrategy(strategyName, asset, amountWei, encodedParams);
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
            <label>Strategy Name:</label>
            <input
              type="text"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              placeholder="e.g., DEX Arbitrage"
              required
            />
          </div>
          <div>
            <label>Asset Address:</label>
            <input
              type="text"
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              placeholder="0x..."
              required
            />
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