import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import ProfitMaximizerModularSystemABI from '../abi/ProfitMaximizerModularSystem.json';
import StrategyExecutorABI from '../abi/StrategyExecutor.json';
import RegistryABI from '../abi/Registry.json';
import ZiGTABI from '../abi/ZiGT.json';
import ReparationsModelABI from '../abi/ReparationsModel.json';

const PMMS_ADDRESS = '0x5e1BBe9c436c8D33Ef87E489b6Cc391B48a6DEbE';
const STRATEGY_EXECUTOR_ADDRESS = '0xBcDdF9aaDcF13603317220B89165b02f51E7607b';
const REGISTRY_ADDRESS = '0xCCBF4c54915B58e8dC5Dd6B0fe178467698A3a3C';
const ZIGT_ADDRESS = '0x5373E7FB40638Db965C85902e52FAf6Ec1A32f9d';
const REPARATIONS_MODEL_ADDRESS = '0xF65fE3147881D4CcdF7e21FD022502de3812EfCd';

const SKALE_TESTNET_RPC = 'https://testnet.skalenodes.com/v1/juicy-low-small-testnet';
const SKALE_CHAIN_ID = '0x5f6d';

export const useContract = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [pmmsContract, setPmmsContract] = useState(null);
  const [strategyExecutorContract, setStrategyExecutorContract] = useState(null);
  const [registryContract, setRegistryContract] = useState(null);
  const [zigtContract, setZigtContract] = useState(null);
  const [reparationsContract, setReparationsContract] = useState(null);
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

      // Initialize all contracts
      const pmmsInstance = new ethers.Contract(
        PMMS_ADDRESS,
        Array.isArray(ProfitMaximizerModularSystemABI)
          ? ProfitMaximizerModularSystemABI
          : ProfitMaximizerModularSystemABI.abi,
        signer
      );

      const strategyExecutorInstance = new ethers.Contract(
        STRATEGY_EXECUTOR_ADDRESS,
        Array.isArray(StrategyExecutorABI)
          ? StrategyExecutorABI
          : StrategyExecutorABI.abi,
        signer
      );

      const registryInstance = new ethers.Contract(
        REGISTRY_ADDRESS,
        Array.isArray(RegistryABI)
          ? RegistryABI
          : RegistryABI.abi,
        signer
      );

      const zigtInstance = new ethers.Contract(
        ZIGT_ADDRESS,
        Array.isArray(ZiGTABI)
          ? ZiGTABI
          : ZiGTABI.abi,
        signer
      );

      const reparationsInstance = new ethers.Contract(
        REPARATIONS_MODEL_ADDRESS,
        Array.isArray(ReparationsModelABI)
          ? ReparationsModelABI
          : ReparationsModelABI.abi,
        signer
      );

      setProvider(provider);
      setSigner(signer);
      setPmmsContract(pmmsInstance);
      setStrategyExecutorContract(strategyExecutorInstance);
      setRegistryContract(registryInstance);
      setZigtContract(zigtInstance);
      setReparationsContract(reparationsInstance);
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
        try {
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
        } catch (addError) {
          setError('Failed to add SKALE network: ' + addError.message);
        }
      } else {
        setError('Failed to switch to SKALE network: ' + switchError.message);
      }
    }
  };

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.send('eth_accounts', []);
          if (accounts.length > 0) {
            const signer = await provider.getSigner();

            // Initialize contracts with existing connection
            const pmmsInstance = new ethers.Contract(
              PMMS_ADDRESS,
              Array.isArray(ProfitMaximizerModularSystemABI)
                ? ProfitMaximizerModularSystemABI
                : ProfitMaximizerModularSystemABI.abi,
              signer
            );
            const strategyExecutorInstance = new ethers.Contract(
              STRATEGY_EXECUTOR_ADDRESS,
              Array.isArray(StrategyExecutorABI)
                ? StrategyExecutorABI
                : StrategyExecutorABI.abi,
              signer
            );
            const registryInstance = new ethers.Contract(
              REGISTRY_ADDRESS,
              Array.isArray(RegistryABI)
                ? RegistryABI
                : RegistryABI.abi,
              signer
            );
            const zigtInstance = new ethers.Contract(
              ZIGT_ADDRESS,
              Array.isArray(ZiGTABI)
                ? ZiGTABI
                : ZiGTABI.abi,
              signer
            );
            const reparationsInstance = new ethers.Contract(
              REPARATIONS_MODEL_ADDRESS,
              Array.isArray(ReparationsModelABI)
                ? ReparationsModelABI
                : ReparationsModelABI.abi,
              signer
            );

            setProvider(provider);
            setSigner(signer);
            setPmmsContract(pmmsInstance);
            setStrategyExecutorContract(strategyExecutorInstance);
            setRegistryContract(registryInstance);
            setZigtContract(zigtInstance);
            setReparationsContract(reparationsInstance);
            setAccount(accounts[0]);
            setIsConnected(true);
          }
        } catch (err) {
          console.error('Error checking connection:', err);
          setError('Error checking connection: ' + err.message);
        }
      }
    };

    // Define listener functions
    const handleAccountsChanged = (accounts) => {
      setAccount(accounts[0] || null);
      setIsConnected(!!accounts[0]);
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    // Attach listeners
    if (window.ethereum) {
      checkConnection();
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    // Cleanup
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  return {
    provider,
    signer,
    contract: strategyExecutorContract,
    pmmsContract,
    registryContract,
    zigtContract,
    reparationsContract,
    account,
    isConnected,
    error,
    connectWallet,
    switchToSkaleNetwork,
  };
};