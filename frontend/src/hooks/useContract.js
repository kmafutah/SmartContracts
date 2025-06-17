import { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';

// ======================
// POLYGON zkEVM CONFIG
// ======================
const ZKEVM_CONFIG = {
  chainId: '0x44d', // 1101 in hex
  chainName: 'Polygon zkEVM',
  rpcUrl: 'https://zkevm-rpc.com',
  explorerUrl: 'https://zkevm.polygonscan.com/',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  }
};

// ======================
// COMPLETE CONTRACT REGISTRY 
// ======================
const CONTRACT_REGISTRY = {
  // Oracle Infrastructure
  FeedRegistry: '0x7742A367bAd12692DA1562b8593B31e3090b9195',
  BandFeedRegistry: '0x0920069E3F7C7d7701291ba97A80006cEB3d8870',
  LiveBandFeed: '0x6C7a137866e2d30F94904c4a6b7A89B4e2959619',
  OracleHub: '0x76C5FE327c0baE388cb8A1627651e375a336de56',
  MultiOracle: '0xEA41ADD3B34584eb7f21af42C06Ae65db984b4B6',

  // Core ZiGT System
  MainZiGT: '0x53366809039cA832E5250FfE335B4B19e7ED16C6',
  SubZiGT: '0x7231F9C31E18091A72Ce4b113AcF94336109b0ad',
  ZiGTToken: '0x73828Dbbb453E9D0191b9976e9ED292885f7c1F4',
  ReparationsModel: '0xcc2618af8859751Ee041e9c67aCC5d8A10Bf38A4',

  // Governance
  GovernanceToken: '0x45B2BFd37Ef0Ae09787D97fA622E265E9495516A',
  ZiGGovernance: '0x5f773AC6957d8B5C19780d0F2753539Bccff61FA',
  ReparationsDAO: '0x104676EB589e1511E4e6525553282C11AEA1c251',
  AccessVerifier: '0x98e4985766FC4f80BC02644AadFb8eAE963795CB',

  // Vaults & Treasury
  RedistributionVault: '0xCA4aCCbBc9813052139832510a58f721274B3866',

  // Specialized Tokens
  ZiGRWAToken: '0xD3b721bC80541Fb3c4466de4de70593167A8FC01',
  ZiGUtilityToken: '0x067b911705cf2edC3ae94bdc9691b72B73FFE5c3',
  ZiGMemeToken: '0xaba849b19D983EcA2804B9072574AAB02056e526',
  
  // NFT Contracts
  ZiGNFT: '0x9d541c3852A607C30e78bB34dc5Cd4D4E9fc318e',
  ZiGSoulboundToken: '0xAbe238E078b428D2CCf68B303D6a61909AfA9d1C',
  SoulReparationNFT: '0x4D4aED6E1b5c4fce60a3006E4C8C3b3Cccf56755',
  ZiGGameFiToken: '0x8fbBfAc5Ac0850D0F2D49d8fBa352e513D0797F4',

  // Regional/Zonal Contracts
  ZiG_RG: '0x231c247f7Aa5c1490C8a69650EbF82b77bF9DD3e',
  ZiG_KB: '0xF428f2dB0c49AdDA443D97EA7462C0FD334ca6D5',
  ZiG_UB: '0xc14DB46aB89C36ccF1E307d3fAfdF417f914aE5C',
  ZiG_SF: '0x6C61585c7D4E8CaBCC25A812C94e7075348B1fe4',
  ZiG_PC: '0x0D393d21b5e26745593460CD58464BFb5fC72Bc7',
  ZiG_MG: '0xdcF7458e6af880933E22dbe3E5DDfcfd4DC6121f',
  ZiG_SH: '0x50df43944f7F9d570b866C96C9C5848CFF406162',
  ZiG_CD: '0x2B2E0E1F73FCbBc3b8925d01Cce5DB82a0C041C1',
  ZiG_KU: '0x41e2834863250955f380aa396cF0817b94AA4164',
  ZiG_KD: '0xf0916A628fB9500EA693A36F34242621773039fC'
};

// ======================
// MAIN HOOK IMPLEMENTATION
// ======================
export const useContract = () => {
  const [state, setState] = useState({
    provider: null,
    signer: null,
    account: null,
    error: null,
    isConnected: false,
    chainId: null
  });

  const [contracts, setContracts] = useState({});

  // Initialize contracts
  useEffect(() => {
    if (!state.signer) return;

    const loadContracts = async () => {
      const loadedContracts = {};
      
      for (const [name, address] of Object.entries(CONTRACT_REGISTRY)) {
        try {
          loadedContracts[name] = new ethers.Contract(
            address,
            require(`@/abis/${name}.json`), // Dynamic ABI import
            state.signer
          );
        } catch (err) {
          console.error(`Contract ${name} init error:`, err);
          setState(prev => ({ ...prev, error: `Failed to load ${name} contract` }));
        }
      }

      setContracts(loadedContracts);
    };

    loadContracts();
  }, [state.signer]);

  // Connection manager
  const connectWallet = async () => {
    try {
      if (!window.ethereum) throw new Error('MetaMask not installed');

      // Network check
      await verifyNetwork();

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      setState({
        provider,
        signer,
        account: accounts[0],
        isConnected: true,
        chainId: network.chainId,
        error: null
      });

      setupEventListeners(provider);
    } catch (err) {
      setState(prev => ({ ...prev, error: err.message }));
      console.error('Connection error:', err);
    }
  };

  // Network verification
  const verifyNetwork = async () => {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== ZKEVM_CONFIG.chainId) {
        await switchToZkEVM();
      }
    } catch (err) {
      throw new Error(`Network error: ${err.message}`);
    }
  };

  // Network switching
  const switchToZkEVM = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ZKEVM_CONFIG.chainId }]
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: ZKEVM_CONFIG.chainId,
              chainName: ZKEVM_CONFIG.chainName,
              nativeCurrency: ZKEVM_CONFIG.nativeCurrency,
              rpcUrls: [ZKEVM_CONFIG.rpcUrl],
              blockExplorerUrls: [ZKEVM_CONFIG.explorerUrl]
            }]
          });
        } catch (addError) {
          throw new Error('Failed to add Polygon zkEVM network');
        }
      } else {
        throw new Error('Failed to switch to Polygon zkEVM');
      }
    }
  };

  // Event listeners setup
  const setupEventListeners = (provider) => {
    window.ethereum.on('accountsChanged', async (accounts) => {
      const signer = await provider.getSigner();
      setState(prev => ({
        ...prev,
        account: accounts[0] || null,
        isConnected: !!accounts[0],
        signer
      }));
    });

    window.ethereum.on('chainChanged', async (chainId) => {
      window.location.reload();
    });
  };

  // Initial connection check
  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.send('eth_accounts', []);
          if (accounts.length > 0) {
            const signer = await provider.getSigner();
            const network = await provider.getNetwork();
            
            setState({
              provider,
              signer,
              account: accounts[0],
              isConnected: true,
              chainId: network.chainId,
              error: null
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
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  // Memoized contract getter
  const getContract = useMemo(() => {
    return (contractName) => {
      if (!contracts[contractName]) {
        throw new Error(`Contract ${contractName} not loaded`);
      }
      return contracts[contractName];
    };
  }, [contracts]);

  return {
    ...state,
    connectWallet,
    getContract,
    contracts, // Direct access to all initialized contracts
    isOnCorrectNetwork: state.chainId === parseInt(ZKEVM_CONFIG.chainId, 16)
  };
};