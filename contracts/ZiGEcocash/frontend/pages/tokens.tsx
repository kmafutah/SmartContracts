import { useState } from 'react';

const tabs = [
  { label: 'Stable Token (ZiGT)', key: 'zigt' },
  { label: 'Main Token (ZiG)', key: 'zig' },
  { label: 'Governance Token', key: 'gov' },
  { label: 'Utility/Meme/GameFi/RWA', key: 'other' },
];

export default function Tokens() {
  const [active, setActive] = useState('zigt');
  return (
    <div className="min-h-screen bg-panAfrican-black text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`px-4 py-2 rounded-lg font-bold ${active === tab.key ? 'bg-panAfrican-gold text-black' : 'bg-panAfrican-green text-white'}`}
              onClick={() => setActive(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="bg-panAfrican-green rounded-xl p-6 shadow-lg">
          {active === 'zigt' && <StableTokenTab />}
          {active === 'zig' && <MainTokenTab />}
          {active === 'gov' && <GovernanceTokenTab />}
          {active === 'other' && <OtherTokensTab />}
        </div>
      </div>
    </div>
  );
}

function StableTokenTab() {
  return (
    <div>
      <div className="font-bold text-xl mb-2">ZiGT (Stable Token)</div>
      <div className="mb-2">Mint/redeem via bonding curve. Price preview here.</div>
      <button className="bg-panAfrican-gold text-black font-bold py-2 px-4 rounded-lg">Mint ZiGT</button>
    </div>
  );
}
function MainTokenTab() {
  return (
    <div>
      <div className="font-bold text-xl mb-2">ZiG (Main Token)</div>
      <div className="mb-2">Swap preview, use in vaults or governance.</div>
      <button className="bg-panAfrican-gold text-black font-bold py-2 px-4 rounded-lg">Swap ZiG</button>
    </div>
  );
}
function GovernanceTokenTab() {
  return (
    <div>
      <div className="font-bold text-xl mb-2">ZiGGovernanceToken</div>
      <div className="mb-2">Voting power, DAO proposal access.</div>
      <button className="bg-panAfrican-gold text-black font-bold py-2 px-4 rounded-lg">View Proposals</button>
    </div>
  );
}
function OtherTokensTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <TokenCard label="Utility Token" desc="Claim, redeem, interact. Usage stats." />
      <TokenCard label="Meme Token" desc="Fun, community-driven." />
      <TokenCard label="GameFi Token" desc="GameFi ecosystem participation." />
      <TokenCard label="RWA Token" desc="Real World Asset tokenization." />
    </div>
  );
}
function TokenCard({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="bg-panAfrican-black rounded-xl p-4 shadow-lg flex flex-col gap-2">
      <div className="font-bold text-lg">{label}</div>
      <div className="text-sm opacity-80">{desc}</div>
      <button className="bg-panAfrican-gold text-black font-bold py-1 px-3 rounded-lg mt-2">Interact</button>
    </div>
  );
} 