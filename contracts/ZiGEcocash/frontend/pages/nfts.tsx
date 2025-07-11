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

export default function NFTs() {
  const notify = useNotification();
  const { isConnected, account, provider, signer, contracts, connectWallet } = useWallet();
  const [nftData, setNftData] = useState<{
    soulReparationNFTs: Array<{ tokenId: string; tokenURI: string }>;
    ziGNFTs: Array<{ tokenId: string; tokenURI: string }>;
  }>({
    soulReparationNFTs: [],
    ziGNFTs: []
  });
  const [loading, setLoading] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<any>(null);

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

  // Fetch NFT data
  useEffect(() => {
    async function fetchNFTData() {
      if (!isConnected || !account || !provider) return;
      if (!contracts.SoulReparationNFT || !contracts.ZiGNFT) {
        notify('NFT contract not loaded. Please check your network or contract deployment.', 'error');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Fetch SoulReparationNFTs
        const soulReparationContract = new ethers.Contract(
          contracts.SoulReparationNFT.address,
          contracts.SoulReparationNFT.abi,
          provider
        );

        const soulReparationBalance = await soulReparationContract.balanceOf(account);
        const soulReparationNFTs = [];
        
        for (let i = 0; i < soulReparationBalance; i++) {
          try {
            const tokenId = await soulReparationContract.tokenOfOwnerByIndex(account, i);
            const tokenURI = await soulReparationContract.tokenURI(tokenId);
            soulReparationNFTs.push({ tokenId: tokenId.toString(), tokenURI });
          } catch (e) {
            console.error('Failed to fetch SoulReparationNFT:', e);
          }
        }

        // Fetch ZiGNFTs
        const ziGNFTContract = new ethers.Contract(
          contracts.ZiGNFT.address,
          contracts.ZiGNFT.abi,
          provider
        );

        const ziGNFTBalance = await ziGNFTContract.balanceOf(account);
        const ziGNFTs = [];
        
        for (let i = 0; i < ziGNFTBalance; i++) {
          try {
            const tokenId = await ziGNFTContract.tokenOfOwnerByIndex(account, i);
            const tokenURI = await ziGNFTContract.tokenURI(tokenId);
            ziGNFTs.push({ tokenId: tokenId.toString(), tokenURI });
          } catch (e) {
            console.error('Failed to fetch ZiGNFT:', e);
          }
        }

        setNftData({
          soulReparationNFTs,
          ziGNFTs
        });
      } catch (e: any) {
        console.error('Failed to fetch NFT data:', e);
        notify('Failed to fetch NFT data', 'error');
      } finally {
        setLoading(false);
      }
    }
    
    fetchNFTData();
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
            // This part of the useWallet hook manages the state, so we don't need to set it here.
            // setProvider(provider);
            // setSigner(signer);
            // setAddress(accounts[0]);
            // setIsConnected(true);
          }
        } catch (err) {
          console.error('Initial connection check failed:', err);
        }
      }
    };

    checkConnection();
  }, []);

  const viewNFT = (nft: any, type: string) => {
    setSelectedNFT({ ...nft, type });
  };

  return (
    <div className="min-h-screen bg-panAfrican-black text-white">
      {/* Header */}
      <div className="bg-panAfrican-green p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold">NFT Gallery</div>
          <button
            onClick={connectWallet}
            className={`px-6 py-2 rounded-lg font-bold transition-colors ${
              isConnected 
                ? 'bg-panAfrican-gold text-black' 
                : 'bg-panAfrican-crimson text-white hover:bg-red-700'
            }`}
          >
            {isConnected ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect Wallet'}
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="font-bold text-2xl mb-6">NFT Gallery</div>
          
          {isConnected && (
            <div className="mb-6 bg-panAfrican-green rounded-xl p-4">
              <div className="text-lg font-bold mb-2">Your NFT Collection</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>SoulReparationNFTs: {loading ? <LoadingSpinner size="sm" /> : nftData.soulReparationNFTs.length}</div>
                <div>ZiGNFTs: {loading ? <LoadingSpinner size="sm" /> : nftData.ziGNFTs.length}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NFTCard 
              label="SoulReparationNFT" 
              desc="Your soulbound reparation NFT. Non-transferable." 
              nfts={nftData.soulReparationNFTs}
              loading={loading}
              onView={(nft) => viewNFT(nft, 'SoulReparationNFT')}
            />
            <NFTCard 
              label="ZiGNFT" 
              desc="Collectible NFT series. Cultural significance." 
              nfts={nftData.ziGNFTs}
              loading={loading}
              onView={(nft) => viewNFT(nft, 'ZiGNFT')}
            />
          </div>
          
          <div className="mt-8 bg-panAfrican-green rounded-xl p-6 shadow-lg">
            <div className="font-bold mb-2">Metadata Viewer</div>
            {selectedNFT ? (
              <div className="text-sm text-gray-200">
                <div><strong>Type:</strong> {selectedNFT.type}</div>
                <div><strong>Token ID:</strong> {selectedNFT.tokenId}</div>
                <div><strong>Token URI:</strong> {selectedNFT.tokenURI}</div>
              </div>
            ) : (
              <div className="text-sm text-gray-200">Select an NFT to view its metadata here.</div>
            )}
          </div>
          
          {!isConnected && (
            <div className="text-center mt-8 text-gray-400">
              Connect your wallet to view your NFTs
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NFTCard({ label, desc, nfts, loading, onView }: { 
  label: string; 
  desc: string; 
  nfts: Array<{ tokenId: string; tokenURI: string }>;
  loading: boolean;
  onView: (nft: { tokenId: string; tokenURI: string }) => void;
}) {
  return (
    <div className="bg-panAfrican-green rounded-xl p-6 shadow-lg flex flex-col gap-2">
      <div className="font-bold text-lg">{label}</div>
      <div className="text-sm opacity-80">{desc}</div>
      <div className="text-sm mb-2">
        Count: {loading ? <LoadingSpinner size="sm" /> : nfts.length}
      </div>
      {nfts.length > 0 && (
        <div className="space-y-2">
          {nfts.slice(0, 3).map((nft, index) => (
            <button 
              key={index}
              onClick={() => onView(nft)}
              className="bg-panAfrican-gold text-black font-bold py-1 px-3 rounded-lg text-xs w-full"
            >
              View NFT #{nft.tokenId}
            </button>
          ))}
          {nfts.length > 3 && (
            <div className="text-xs text-gray-300">+{nfts.length - 3} more...</div>
          )}
        </div>
      )}
    </div>
  );
} 