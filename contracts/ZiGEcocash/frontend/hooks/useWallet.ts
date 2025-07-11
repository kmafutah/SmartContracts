import { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '../lib/contracts';
import { getCurrentNetwork } from '../lib/networks';

// Network configuration
const NETWORK_CONFIG = {
  chainId: '0x44d', // 1101 in hex for Polygon zkEVM
  chainName: 'Polygon zkEVM',
  rpcUrl: 'https://zkevm-rpc.com',
  explorerUrl: 'https://zkevm.polygonscan.com/',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  }
};

export const useWallet = () => {
  const [state, setState] = useState({
    provider: null as ethers.BrowserProvider | null,
    signer: null as ethers.JsonRpcSigner | null,
    account: null as string | null,
    error: null as string | null,
    isConnected: false,
    chainId: null as number | null,
    isConnecting: false
  });

  const [contracts, setContracts] = useState<Record<string, ethers.Contract>>({});
  const [balances, setBalances] = useState<Record<string, string>>({});

  // Initialize contracts when signer is available
  useEffect(() => {
    if (!state.signer) return;

    const loadContracts = async () => {
      const loadedContracts: Record<string, ethers.Contract> = {};
      
      for (const [name, contractConfig] of Object.entries(CONTRACTS)) {
        if (contractConfig.abi && contractConfig.abi.length > 0) {
          try {
            loadedContracts[name] = new ethers.Contract(
              contractConfig.address,
              contractConfig.abi,
              state.signer
            );
          } catch (err) {
            console.error(`Contract ${name} init error:`, err);
          }
        }
      }

      setContracts(loadedContracts);
    };

    loadContracts();
  }, [state.signer]);

  // Load balances when contracts and account are available
  useEffect(() => {
    if (!state.account || Object.keys(contracts).length === 0) return;

    const loadBalances = async () => {
      const newBalances: Record<string, string> = {};
      
      for (const [name, contract] of Object.entries(contracts)) {
        try {
          const contractConfig = CONTRACTS[name as keyof typeof CONTRACTS];
          if (!contractConfig || !contractConfig.address || contractConfig.address === null || contractConfig.address === undefined) {
            continue; // Skip if address is missing
          }
          if (contractConfig.decimals !== undefined) {
            // Only call balanceOf for known token contracts
            // ERC20/ERC721: balanceOf(address), ERC1155: balanceOf(address, id)
            if (name === 'ZiGUtilityToken') {
              // ERC1155: fetch balances for IDs 0, 1, 2, 3
              const ids = [0, 1, 2, 3];
              const balancesObj: Record<string, string> = {};
              for (const id of ids) {
                const balance = await contract.balanceOf(state.account, id);
                const decimals = contractConfig.decimals;
                balancesObj[id] = ethers.formatUnits(balance, decimals);
              }
              newBalances[name] = balancesObj;
            } else if (
              name === 'ZiG' ||
              name === 'ZiGT' ||
              name === 'ZiGGovernanceToken' ||
              name === 'ZiGMemeToken' ||
              name === 'ZiGRWAToken' ||
              name === 'ZiGGameFiToken' ||
              name === 'ZiGNFT' ||
              name === 'SoulReparationNFT' ||
              name === 'ZiGSoulboundToken'
            ) {
              // ERC20/ERC721: balanceOf(address)
              const balance = await contract.balanceOf(state.account);
              const decimals = contractConfig.decimals;
              newBalances[name] = ethers.formatUnits(balance, decimals);
            } else {
              // Skip contracts that do not have balanceOf
              continue;
            }
          }
        } catch (err) {
          console.error(`Failed to load balance for ${name}:`, err);
          newBalances[name] = '0';
        }
      }

      setBalances(newBalances);
    };

    loadBalances();
  }, [state.account, contracts]);

  // Connect wallet
  const connectWallet = async () => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, error: null }));

      if (!(window as any).ethereum) {
        throw new Error('MetaMask not installed');
      }

      // Verify network
      await verifyNetwork();

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      setState({
        provider,
        signer,
        account: accounts[0],
        isConnected: true,
        chainId: Number(network.chainId),
        error: null,
        isConnecting: false
      });

      setupEventListeners(provider);
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        error: err.message || 'Failed to connect wallet',
        isConnecting: false 
      }));
      console.error('Connection error:', err);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setState({
      provider: null,
      signer: null,
      account: null,
      error: null,
      isConnected: false,
      chainId: null,
      isConnecting: false
    });
    setContracts({});
    setBalances({});
  };

  // Verify network
  const verifyNetwork = async () => {
    try {
      const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
      if (chainId !== NETWORK_CONFIG.chainId) {
        await switchToZkEVM();
      }
    } catch (err: any) {
      throw new Error(`Network error: ${err.message}`);
    }
  };

  // Switch to zkEVM network
  const switchToZkEVM = async () => {
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NETWORK_CONFIG.chainId }]
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: NETWORK_CONFIG.chainId,
              chainName: NETWORK_CONFIG.chainName,
              nativeCurrency: NETWORK_CONFIG.nativeCurrency,
              rpcUrls: [NETWORK_CONFIG.rpcUrl],
              blockExplorerUrls: [NETWORK_CONFIG.explorerUrl]
            }]
          });
        } catch (addError: any) {
          throw new Error('Failed to add Polygon zkEVM network');
        }
      } else {
        throw new Error('Failed to switch to Polygon zkEVM');
      }
    }
  };

  // Setup event listeners
  const setupEventListeners = (provider: ethers.BrowserProvider) => {
    (window as any).ethereum.on('accountsChanged', async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        const signer = await provider.getSigner();
        setState(prev => ({
          ...prev,
          account: accounts[0],
          isConnected: true,
          signer
        }));
      }
    });

    (window as any).ethereum.on('chainChanged', async (chainId: string) => {
      window.location.reload();
    });
  };

  // Check initial connection
  useEffect(() => {
    const init = async () => {
      if ((window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const accounts = await provider.send('eth_accounts', []);
          if (accounts.length > 0) {
            const signer = await provider.getSigner();
            const network = await provider.getNetwork();
            
            setState({
              provider,
              signer,
              account: accounts[0],
              isConnected: true,
              chainId: Number(network.chainId),
              error: null,
              isConnecting: false
            });
          }
        } catch (err) {
          console.error('Initial connection check failed:', err);
        }
      }
    };

    init();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if ((window as any).ethereum) {
        (window as any).ethereum.removeAllListeners('accountsChanged');
        (window as any).ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  // Get contract instance
  const getContract = useMemo(() => {
    return (contractName: string) => {
      if (!contracts[contractName]) {
        throw new Error(`Contract ${contractName} not loaded`);
      }
      return contracts[contractName];
    };
  }, [contracts]);

  return {
    ...state,
    connectWallet,
    disconnectWallet,
    getContract,
    contracts,
    balances,
    isOnCorrectNetwork: state.chainId === parseInt(NETWORK_CONFIG.chainId, 16)
  };
}; 