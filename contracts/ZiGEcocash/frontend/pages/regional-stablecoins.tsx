import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';


interface RegionalInfo {
  name: string;
  symbol: string;
  totalSupply: number;
  isActive: boolean;
  cryptoWeight: number;
  metalWeight: number;
  fiatWeight: number;
}

interface FuelCosts {
  transferCost: number;
  remittanceCost: number;
  mintCost: number;
  burnCost: number;
}

const RegionalStablecoinsPage: React.FC = () => {
  const { account, connectWallet, contracts } = useWallet();
  const [regionalInfo, setRegionalInfo] = useState<RegionalInfo[]>([]);
  const [fuelCosts, setFuelCosts] = useState<FuelCosts | null>(null);
  const [userBalances, setUserBalances] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(1);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [action, setAction] = useState<'transfer' | 'remittance' | 'mint' | 'burn'>('transfer');

  const regionNames = [
    'North Africa',
    'West Africa', 
    'Central Africa',
    'East Africa',
    'Southern Africa',
    'Horn of Africa'
  ];

  const regionSymbols = ['NAS', 'WAS', 'CAS', 'EAS', 'SAS', 'HAS'];

  useEffect(() => {
    if (account) {
      loadData();
    }
  }, [account]);

  const loadData = async () => {
    if (!account) return;
    
    setLoading(true);
    try {
      const regionalStablecoins = contracts.RegionalStablecoins;
      
      // Load regional info
      const info = [];
      for (let i = 1; i <= 6; i++) {
        const regionInfo = await regionalStablecoins.getRegionalStablecoin(i);
        info.push({
          name: regionInfo[0],
          symbol: regionInfo[1],
          totalSupply: Number(regionInfo[2]),
          isActive: regionInfo[3],
          cryptoWeight: Number(regionInfo[4]),
          metalWeight: Number(regionInfo[5]),
          fiatWeight: Number(regionInfo[6])
        });
      }
      setRegionalInfo(info);

      // Load user balances
      const balances = [];
      for (let i = 1; i <= 6; i++) {
        const balance = await regionalStablecoins.getBalance(i, account);
        balances.push(Number(ethers.formatEther(balance)));
      }
      setUserBalances(balances);

      // Load fuel costs
      const costs = await regionalStablecoins.getFuelCosts();
      setFuelCosts({
        transferCost: Number(costs[0]),
        remittanceCost: Number(costs[1]),
        mintCost: Number(costs[2]),
        burnCost: Number(costs[3])
      });

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async () => {
    if (!account || !amount) return;
    
    setLoading(true);
    try {
      const regionalStablecoins = contracts.RegionalStablecoins;
      const amountWei = ethers.parseEther(amount);
      
      let tx;
      switch (action) {
        case 'transfer':
          tx = await regionalStablecoins.transfer(selectedRegion, recipient, amountWei);
          break;
        case 'remittance':
          if (!recipientName) {
            alert('Recipient name is required for remittance');
            return;
          }
          tx = await regionalStablecoins.remittance(selectedRegion, recipient, amountWei, recipientName);
          break;
        case 'mint':
          tx = await regionalStablecoins.mint(selectedRegion, account, amountWei);
          break;
        case 'burn':
          tx = await regionalStablecoins.burn(selectedRegion, amountWei);
          break;
      }
      
      await tx.wait();
      alert(`${action.charAt(0).toUpperCase() + action.slice(1)} successful!`);
      
      // Reset form
      setAmount('');
      setRecipient('');
      setRecipientName('');
      
      // Reload data
      loadData();
    } catch (error) {
      console.error(`Error executing ${action}:`, error);
      alert(`Failed to execute ${action}. Check fuel balance and permissions.`);
    } finally {
      setLoading(false);
    }
  };

  const getFuelCost = () => {
    if (!fuelCosts) return 0;
    switch (action) {
      case 'transfer': return fuelCosts.transferCost;
      case 'remittance': return fuelCosts.remittanceCost;
      case 'mint': return fuelCosts.mintCost;
      case 'burn': return fuelCosts.burnCost;
      default: return 0;
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-8">Regional Stablecoins</h1>
            <p className="text-xl mb-8">Connect your wallet to access regional stablecoins and remittance services</p>
            <button
              onClick={connectWallet}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">Regional Stablecoins</h1>
        <p className="text-xl mb-8 text-center">Cross-border payments with regional asset compositions</p>

        {loading && (
          <div className="text-center mb-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="mt-2">Loading...</p>
          </div>
        )}

        {/* Regional Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {regionalInfo.map((region, index) => (
            <div key={index} className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">{region.name} ({region.symbol})</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Your Balance:</span>
                  <span className="font-bold">{userBalances[index]?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Supply:</span>
                  <span className="font-bold">{region.totalSupply.toFixed(2)}</span>
                </div>
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Asset Composition:</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Crypto:</span>
                      <span>{region.cryptoWeight}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Metal:</span>
                      <span>{region.metalWeight}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fiat:</span>
                      <span>{region.fiatWeight}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Fuel System */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">⛽ Fuel System</h2>
          {fuelCosts && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{fuelCosts.transferCost}</div>
                <div className="text-sm">Transfer</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{fuelCosts.remittanceCost}</div>
                <div className="text-sm">Remittance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{fuelCosts.mintCost}</div>
                <div className="text-sm">Mint</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{fuelCosts.burnCost}</div>
                <div className="text-sm">Burn</div>
              </div>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">💱 Regional Stablecoin Actions</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Action Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Action Type</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as 'transfer' | 'remittance' | 'mint' | 'burn')}
                  className="w-full p-3 rounded-lg bg-white/20 border border-white/30 text-white"
                >
                  <option value="transfer">Transfer</option>
                  <option value="remittance">Remittance</option>
                  <option value="mint">Mint</option>
                  <option value="burn">Burn</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Region</label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(parseInt(e.target.value))}
                  className="w-full p-3 rounded-lg bg-white/20 border border-white/30 text-white"
                >
                  {regionNames.map((name, index) => (
                    <option key={index + 1} value={index + 1}>
                      {name} ({regionSymbols[index]})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70"
                  placeholder="Enter amount..."
                  step="0.01"
                  min="0"
                />
              </div>

              {(action === 'transfer' || action === 'remittance') && (
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Address</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full p-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70"
                    placeholder="0x..."
                  />
                </div>
              )}

              {action === 'remittance' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Name</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full p-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70"
                    placeholder="Recipient name..."
                  />
                </div>
              )}
            </div>

            {/* Action Info */}
            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-lg font-bold mb-2">Action Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Action:</span>
                    <span className="font-bold capitalize">{action}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Region:</span>
                    <span className="font-bold">{regionNames[selectedRegion - 1]} ({regionSymbols[selectedRegion - 1]})</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-bold">{amount || '0'} tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fuel Cost:</span>
                    <span className="font-bold text-yellow-400">{getFuelCost()} tokens</span>
                  </div>
                </div>
              </div>

              <button
                onClick={executeAction}
                disabled={loading || !amount || (action !== 'mint' && action !== 'burn' && !recipient)}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
              >
                {loading ? 'Processing...' : `Execute ${action.charAt(0).toUpperCase() + action.slice(1)}`}
              </button>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">ℹ️ How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-bold mb-2">Regional Compositions</h3>
              <ul className="space-y-2 text-sm">
                <li>• <strong>North Africa:</strong> 50% Crypto, 30% Metal, 20% Fiat</li>
                <li>• <strong>West Africa:</strong> 40% Crypto, 35% Metal, 25% Fiat</li>
                <li>• <strong>Central Africa:</strong> 35% Crypto, 45% Metal, 20% Fiat</li>
                <li>• <strong>East Africa:</strong> 45% Crypto, 30% Metal, 25% Fiat</li>
                <li>• <strong>Southern Africa:</strong> 35% Crypto, 30% Metal, 35% Fiat</li>
                <li>• <strong>Horn of Africa:</strong> 50% Crypto, 20% Metal, 30% Fiat</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-2">Fuel System</h3>
              <ul className="space-y-2 text-sm">
                <li>• <strong>Transfer:</strong> {fuelCosts?.transferCost} utility tokens</li>
                <li>• <strong>Remittance:</strong> {fuelCosts?.remittanceCost} utility tokens</li>
                <li>• <strong>Mint:</strong> {fuelCosts?.mintCost} utility tokens</li>
                <li>• <strong>Burn:</strong> {fuelCosts?.burnCost} utility tokens</li>
                <li>• Each action requires sufficient utility token balance</li>
                <li>• Remittance includes recipient name for compliance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegionalStablecoinsPage; 