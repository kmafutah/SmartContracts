import React, { useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '../lib/contracts';
import { useNotification } from '../components/Notification';
import { LoadingSpinner } from '../components/LoadingSpinner';
// Add imports for charting, carousel, and SoulID hooks
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend);
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-chartjs-2').then(mod => mod.Chart), { ssr: false });
import 'react-multi-carousel/lib/styles.css';
import { useSoulID } from '../hooks/useSoulID';
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

const tabs = [
  { label: 'Stable Token (ZiGT)', key: 'zigt' },
  { label: 'Main Token (ZiG)', key: 'zig' },
  { label: 'Governance Token', key: 'gov' },
  { label: 'Utility/Meme/GameFi/RWA', key: 'other' },
];

export default function Tokens() {
  const notify = useNotification();
  const { isConnected, account, provider, signer, contracts, connectWallet } = useWallet();
  const [balances, setBalances] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState('zigt');

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

  // Fetch balances
  useEffect(() => {
    async function fetchBalances() {
      if (!isConnected || !account || !provider) return;
      
      setLoading(true);
      try {
        const newBalances: any = {};
        
        // Fetch balances for all tokens
        const contractsToCheck = ['ZiG', 'ZiGT', 'ZiGUtilityToken', 'ZiGGovernanceToken', 'ZiGMemeToken', 'ZiGGameFiToken', 'ZiGRWAToken'];
        
        for (const contractName of contractsToCheck) {
          try {
            const contractConfig = CONTRACTS[contractName as keyof typeof CONTRACTS];
            if (contractConfig && contractConfig.abi && contractConfig.abi.length > 0) {
              const contract = new ethers.Contract(
                contractConfig.address,
                contractConfig.abi,
                provider
              );
              
              // Handle ERC1155 utility token
              if (contractName === 'ZiGUtilityToken') {
                const balance0 = await contract.balanceOf(account, 0);
                const balance1 = await contract.balanceOf(account, 1);
                const balance2 = await contract.balanceOf(account, 2);
                newBalances[contractName] = {
                  '0': ethers.formatUnits(balance0, contractConfig.decimals),
                  '1': ethers.formatUnits(balance1, contractConfig.decimals),
                  '2': ethers.formatUnits(balance2, contractConfig.decimals)
                };
              } else {
                const balance = await contract.balanceOf(account);
                newBalances[contractName] = ethers.formatUnits(balance, contractConfig.decimals);
              }
            }
          } catch (e) {
            console.error(`Failed to fetch ${contractName} balance:`, e);
            if (contractName === 'ZiGUtilityToken') {
              newBalances[contractName] = { '0': '0', '1': '0', '2': '0' };
            } else {
              newBalances[contractName] = '0';
            }
          }
        }
        
        setBalances(newBalances);
      } catch (e: any) {
        notify('Failed to fetch balances', 'error');
        console.error('Balance fetch error:', e);
      } finally {
        setLoading(false);
      }
    }
    
    fetchBalances();
  }, [isConnected, account, provider, notify]);

  // Check initial connection
  useEffect(() => {
    const checkConnection = async () => {
      if ((window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const accounts = await provider.send('eth_accounts', []);
          if (accounts.length > 0) {
            const signer = await provider.getSigner();
            // setProvider(provider); // This line is removed as per the new_code
            // setSigner(signer); // This line is removed as per the new_code
            // setAddress(accounts[0]); // This line is removed as per the new_code
            // setIsConnected(true); // This line is removed as per the new_code
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
          <div className="text-2xl font-bold">ZiGVerse Tokens</div>
          <button
            onClick={connectWallet}
            className={`px-6 py-2 rounded-lg font-bold transition-colors ${
              isConnected 
                ? 'bg-panAfrican-gold text-black' 
                : 'bg-panAfrican-crimson text-white hover:bg-red-700'
            }`}
          >
            {isConnected && account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect Wallet'}
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap ${active === tab.key ? 'bg-panAfrican-gold text-black' : 'bg-panAfrican-green text-white'}`}
                onClick={() => setActive(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="bg-panAfrican-green rounded-xl p-6 shadow-lg">
            {active === 'zigt' && <StableTokenTab balances={balances} loading={loading} signer={signer} notify={notify} />}
            {active === 'zig' && <MainTokenTab balances={balances} loading={loading} signer={signer} notify={notify} />}
            {active === 'gov' && <GovernanceTokenTab balances={balances} loading={loading} signer={signer} notify={notify} />}
            {active === 'other' && <OtherTokensTab balances={balances} loading={loading} signer={signer} notify={notify} contracts={contracts} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function StableTokenTab({ balances, loading, signer, notify }: any) {
  const [mintAmount, setMintAmount] = useState('100');
  const [minting, setMinting] = useState(false);
  const [mintCost, setMintCost] = useState('0');

  // Calculate mint cost
  useEffect(() => {
    async function calculateCost() {
      if (!signer || !mintAmount || parseFloat(mintAmount) <= 0) {
        setMintCost('0');
        return;
      }

      try {
        const bondingCurveContract = new ethers.Contract(
          CONTRACTS.ZiGBondingCurve.address,
          CONTRACTS.ZiGBondingCurve.abi,
          signer
        );
        
        const amount = ethers.parseUnits(mintAmount, 18);
        const cost = await bondingCurveContract.calculateMintCost(amount);
        setMintCost(ethers.formatEther(cost));
      } catch (error) {
        console.error('Failed to calculate mint cost:', error);
        setMintCost('0');
      }
    }

    calculateCost();
  }, [mintAmount, signer]);

  const mintZiGT = async () => {
    if (!signer) {
      notify('Please connect your wallet first', 'error');
      return;
    }

    if (!mintAmount || parseFloat(mintAmount) <= 0) {
      notify('Please enter a valid amount', 'error');
      return;
    }

    setMinting(true);
    try {
      const bondingCurveContract = new ethers.Contract(
        CONTRACTS.ZiGBondingCurve.address,
        CONTRACTS.ZiGBondingCurve.abi,
        signer
      );
      
      const amount = ethers.parseUnits(mintAmount, 18);
      const cost = await bondingCurveContract.calculateMintCost(amount);
      
      const tx = await bondingCurveContract.mint(amount, { value: cost });
      await tx.wait();
      
      notify(`Successfully minted ${mintAmount} ZiGT!`, 'success');
      setMintAmount('100');
    } catch (error: any) {
      notify(`Failed to mint ZiGT: ${error.message}`, 'error');
    } finally {
      setMinting(false);
    }
  };

  return (
    <div>
      <div className="font-bold text-xl mb-4">ZiGT (Stable Token)</div>
      <div className="mb-4">
        <div className="text-lg mb-2">Your Balance: {loading ? <LoadingSpinner size="sm" /> : balances.ZiGT || '0'} ZiGT</div>
        <div className="text-sm text-gray-300">Mint ZiGT tokens via bonding curve. Price increases with supply.</div>
      </div>
      <div className="flex gap-4 items-center mb-4">
        <input
          type="number"
          value={mintAmount}
          onChange={(e) => setMintAmount(e.target.value)}
          placeholder="Amount to mint"
          className="px-4 py-2 rounded-lg bg-panAfrican-black text-white border border-gray-600"
        />
        <button 
          onClick={mintZiGT}
          disabled={minting || !mintAmount || parseFloat(mintAmount) <= 0}
          className="bg-panAfrican-gold text-black font-bold py-2 px-4 rounded-lg disabled:opacity-50"
        >
          {minting ? <LoadingSpinner size="sm" /> : 'Mint ZiGT'}
        </button>
      </div>
      {mintCost !== '0' && (
        <div className="text-sm text-gray-300">
          Cost: {mintCost} ETH
        </div>
      )}
    </div>
  );
}

function MainTokenTab({ balances, loading, signer, notify }: any) {
  const [transferAmount, setTransferAmount] = useState('10');
  const [recipient, setRecipient] = useState('');
  const [transferring, setTransferring] = useState(false);

  const transferZiG = async () => {
    if (!signer) {
      notify('Please connect your wallet first', 'error');
      return;
    }

    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      notify('Please enter a valid amount', 'error');
      return;
    }

    if (!recipient || !ethers.isAddress(recipient)) {
      notify('Please enter a valid recipient address', 'error');
      return;
    }

    setTransferring(true);
    try {
      const zigContract = new ethers.Contract(
        CONTRACTS.ZiG.address,
        CONTRACTS.ZiG.abi,
        signer
      );
      
      const amount = ethers.parseUnits(transferAmount, 18);
      const tx = await zigContract.transfer(recipient, amount);
      await tx.wait();
      
      notify(`Successfully transferred ${transferAmount} ZiG to ${recipient.slice(0, 6)}...${recipient.slice(-4)}!`, 'success');
      setTransferAmount('10');
      setRecipient('');
    } catch (error: any) {
      notify(`Failed to transfer ZiG: ${error.message}`, 'error');
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div>
      <div className="font-bold text-xl mb-4">ZiG (Main Token)</div>
      <div className="mb-4">
        <div className="text-lg mb-2">Your Balance: {loading ? <LoadingSpinner size="sm" /> : balances.ZiG || '0'} ZiG</div>
        <div className="text-sm text-gray-300">Transfer ZiG tokens to other addresses.</div>
      </div>
      <div className="flex flex-col gap-4">
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Recipient address (0x...)"
          className="px-4 py-2 rounded-lg bg-panAfrican-black text-white border border-gray-600"
        />
        <div className="flex gap-4 items-center">
          <input
            type="number"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            placeholder="Amount to transfer"
            className="px-4 py-2 rounded-lg bg-panAfrican-black text-white border border-gray-600"
          />
          <button 
            onClick={transferZiG}
            disabled={transferring || !transferAmount || parseFloat(transferAmount) <= 0 || !recipient}
            className="bg-panAfrican-gold text-black font-bold py-2 px-4 rounded-lg disabled:opacity-50"
          >
            {transferring ? <LoadingSpinner size="sm" /> : 'Transfer ZiG'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GovernanceTokenTab({ balances, loading, signer, notify }: any) {
  const [delegateAddress, setDelegateAddress] = useState('');
  const [delegating, setDelegating] = useState(false);

  const delegateVotes = async () => {
    if (!signer) {
      notify('Please connect your wallet first', 'error');
      return;
    }

    if (!delegateAddress || !ethers.isAddress(delegateAddress)) {
      notify('Please enter a valid delegate address', 'error');
      return;
    }

    setDelegating(true);
    try {
      const govContract = new ethers.Contract(
        CONTRACTS.ZiGGovernanceToken.address,
        CONTRACTS.ZiGGovernanceToken.abi,
        signer
      );
      
      const tx = await govContract.delegate(delegateAddress);
      await tx.wait();
      
      notify(`Successfully delegated votes to ${delegateAddress.slice(0, 6)}...${delegateAddress.slice(-4)}!`, 'success');
      setDelegateAddress('');
    } catch (error: any) {
      notify(`Failed to delegate votes: ${error.message}`, 'error');
    } finally {
      setDelegating(false);
    }
  };

  const viewProposals = () => {
    notify('Redirecting to DAO proposals...', 'info');
    window.location.href = '/dao';
  };

  return (
    <div>
      <div className="font-bold text-xl mb-4">ZiGGovernanceToken</div>
      <div className="mb-4">
        <div className="text-lg mb-2">Your Balance: {loading ? <LoadingSpinner size="sm" /> : balances.ZiGGovernanceToken || '0'} GOV</div>
        <div className="text-sm text-gray-300">Delegate your voting power or participate in governance.</div>
      </div>
      <div className="flex flex-col gap-4 mb-4">
        <input
          type="text"
          value={delegateAddress}
          onChange={(e) => setDelegateAddress(e.target.value)}
          placeholder="Delegate address (0x...)"
          className="px-4 py-2 rounded-lg bg-panAfrican-black text-white border border-gray-600"
        />
        <button 
          onClick={delegateVotes}
          disabled={delegating || !delegateAddress}
          className="bg-panAfrican-gold text-black font-bold py-2 px-4 rounded-lg disabled:opacity-50"
        >
          {delegating ? <LoadingSpinner size="sm" /> : 'Delegate Votes'}
        </button>
      </div>
      <button 
        onClick={viewProposals}
        className="bg-panAfrican-crimson text-white font-bold py-2 px-4 rounded-lg"
      >
        View DAO Proposals
      </button>
    </div>
  );
}

function MemeTokenTab({ balances, loading, signer, notify, contracts }: any) {
  const { isVerified, tribe, soulID } = useSoulID();
  const [minting, setMinting] = useState(false);
  const [burning, setBurning] = useState(false);
  const [minted, setMinted] = useState(false);
  const [gallery, setGallery] = useState<any[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const [chartRange, setChartRange] = useState<'7d' | '30d' | '90d'>('7d');

  // Fetch meme gallery and price history
  useEffect(() => {
    setGallery([
      { name: 'Wakanda Forever', image: '/memes/wakanda.png', sentiment: 0.95 },
      { name: 'Pan-African Power', image: '/memes/power.png', sentiment: 0.89 },
    ]);
    setHistory([1, 2, 3, 4, 5, 6, 7]);
  }, [chartRange]);

  const mintMeme = async () => {
    if (!signer || !isVerified || !contracts?.ZiGMemeToken) {
      notify('You must be verified and connected to mint a Meme token.', 'error');
      return;
    }
    setMinting(true);
    try {
      const tx = await contracts.ZiGMemeToken.mint();
      await tx.wait();
      setMinted(true);
      notify('Meme token minted!', 'success');
    } catch (e: any) {
      notify('Mint failed: ' + e.message, 'error');
    } finally {
      setMinting(false);
    }
  };

  const burnMeme = async () => {
    if (!signer || !contracts?.ZiGMemeToken) return;
    setBurning(true);
    try {
      // Try burn(uint256 amount) with amount = 1
      const tx = await contracts.ZiGMemeToken.burn(ethers.parseUnits('1', 18));
      await tx.wait();
      notify('Meme token burned!', 'success');
    } catch (e: any) {
      notify('Burn failed: ' + e.message, 'error');
    } finally {
      setBurning(false);
    }
  };

  // Transfer and governance logic omitted for brevity

  return (
    <div>
      <div className="font-bold text-xl mb-4">ZiGMemeToken</div>
      <div className="mb-4">Your Balance: {loading ? <LoadingSpinner size="sm" /> : balances.ZiGMemeToken || '0'} MEME</div>
      <div className="flex gap-4 mb-4">
        <button onClick={mintMeme} disabled={minting || minted || !isVerified} className="bg-panAfrican-gold text-black font-bold py-2 px-4 rounded-lg disabled:opacity-50">{minting ? <LoadingSpinner size="sm" /> : minted ? 'Minted' : 'Mint Meme Token'}</button>
        <button onClick={burnMeme} disabled={burning || !balances.ZiGMemeToken || balances.ZiGMemeToken === '0'} className="bg-panAfrican-crimson text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50">{burning ? <LoadingSpinner size="sm" /> : 'Burn Meme Token'}</button>
      </div>
      <div className="mb-4">Governance Voting Power: {balances.ZiGMemeToken || '0'}</div>
      <div className="mb-4">Trending Meme Gallery:</div>
      <div style={{ display: 'flex', overflowX: 'auto', gap: '1rem', paddingBottom: '1rem' }}>
        {gallery.map((meme, i) => (
          <div key={i} className="p-2 min-w-[180px]">
            <img src={meme.image} alt={meme.name} className="rounded-lg w-full h-32 object-cover" />
            <div className="font-bold text-center mt-2">{meme.name}</div>
            <div className="text-xs text-center">Sentiment: {meme.sentiment}</div>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <div className="mb-2">Price History</div>
        <div className="flex gap-2 mb-2">
          <button onClick={() => setChartRange('7d')} className={chartRange==='7d'?'bg-panAfrican-gold text-black px-2 rounded':'px-2'}>7d</button>
          <button onClick={() => setChartRange('30d')} className={chartRange==='30d'?'bg-panAfrican-gold text-black px-2 rounded':'px-2'}>30d</button>
          <button onClick={() => setChartRange('90d')} className={chartRange==='90d'?'bg-panAfrican-gold text-black px-2 rounded':'px-2'}>90d</button>
        </div>
        <Chart type="line" data={{labels: history.map((_,i)=>i+1), datasets:[{label:'Price',data:history}]}} />
      </div>
    </div>
  );
}

function RWATokenTab({ balances, loading, signer, notify, contracts }: any) {
  const { isAdmin, isKYC, soulID } = useSoulID();
  const [minting, setMinting] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [filter, setFilter] = useState({ type: '', apy: '', region: '' });
  const [history, setHistory] = useState<number[]>([]);
  const [chartRange, setChartRange] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    setAssets([
      { type: 'Gold', valuation: 1000000, location: 'Ghana', apy: 0.03 },
      { type: 'Farmland', valuation: 500000, location: 'Kenya', apy: 0.07 },
    ]);
    setHistory([1, 2, 3, 4, 5, 6, 7]);
  }, [chartRange]);

  const mintRWA = async () => {
    if (!signer || !isAdmin || !contracts?.ZiGRWAToken) {
      notify('Only admins can mint RWA tokens.', 'error');
      return;
    }
    setMinting(true);
    try {
      // Mint 1 RWA token to self
      const tx = await contracts.ZiGRWAToken.mint(signer.address, ethers.parseUnits('1', 18));
      await tx.wait();
      notify('RWA token minted!', 'success');
    } catch (e: any) {
      notify('Mint failed: ' + e.message, 'error');
    } finally {
      setMinting(false);
    }
  };

  // Transfer logic omitted for brevity

  // Filtered assets
  const filteredAssets = assets.filter(a =>
    (!filter.type || a.type === filter.type) &&
    (!filter.apy || a.apy >= parseFloat(filter.apy)) &&
    (!filter.region || a.location === filter.region)
  );

  return (
    <div>
      <div className="font-bold text-xl mb-4">ZiGRWAToken</div>
      <div className="mb-4">Your Balance: {loading ? <LoadingSpinner size="sm" /> : balances.ZiGRWAToken || '0'} RWA</div>
      <div className="flex gap-4 mb-4">
        <button onClick={mintRWA} disabled={minting || !isAdmin} className="bg-panAfrican-gold text-black font-bold py-2 px-4 rounded-lg disabled:opacity-50">{minting ? <LoadingSpinner size="sm" /> : 'Mint RWA Token'}</button>
      </div>
      <div className="mb-4">Filter Assets:</div>
      <div className="flex gap-2 mb-4">
        <input placeholder="Type" value={filter.type} onChange={e=>setFilter(f=>({...f,type:e.target.value}))} className="px-2 py-1 rounded" />
        <input placeholder="APY >=" value={filter.apy} onChange={e=>setFilter(f=>({...f,apy:e.target.value}))} className="px-2 py-1 rounded" />
        <input placeholder="Region" value={filter.region} onChange={e=>setFilter(f=>({...f,region:e.target.value}))} className="px-2 py-1 rounded" />
      </div>
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAssets.map((asset, i) => (
          <div key={i} className="bg-panAfrican-black rounded-xl p-4">
            <div className="font-bold">{asset.type}</div>
            <div>Valuation: ${asset.valuation.toLocaleString()}</div>
            <div>Location: {asset.location}</div>
            <div>APY: {asset.apy ? (asset.apy*100).toFixed(2)+'%' : 'N/A'}</div>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <div className="mb-2">Price History</div>
        <div className="flex gap-2 mb-2">
          <button onClick={() => setChartRange('7d')} className={chartRange==='7d'?'bg-panAfrican-gold text-black px-2 rounded':'px-2'}>7d</button>
          <button onClick={() => setChartRange('30d')} className={chartRange==='30d'?'bg-panAfrican-gold text-black px-2 rounded':'px-2'}>30d</button>
          <button onClick={() => setChartRange('90d')} className={chartRange==='90d'?'bg-panAfrican-gold text-black px-2 rounded':'px-2'}>90d</button>
        </div>
        <Chart type="line" data={{labels: history.map((_,i)=>i+1), datasets:[{label:'Price',data:history}]}} />
      </div>
    </div>
  );
}

function OtherTokensTab({ balances, loading, signer, notify, contracts }: any) {
  const [claiming, setClaiming] = useState(false);

  const claimGameFiRewards = async () => {
    if (!signer) {
      notify('Please connect your wallet first', 'error');
      return;
    }

    setClaiming(true);
    try {
      const gamefiContract = new ethers.Contract(
        CONTRACTS.ZiGGameFiToken.address,
        CONTRACTS.ZiGGameFiToken.abi,
        signer
      );
      
      const tx = await gamefiContract.claimRewards();
      await tx.wait();
      
      notify('Successfully claimed GameFi rewards!', 'success');
    } catch (error: any) {
      notify(`Failed to claim rewards: ${error.message}`, 'error');
    } finally {
      setClaiming(false);
    }
  };

  const mintUtilityToken = async (tokenId: number) => {
    if (!signer) {
      notify('Please connect your wallet first', 'error');
      return;
    }

    try {
      const utilityContract = new ethers.Contract(
        CONTRACTS.ZiGUtilityToken.address,
        CONTRACTS.ZiGUtilityToken.abi,
        signer
      );
      
      const tx = await utilityContract.mint(signer.address, tokenId, 1, '0x');
      await tx.wait();
      
      notify(`Successfully minted Utility Token ID ${tokenId}!`, 'success');
    } catch (error: any) {
      notify(`Failed to mint utility token: ${error.message}`, 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <MemeTokenTab balances={balances} loading={loading} signer={signer} notify={notify} contracts={contracts} />
      <RWATokenTab balances={balances} loading={loading} signer={signer} notify={notify} contracts={contracts} />
      <TokenCard 
        label="Utility Token" 
        desc="ERC1155 tokens for various utilities." 
        balance={balances.ZiGUtilityToken || { '0': '0', '1': '0', '2': '0' }}
        loading={loading}
        onInteract={() => mintUtilityToken(0)}
        interactLabel="Mint ID 0"
      />
      <TokenCard 
        label="GameFi Token" 
        desc="GameFi ecosystem participation." 
        balance={balances.ZiGGameFiToken || '0'}
        loading={loading}
        onInteract={claimGameFiRewards}
        interactLabel={claiming ? <LoadingSpinner size="sm" /> : "Claim Rewards"}
        disabled={claiming}
      />
    </div>
  );
}

function TokenCard({ 
  label, 
  desc, 
  balance, 
  loading, 
  onInteract, 
  interactLabel, 
  disabled = false 
}: { 
  label: string; 
  desc: string; 
  balance: any; 
  loading: boolean; 
  onInteract: () => void;
  interactLabel: ReactNode;
  disabled?: boolean;
}) {
  const formatBalance = () => {
    if (loading) return <LoadingSpinner size="sm" />;
    
    if (typeof balance === 'object') {
      return (
        <div className="text-xs">
          <div>ID 0: {balance['0'] || '0'}</div>
          <div>ID 1: {balance['1'] || '0'}</div>
          <div>ID 2: {balance['2'] || '0'}</div>
        </div>
      );
    }
    
    return balance || '0';
  };

  return (
    <div className="bg-panAfrican-black rounded-xl p-4 shadow-lg flex flex-col gap-2">
      <div className="font-bold text-lg">{label}</div>
      <div className="text-sm opacity-80">{desc}</div>
      <div className="text-sm">Balance: {formatBalance()}</div>
      <button 
        onClick={onInteract}
        disabled={disabled}
        className="bg-panAfrican-gold text-black font-bold py-1 px-3 rounded-lg mt-2 disabled:opacity-50"
      >
        {interactLabel}
      </button>
    </div>
  );
} 