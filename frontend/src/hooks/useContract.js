import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import ProfitMaximizerModularSystemABI from '../abi/ProfitMaximizerModularSystem.json';
import StrategyExecutorABI from '../abi/StrategyExecutor.json';
import RegistryABI from '../abi/RegistryVerifiedABI.json'; // Make sure to import the correct ABI

// Updated contract addresses from your deployment
const PMMS_ADDRESS = '0x5e1BBe9c436c8D33Ef87E489b6Cc391B48a6DEbE'; // From your deployment.json
const STRATEGY_EXECUTOR_ADDRESS = '0xBcDdF9aaDcF13603317220B89165b02f51E7607b'; // From your deployment.json
const REGISTRY_ADDRESS = '0xCCBF4c54915B58e8dC5Dd6B0fe178467698A3a3C'; // From your deployment.json
const SKALE_TESTNET_RPC = 'https://juicy-low-small-testnet-rpc.testnet.skalenodes.com';
const SKALE_CHAIN_ID = '0x5f6d';

export const useContract = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [pmmsContract, setPmmsContract] = useState(null);
  const [strategyExecutorContract, setStrategyExecutorContract] = useState(null);
  const [registryContract, setRegistryContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError('Please install MetaMask!');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();

      const pmmsAbi = Array.isArray(ProfitMaximizerModularSystemABI)
        ? ProfitMaximizerModularSystemABI
        : ProfitMaximizerModularSystemABI.abi;
      const strategyExecutorAbi = Array.isArray(StrategyExecutorABI)
        ? StrategyExecutorABI
        : StrategyExecutorABI.abi;

      const pmmsInstance = new ethers.Contract(PMMS_ADDRESS, pmmsAbi, signer);
      const strategyExecutorInstance = new ethers.Contract(
        STRATEGY_EXECUTOR_ADDRESS,
        strategyExecutorAbi,
        signer
      );
      const registryInstance = new ethers.Contract(
        REGISTRY_ADDRESS,
        strategyExecutorAbi, // Assuming similar functionality
        signer
      );

      setProvider(provider);
      setSigner(signer);
      setPmmsContract(pmmsInstance);
      setStrategyExecutorContract(strategyExecutorInstance);
      setRegistryContract(registryInstance);
      setAccount(accounts[0]);
      setIsConnected(true);
      setError(null);
    } catch (err) {
      setError('Failed to connect wallet: ' + err.message);
      console.error('Connect wallet error:', err);
    }
  };

  const switchToSkaleNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SKALE_CHAIN_ID }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: SKALE_CHAIN_ID,
              chainName: 'SKALE Testnet (Juicy Low Small)',
              rpcUrls: [SKALE_TESTNET_RPC],
              nativeCurrency: {
                name: 'sFUEL',
                symbol: 'sFUEL',
                decimals: 18,
              },
              blockExplorerUrls: ['https://juicy-low-small-testnet.explorer.testnet.skalenodes.com'],
            },
          ],
        });
      } else {
        setError('Failed to switch to SKALE network: ' + switchError.message);
      }
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0] || null);
        setIsConnected(!!accounts[0]);
      });
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  return {
    provider,
    signer,
    contract: strategyExecutorContract,
    pmmsContract,
    registryContract,
    account,
    isConnected,
    error,
    connectWallet,
    switchToSkaleNetwork,
  };
};