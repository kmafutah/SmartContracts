import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '../lib/contracts';
import { useNotification } from '../components/Notification';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const notify = useNotification();
  const [balances, setBalances] = useState<{ [k: string]: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchBalances() {
      if (!isConnected || !address) return;
      setLoading(true);
      try {
        // Use window.ethereum for provider
        // @ts-ignore
        const provider = new ethers.BrowserProvider(window.ethereum);
        const zig = new ethers.Contract(CONTRACTS.ZIG.address, CONTRACTS.ZIG.abi, provider);
        const zigt = new ethers.Contract(CONTRACTS.ZiGT.address, CONTRACTS.ZiGT.abi, provider);
        const zigBal = await zig.balanceOf(address);
        const zigtBal = await zigt.balanceOf(address);
        setBalances({
          ZIG: ethers.formatUnits(zigBal, CONTRACTS.ZIG.decimals),
          ZiGT: ethers.formatUnits(zigtBal, CONTRACTS.ZiGT.decimals),
        });
      } catch (e: any) {
        notify('Failed to fetch balances', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchBalances();
  }, [isConnected, address, notify]);

  return (
    <div className="min-h-screen bg-panAfrican-black text-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-panAfrican-green p-4 flex flex-col gap-4">
        <div className="text-2xl font-bold mb-6">ZiGVerse</div>
        <nav className="flex flex-col gap-3">
          <a href="/dashboard" className="font-semibold">Dashboard</a>
          <a href="/identity">Identity</a>
          <a href="/tokens">Tokens</a>
          <a href="/oracles">Oracles</a>
          <a href="/dao">DAO</a>
          <a href="/nfts">NFTs</a>
          <a href="/vault">Vault</a>
        </nav>
      </aside>
      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 flex flex-col gap-6">
        {/* Top Bar */}
        <div className="flex justify-between items-center">
          <div></div>
          <ConnectButton />
        </div>
        {/* SoulReparationNFT Card */}
        <div className="bg-panAfrican-black rounded-xl p-6 flex items-center gap-4 shadow-lg">
          <div className="w-20 h-20 rounded-full bg-panAfrican-crimson flex items-center justify-center">
            {/* Placeholder for avatar */}
            <span className="text-4xl">🧑🏾‍🦱</span>
          </div>
          <div>
            <div className="text-xl font-serif font-bold">SoulReparationNFT</div>
            <div className="flex items-center gap-2 text-green-400 font-semibold">
              <span>Verified</span>
              <span className="w-3 h-3 bg-green-400 rounded-full inline-block"></span>
            </div>
          </div>
        </div>
        {/* Live Balances */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <BalanceCard label="ZIG" value={loading ? <Spinner /> : balances.ZIG || '--'} usd="$2.34" color="gold" />
          <BalanceCard label="ZiGT" value={loading ? <Spinner /> : balances.ZiGT || '--'} usd="$2.34" color="gold" />
          <BalanceCard label="Utility Token" value="-" usd="$0.71" color="green" />
          <BalanceCard label="Governance Token" value="-" usd="$0.79" color="crimson" />
        </div>
        {/* Vault & Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-panAfrican-black rounded-xl p-6 flex flex-col gap-4 shadow-lg">
            <div className="font-bold mb-2">Vault</div>
            <div className="flex-1 flex items-center justify-center">
              {/* Placeholder for pie chart */}
              <div className="w-32 h-32 rounded-full bg-panAfrican-gold opacity-70 flex items-center justify-center">
                <span className="text-black font-bold">Pie</span>
              </div>
            </div>
            <button className="mt-4 bg-panAfrican-gold text-black font-bold py-2 rounded-lg">Claim Share</button>
          </div>
          <div className="bg-panAfrican-black rounded-xl p-6 flex flex-col gap-4 shadow-lg">
            <div className="font-bold mb-2">Recent Activity</div>
            <ul className="text-sm">
              <li>Redistribution #12 <span className="float-right text-gray-400">2 hrs ago</span></li>
              <li>Redistribution #11 <span className="float-right text-gray-400">1 day ago</span></li>
              <li>Deposit <span className="float-right text-gray-400">2 days ago</span></li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

function BalanceCard({ label, value, usd, color }: { label: string; value: any; usd: string; color: string }) {
  const colorMap: Record<string, string> = {
    gold: 'bg-panAfrican-gold text-black',
    green: 'bg-panAfrican-green text-white',
    crimson: 'bg-panAfrican-crimson text-white',
  };
  return (
    <div className={`rounded-xl p-4 flex flex-col items-start shadow-lg ${colorMap[color]}`}>
      <div className="font-bold text-lg">{label}</div>
      <div className="text-2xl font-mono">{value}</div>
      <div className="text-xs opacity-80">{usd}</div>
    </div>
  );
}

function Spinner() {
  return <div className="spinner" />;
} 