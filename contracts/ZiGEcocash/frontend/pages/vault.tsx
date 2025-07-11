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

const redistributions = [
  { id: 12, time: '2 hrs ago', amount: '23.5 ZIG' },
  { id: 11, time: '1 day ago', amount: '18.2 ZIG' },
  { id: 10, time: '2 days ago', amount: '20.0 ZIG' },
];

export default function Vault() {
  const notify = useNotification();
  const { isConnected, account, provider, signer, contracts, connectWallet } = useWallet();
  const [vaultData, setVaultData] = useState({
    balance: '0',
    userShare: '0',
    totalDeposits: '0',
    nextRedistribution: '0'
  });
  const [loading, setLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [claiming, setClaiming] = useState(false);

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

  // Fetch vault data
  useEffect(() => {
    async function fetchVaultData() {
      if (!isConnected || !account || !provider) return;
      
      setLoading(true);
      try {
        const vaultContract = new ethers.Contract(
          contracts.Vault.address,
          contracts.Vault.abi,
          provider
        );

        const [balance, userShare, totalDeposits] = await Promise.all([
          vaultContract.getVaultBalance(),
          vaultContract.getUserShare(account),
          vaultContract.getTotalDeposits()
        ]);

        setVaultData({
          balance: ethers.formatUnits(balance, contracts.Vault.decimals),
          userShare: ethers.formatUnits(userShare, contracts.Vault.decimals),
          totalDeposits: ethers.formatUnits(totalDeposits, contracts.Vault.decimals),
          nextRedistribution: '3 days' // This would be calculated from contract
        });
      } catch (e: any) {
        console.error('Failed to fetch vault data:', e);
        notify('Failed to fetch vault data', 'error');
      } finally {
        setLoading(false);
      }
    }
    
    fetchVaultData();
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

  // Deposit to vault
  const depositToVault = async () => {
    if (!signer || !depositAmount) {
      notify('Please connect wallet and enter amount', 'error');
      return;
    }

    setDepositing(true);
    try {
      const vaultContract = new ethers.Contract(
        contracts.Vault.address,
        contracts.Vault.abi,
        signer
      );

      const amount = ethers.parseUnits(depositAmount, contracts.Vault.decimals);
      const tx = await vaultContract.deposit(amount);
      await tx.wait();

      notify('Successfully deposited to vault', 'success');
      setDepositAmount('');
      // Refresh vault data
      window.location.reload();
    } catch (error: any) {
      notify(`Failed to deposit: ${error.message}`, 'error');
    } finally {
      setDepositing(false);
    }
  };

  // Claim from vault
  const claimFromVault = async () => {
    if (!signer) {
      notify('Please connect your wallet first', 'error');
      return;
    }

    setClaiming(true);
    try {
      const vaultContract = new ethers.Contract(
        contracts.Vault.address,
        contracts.Vault.abi,
        signer
      );

      const tx = await vaultContract.claim();
      await tx.wait();

      notify('Successfully claimed from vault', 'success');
      // Refresh vault data
      window.location.reload();
    } catch (error: any) {
      notify(`Failed to claim: ${error.message}`, 'error');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-panAfrican-black text-white">
      {/* Header */}
      <div className="bg-panAfrican-green p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold">ZiGVerse Vault</div>
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

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="font-bold text-2xl mb-6">Vault & Redistribution</div>
          
          <div className="bg-panAfrican-green rounded-xl p-6 shadow-lg flex flex-col gap-6">
            {/* Vault Balance Section */}
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-1">
                <div className="font-bold mb-2">Vault Balance</div>
                <div className="text-3xl font-mono mb-4">
                  {loading ? <LoadingSpinner size="md" /> : `${vaultData.balance} ZIG`}
                </div>
                
                {isConnected && (
                  <div className="space-y-4">
                    <div className="text-sm">
                      Your Share: {loading ? <LoadingSpinner size="sm" /> : `${vaultData.userShare} ZIG`}
                    </div>
                    <div className="text-sm">
                      Total Deposits: {loading ? <LoadingSpinner size="sm" /> : `${vaultData.totalDeposits} ZIG`}
                    </div>
                    
                    {/* Deposit Section */}
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="Amount to deposit"
                        className="px-3 py-2 rounded-lg bg-panAfrican-black text-white border border-gray-600 flex-1"
                      />
                      <button 
                        onClick={depositToVault}
                        disabled={depositing || !depositAmount}
                        className="bg-panAfrican-gold text-black font-bold py-2 px-4 rounded-lg disabled:opacity-50"
                      >
                        {depositing ? <LoadingSpinner size="sm" /> : 'Deposit'}
                      </button>
                    </div>
                    
                    {/* Claim Button */}
                    <button 
                      onClick={claimFromVault}
                      disabled={claiming || parseFloat(vaultData.userShare) <= 0}
                      className="bg-panAfrican-crimson text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
                    >
                      {claiming ? <LoadingSpinner size="sm" /> : 'Claim Share'}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="w-32 h-32 rounded-full bg-panAfrican-gold opacity-70 flex items-center justify-center">
                <span className="text-black font-bold">Vault</span>
              </div>
            </div>

            {/* Redistribution Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="font-bold mb-2">Upcoming Redistributions</div>
                <ul className="text-sm">
                  <li>Redistribution #13 <span className="float-right text-gray-400">in {vaultData.nextRedistribution}</span></li>
                </ul>
              </div>
              
              <div>
                <div className="font-bold mb-2">Redistribution History</div>
                <ul className="text-sm">
                  {redistributions.map(r => (
                    <li key={r.id}>Redistribution #{r.id} - {r.amount} <span className="float-right text-gray-400">{r.time}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 