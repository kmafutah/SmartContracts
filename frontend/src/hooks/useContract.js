import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import ProfitMaximizerModularSystemABI from '../abi/ProfitMaximizerModularSystem.json';

const CONTRACT_ADDRESS = '0xf1d4fe115BE39c2c71b54256cC657b4496d36A65'; // New PMMS address
const SKALE_TESTNET_RPC = 'https://juicy-low-small-testnet-rpc.testnet.skalenodes.com';

export const useContract = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
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

      // Extract ABI from Hardhat artifact
      let abi;
      if (Array.isArray(ProfitMaximizerModularSystemABI)) {
        abi = ProfitMaximizerModularSystemABI;
      } else if (ProfitMaximizerModularSystemABI && Array.isArray(ProfitMaximizerModularSystemABI.abi)) {
        abi = ProfitMaximizerModularSystemABI.abi;
      } else {
        throw new Error('Invalid ABI format: Expected an array or object with an "abi" array');
      }

      console.log('ABI loaded:', abi); // Debug

      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        abi,
        signer
      );

      setProvider(provider);
      setSigner(signer);
      setContract(contractInstance);
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
        params: [{ chainId: '0x' + (1500292005).toString(16) }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x' + (1500292005).toString(16),
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

  return { provider, signer, contract, account, isConnected, error, connectWallet, switchToSkaleNetwork };
};