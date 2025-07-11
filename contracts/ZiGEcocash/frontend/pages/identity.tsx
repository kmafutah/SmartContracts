import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '../lib/contracts';
import { useNotification } from '../components/Notification';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useWallet } from '../hooks/useWallet';

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
  const { isConnected, account, provider, signer, contracts, connectWallet } = useWallet();
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

  // Fetch identity data
  useEffect(() => {
    async function fetchIdentityData() {
      if (!isConnected || !account || !provider) return;
      
      setLoading(true);
      try {
        // Fetch soulbound token balance
        const soulboundContract = new ethers.Contract(
          contracts.ZiGSoulboundToken.address,
          contracts.ZiGSoulboundToken.abi,
          provider
        );

        const soulboundBalance = await soulboundContract.balanceOf(account);
        
        // Check if user has soul reparation NFT
        const soulReparationContract = new ethers.Contract(
          contracts.SoulReparationNFT.address,
          contracts.SoulReparationNFT.abi,
          provider
        );

        const soulReparationBalance = await soulReparationContract.balanceOf(account);
        
        // Check verification status (this would be from AccessVerifier contract)
        const accessVerifierContract = new ethers.Contract(
          contracts.AccessVerifier.address,
          contracts.AccessVerifier.abi,
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
          soulboundBalance: ethers.formatUnits(soulboundBalance, contracts.ZiGSoulboundToken.decimals),
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
  }, [isConnected, account, provider, contracts, notify]);

  // Check initial connection
  useEffect(() => {
    const checkConnection = async () => {
      if ((window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const accounts = await provider.send('eth_accounts', []);
          if (accounts.length > 0) {
            const signer = await provider.getSigner();
            // setProvider(provider); // This line is removed as per new_code
            // setSigner(signer); // This line is removed as per new_code
            // setAddress(accounts[0]); // This line is removed as per new_code
            // setIsConnected(true); // This line is removed as per new_code
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
            {isConnected ? `Connected: ${account?.slice(0, 6)}...${account?.slice(-4)}` : 'Connect Wallet'}
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