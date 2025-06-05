import React, { useState } from 'react';
import { useContract } from '../hooks/useContract';

const RegisterStrategyForm = () => {
  const { contract, account, isConnected, connectWallet, switchToSkaleNetwork, error } = useContract();
  const [strategyName, setStrategyName] = useState('');
  const [strategyAddress, setStrategyAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState('');

  const handleRegisterStrategy = async (e) => {
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
      const tx = await contract.addStrategy(strategyName, strategyAddress);
      setTxStatus('Transaction sent! Waiting for confirmation...');
      const receipt = await tx.wait();
      setTxStatus(`Strategy registered! Hash: ${receipt.transactionHash}`);
    } catch (err) {
      setTxStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-strategy">
      <h2>Register Strategy</h2>
      {error && <p className="error">{error}</p>}
      {!isConnected && <button onClick={connectWallet}>Connect Wallet</button>}
      {isConnected && (
        <form onSubmit={handleRegisterStrategy}>
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
            <label>Strategy Address:</label>
            <input
              type="text"
              value={strategyAddress}
              onChange={(e) => setStrategyAddress(e.target.value)}
              placeholder="0x..."
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register Strategy'}
          </button>
        </form>
      )}
      {txStatus && <p>{txStatus}</p>}
    </div>
  );
};

export default RegisterStrategyForm;