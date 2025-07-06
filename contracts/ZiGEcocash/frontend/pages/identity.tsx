import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '../lib/contracts';
import { useNotification } from '../components/Notification';
import { LoadingSpinner } from '../components/LoadingSpinner';

// Network configuration for Polygon zkEVM
const NETWORK_CONFIG = {
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

export default function Identity() {
  const notify = useNotification();
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [identityData, setIdentityData] = useState({
    soulboundBalance: '0',
    isVerified: false,
    tribe: '',
    diaspora: false,
    hasSoulReparationNFT: false
  });
  const [loading, setLoading] = useState(false);

  // Switch to correct network
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

  // Connect wallet function
  const connectWallet = async () => {
    try {
      if (!(window as any).ethereum) {
        notify('MetaMask not installed', 'error');
        return;
      }

      // Switch to correct network first
      await switchToZkEVM();

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      
      setProvider(provider);
      setSigner(signer);
      setAddress(accounts[0]);
      setIsConnected(true);
      
      notify('Wallet connected successfully', 'success');
    } catch (error: any) {
      notify(`Failed to connect wallet: ${error.message}`, 'error');
    }
  };

  // Fetch identity data
  useEffect(() => {
    async function fetchIdentityData() {
      if (!isConnected || !address || !provider) return;
      
      setLoading(true);
      try {
        // Fetch soulbound token balance
        const soulboundContract = new ethers.Contract(
          CONTRACTS.ZiGSoulboundToken.address,
          CONTRACTS.ZiGSoulboundToken.abi,
          provider
        );

        const soulboundBalance = await soulboundContract.balanceOf(address);
        
        // Check if user has soul reparation NFT
        const soulReparationContract = new ethers.Contract(
          CONTRACTS.SoulReparationNFT.address,
          CONTRACTS.SoulReparationNFT.abi,
          provider
        );

        const soulReparationBalance = await soulReparationContract.balanceOf(address);
        
        // Check verification status (this would be from AccessVerifier contract)
        const accessVerifierContract = new ethers.Contract(
          CONTRACTS.AccessVerifier.address,
          CONTRACTS.AccessVerifier.abi,
          provider
        );

        let isVerified = false;
        let tribe = '';
        let diaspora = false;

        try {
          // This would be actual verification logic
          isVerified = soulboundBalance > 0;
          tribe = 'Shona'; // This would come from the contract
          diaspora = true; // This would come from the contract
        } catch (e) {
          console.error('Failed to fetch verification data:', e);
        }

        setIdentityData({
          soulboundBalance: ethers.formatUnits(soulboundBalance, CONTRACTS.ZiGSoulboundToken.decimals),
          isVerified,
          tribe,
          diaspora,
          hasSoulReparationNFT: soulReparationBalance > 0
        });
      } catch (e: any) {
        console.error('Failed to fetch identity data:', e);
        notify('Failed to fetch identity data', 'error');
      } finally {
        setLoading(false);
      }
    }
    
    fetchIdentityData();
  }, [isConnected, address, provider, notify]);

  // Check initial connection
  useEffect(() => {
    const checkConnection = async () => {
      if ((window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const accounts = await provider.send('eth_accounts', []);
          if (accounts.length > 0) {
            const signer = await provider.getSigner();
            setProvider(provider);
            setSigner(signer);
            setAddress(accounts[0]);
            setIsConnected(true);
          }
        } catch (err) {
          console.error('Initial connection check failed:', err);
        }
      }
    };

    checkConnection();
  }, []);

  return (
    <div className="min-h-screen bg-panAfrican-black text-white">
      {/* Header */}
      <div className="bg-panAfrican-green p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold">Identity & Verification</div>
          <button
            onClick={connectWallet}
            className={`px-6 py-2 rounded-lg font-bold transition-colors ${
              isConnected 
                ? 'bg-panAfrican-gold text-black' 
                : 'bg-panAfrican-crimson text-white hover:bg-red-700'
            }`}
          >
            {isConnected ? `Connected: ${address.slice(0, 6)}...${address.slice(-4)}` : 'Connect Wallet'}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center p-8">
        <div className="w-full max-w-xl bg-panAfrican-green rounded-xl p-6 flex flex-col gap-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-panAfrican-crimson flex items-center justify-center">
              <span className="text-4xl">🧑🏾‍🦱</span>
            </div>
            <div>
              <div className="text-xl font-serif font-bold">ZiGSoulboundToken</div>
              <div className="flex items-center gap-2 text-green-400 font-semibold">
                <span>{identityData.isVerified ? 'Verified' : 'Unverified'}</span>
                <span className={`w-3 h-3 rounded-full inline-block ${identityData.isVerified ? 'bg-green-400' : 'bg-red-400'}`}></span>
              </div>
            </div>
          </div>
          
          {isConnected && (
            <>
              <div className="mt-4">
                <div className="font-bold">Soulbound Token Balance:</div>
                <div className="text-lg">
                  {loading ? <LoadingSpinner size="sm" /> : `${identityData.soulboundBalance} SBT`}
                </div>
              </div>
              
              <div className="mt-4">
                <div className="font-bold">AccessVerifier Status:</div>
                <div className="text-green-300">
                  {loading ? <LoadingSpinner size="sm" /> : 
                    identityData.isVerified 
                      ? `Eligible (Tribe: ${identityData.tribe}, Diaspora: ${identityData.diaspora ? 'Yes' : 'No'})`
                      : 'Not eligible for reparations'
                  }
                </div>
              </div>
              
              <div className="mt-4">
                <div className="font-bold">SoulReparationNFT Status:</div>
                <div className="text-sm">
                  {loading ? <LoadingSpinner size="sm" /> : 
                    identityData.hasSoulReparationNFT 
                      ? '✅ Already claimed'
                      : '❌ Not claimed yet. The DAO will issue your NFT when you are eligible.'
                  }
                </div>
              </div>
            </>
          )}
          
          {!isConnected && (
            <div className="text-center mt-4 text-gray-400">
              Connect your wallet to view your identity
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 