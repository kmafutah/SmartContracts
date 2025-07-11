import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ethers } from 'ethers';
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

export default function Home() {
  const router = useRouter();
  const notify = useNotification();
  const { isConnected, account, connectWallet, isConnecting } = useWallet();

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

  // On successful connection, redirect to dashboard
  useEffect(() => {
    if (isConnected && account) {
      router.push('/dashboard');
    }
  }, [isConnected, account, router]);

  return (
    <div className="min-h-screen bg-panAfrican-black text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-panAfrican-green/20 to-panAfrican-crimson/20"></div>
        
        {/* Navigation */}
        <nav className="relative z-10 flex justify-between items-center p-6">
          <div className="text-2xl font-bold">ZiGVerse</div>
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className={`px-6 py-2 rounded-lg font-bold transition-colors ${
              isConnected 
                ? 'bg-panAfrican-gold text-black' 
                : 'bg-panAfrican-crimson text-white hover:bg-red-700 disabled:opacity-50'
            }`}
          >
            {isConnecting ? <LoadingSpinner size="sm" /> : 
              isConnected ? `Connected: ${account?.slice(0, 6)}...${account?.slice(-4)}` : 'Connect Wallet'
            }
          </button>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
          <h1 className="text-6xl md:text-8xl font-bold mb-6">
            Welcome to <span className="text-panAfrican-gold">ZiGVerse</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl">
            A comprehensive blockchain ecosystem for economic empowerment and cultural preservation
          </p>
          
          {!isConnected && (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="bg-panAfrican-gold text-black px-8 py-4 rounded-lg text-xl font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50"
            >
              {isConnecting ? <LoadingSpinner size="md" color="gold" /> : 'Enter ZiGVerse'}
            </button>
          )}

          {isConnected && (
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-panAfrican-gold text-black px-6 py-3 rounded-lg font-bold hover:bg-yellow-400 transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => router.push('/tokens')}
                className="bg-panAfrican-green text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors"
              >
                View Tokens
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">ZiGVerse Ecosystem</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Economic Core */}
            <div className="bg-panAfrican-black rounded-xl p-6 shadow-lg">
              <div className="text-3xl mb-4">💰</div>
              <h3 className="text-xl font-bold mb-2">Economic Core</h3>
              <p className="text-gray-400">ZiG and ZiGT tokens for stable economic transactions</p>
            </div>

            {/* Governance */}
            <div className="bg-panAfrican-black rounded-xl p-6 shadow-lg">
              <div className="text-3xl mb-4">🏛️</div>
              <h3 className="text-xl font-bold mb-2">Governance</h3>
              <p className="text-gray-400">DAO governance and voting rights for community decisions</p>
            </div>

            {/* Identity */}
            <div className="bg-panAfrican-black rounded-xl p-6 shadow-lg">
              <div className="text-3xl mb-4">🆔</div>
              <h3 className="text-xl font-bold mb-2">Identity</h3>
              <p className="text-gray-400">Soulbound tokens and NFT identity verification</p>
            </div>

            {/* Vault */}
            <div className="bg-panAfrican-black rounded-xl p-6 shadow-lg">
              <div className="text-3xl mb-4">🏦</div>
              <h3 className="text-xl font-bold mb-2">Vault</h3>
              <p className="text-gray-400">Secure token storage and redistribution mechanisms</p>
            </div>

            {/* Oracles */}
            <div className="bg-panAfrican-black rounded-xl p-6 shadow-lg">
              <div className="text-3xl mb-4">🔮</div>
              <h3 className="text-xl font-bold mb-2">Oracles</h3>
              <p className="text-gray-400">Real-time price feeds and market data</p>
            </div>

            {/* NFTs */}
            <div className="bg-panAfrican-black rounded-xl p-6 shadow-lg">
              <div className="text-3xl mb-4">🎨</div>
              <h3 className="text-xl font-bold mb-2">NFTs</h3>
              <p className="text-gray-400">Cultural artifacts and digital collectibles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-panAfrican-green text-black py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-lg font-bold mb-2">ZiGVerse</p>
          <p className="text-sm">Empowering communities through blockchain technology</p>
        </div>
      </footer>
    </div>
  );
} 