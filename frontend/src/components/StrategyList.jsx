import React, { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';
import RegistryABI from '../abi/Registry.json';
import { ethers } from 'ethers';

const StrategyList = () => {
  const { provider, contract, isConnected, connectWallet, switchToSkaleNetwork, error } = useContract();
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStrategies = async () => {
    if (!isConnected || !contract || !provider) return;

    setLoading(true);
    try {
      // Get Registry address from ProfitMaximizerModularSystem
      const registryAddress = await contract.registry();
      console.log('Registry address:', registryAddress); // Debug

      // Extract ABI from Hardhat artifact
      const registryAbi = Array.isArray(RegistryABI) ? RegistryABI : RegistryABI.abi;

      const registryContract = new ethers.Contract(registryAddress, registryAbi, provider);

      // Fetch strategy names
      const strategyNames = await registryContract.getStrategyNames();
      console.log('Strategy names:', strategyNames); // Debug

      const strategyDetails = await Promise.all(
        strategyNames.map(async (name) => {
          const address = await registryContract.getStrategy(name);
          return { name, address };
        })
      );
      console.log('Strategy details:', strategyDetails); // Debug
      setStrategies(strategyDetails);
    } catch (err) {
      console.error('Error fetching strategies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && contract) {
      fetchStrategies();
    }
  }, [isConnected, contract]);

  return (
    <div className="strategy-list">
      <h2>Registered Strategies</h2>
      {error && <p className="error">{error}</p>}
      {!isConnected && <button onClick={connectWallet}>Connect Wallet</button>}
      {isConnected && (
        <>
          <button onClick={fetchStrategies} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh Strategies'}
          </button>
          {strategies.length === 0 && <p>No strategies registered.</p>}
          <ul>
            {strategies.map((strategy, index) => (
              <li key={index}>
                <strong>{strategy.name}</strong>: {strategy.address}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default StrategyList;