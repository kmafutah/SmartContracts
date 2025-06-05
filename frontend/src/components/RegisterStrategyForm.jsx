import React, { useState } from 'react';
import { useContract } from '../hooks/useContract';

const ContractInteractor = () => {
  const contract = useContract(); // Custom hook to get the contract instance
  const [value, setValue] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetValue = async () => {
    try {
      setLoading(true);
      const tx = await contract.setValue(value); // assuming the contract has a setValue method
      await tx.wait(); // wait for the transaction to be mined
      alert('Transaction successful!');
    } catch (err) {
      console.error(err);
      alert('Transaction failed!');
    } finally {
      setLoading(false);
    }
  };

  const handleGetValue = async () => {
    try {
      const result = await contract.getValue(); // assuming the contract has a getValue method
      setResponse(result);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch value!');
    }
  };

  return (
    <div>
      <h2>Contract Interactor</h2>
      <input
        type="text"
        placeholder="Enter value"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button onClick={handleSetValue} disabled={loading}>
        {loading ? 'Setting...' : 'Set Value'}
      </button>
      <button onClick={handleGetValue}>Get Value</button>
      <p>Response from contract: {response}</p>
    </div>
  );
};

export default ContractInteractor;
