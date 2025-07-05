import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';

interface FuelStats {
  totalSpent: number;
  transactionFeeBalance: number;
  stakingRewardBalance: number;
  governanceBonusBalance: number;
  culturalAccessBalance: number;
}

interface FuelCosts {
  proposalCost: number;
  voteCost: number;
  executionCost: number;
  governanceBonusCost: number;
}

interface OracleAssets {
  symbols: string[];
  weights: number[];
}

const DaoOraclePage: React.FC = () => {
  const { account, connectWallet, contracts } = useWallet();
  const [fuelStats, setFuelStats] = useState<FuelStats | null>(null);
  const [fuelCosts, setFuelCosts] = useState<FuelCosts | null>(null);
  const [cryptoAssets, setCryptoAssets] = useState<OracleAssets | null>(null);
  const [metalAssets, setMetalAssets] = useState<OracleAssets | null>(null);
  const [forexAssets, setForexAssets] = useState<OracleAssets | null>(null);
  const [loading, setLoading] = useState(false);
  const [proposalDescription, setProposalDescription] = useState('');
  const [newSymbols, setNewSymbols] = useState('');
  const [newWeights, setNewWeights] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('crypto');

  useEffect(() => {
    if (account) {
      loadData();
    }
  }, [account, contracts]);

  const loadData = async () => {
    if (!account || !contracts.ReparationsDAO || !contracts.ZiGOracleHub) return;
    setLoading(true);
    try {
      const dao = contracts.ReparationsDAO;
      const oracleHub = contracts.ZiGOracleHub;
      // Load fuel statistics
      const stats = await dao.getUserFuelStats(account);
      setFuelStats({
        totalSpent: Number(stats[0]),
        transactionFeeBalance: Number(stats[1]),
        stakingRewardBalance: Number(stats[2]),
        governanceBonusBalance: Number(stats[3]),
        culturalAccessBalance: Number(stats[4])
      });
      // Load fuel costs
      const costs = await dao.getFuelCosts();
      setFuelCosts({
        proposalCost: Number(costs[0]),
        voteCost: Number(costs[1]),
        executionCost: Number(costs[2]),
        governanceBonusCost: Number(costs[3])
      });
      // Load oracle assets
      const [cryptoSymbols, cryptoWeights] = await oracleHub.getCryptoAssets();
      setCryptoAssets({
        symbols: cryptoSymbols,
        weights: cryptoWeights.map((w: any) => Number(w))
      });
      const [metalSymbols, metalWeights] = await oracleHub.getMetalAssets();
      setMetalAssets({
        symbols: metalSymbols,
        weights: metalWeights.map((w: any) => Number(w))
      });
      const [forexSymbols, forexWeights] = await oracleHub.getForexAssets();
      setForexAssets({
        symbols: forexSymbols,
        weights: forexWeights.map((w: any) => Number(w))
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProposal = async () => {
    if (!account || !proposalDescription || !contracts.ReparationsDAO) return;
    setLoading(true);
    try {
      const dao = contracts.ReparationsDAO;
      const tx = await dao.createProposal(proposalDescription, 0, ethers.ZeroAddress);
      await tx.wait();
      alert('Proposal created successfully!');
      setProposalDescription('');
    } catch (error) {
      console.error('Error creating proposal:', error);
      alert('Failed to create proposal. Check fuel balance.');
    } finally {
      setLoading(false);
    }
  };

  const adjustOracleWeights = async () => {
    if (!account || !newSymbols || !newWeights || !contracts.ZiGOracleHub) return;
    setLoading(true);
    try {
      const symbols = newSymbols.split(',').map(s => s.trim());
      const weights = newWeights.split(',').map(w => parseInt(w.trim()));
      if (symbols.length !== weights.length) {
        alert('Number of symbols must match number of weights');
        return;
      }
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
      if (totalWeight !== 10000) {
        alert('Weights must sum to 10000 (100%)');
        return;
      }
      const oracleHub = contracts.ZiGOracleHub;
      const tx = await oracleHub.setAssetWeightsAndSymbols(symbols, weights, selectedCategory);
      await tx.wait();
      alert('Oracle weights adjusted successfully!');
      setNewSymbols('');
      setNewWeights('');
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error adjusting oracle weights:', error);
      alert('Failed to adjust oracle weights. Only DAO can call this function.');
    } finally {
      setLoading(false);
    }
  };

  const awardGovernanceBonus = async () => {
    if (!account || !contracts.ReparationsDAO) return;
    setLoading(true);
    try {
      const dao = contracts.ReparationsDAO;
      const tx = await dao.awardGovernanceBonus(account, 50);
      await tx.wait();
      alert('Governance bonus awarded!');
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error awarding bonus:', error);
      alert('Failed to award bonus. Check permissions and fuel balance.');
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-8">DAO-Oracle Integration</h1>
            <p className="text-xl mb-8">Connect your wallet to access DAO governance with utility token fuel system</p>
            <button
              onClick={connectWallet}
              className="bg-gradient-to-r from-purple-600 to-blue-700 hover:from-purple-700 hover:to-blue-800 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">DAO-Oracle Integration</h1>
        <p className="text-xl mb-8 text-center">Governance with Utility Token Fuel System</p>

        {loading && (
          <div className="text-center mb-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="mt-2">Loading...</p>
          </div>
        )}

        {/* Fuel System Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">⛽ Fuel System</h2>
            {fuelCosts && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Proposal Creation:</span>
                  <span className="font-bold">{fuelCosts.proposalCost} tokens</span>
                </div>
                <div className="flex justify-between">
                  <span>Voting:</span>
                  <span className="font-bold">{fuelCosts.voteCost} tokens</span>
                </div>
                <div className="flex justify-between">
                  <span>Execution:</span>
                  <span className="font-bold">{fuelCosts.executionCost} tokens</span>
                </div>
                <div className="flex justify-between">
                  <span>Governance Bonus:</span>
                  <span className="font-bold">{fuelCosts.governanceBonusCost} tokens</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">💰 Your Fuel Balance</h2>
            {fuelStats && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Spent:</span>
                  <span className="font-bold">{fuelStats.totalSpent} tokens</span>
                </div>
                <div className="flex justify-between">
                  <span>Transaction Fee:</span>
                  <span className="font-bold">{fuelStats.transactionFeeBalance} tokens</span>
                </div>
                <div className="flex justify-between">
                  <span>Staking Reward:</span>
                  <span className="font-bold">{fuelStats.stakingRewardBalance} tokens</span>
                </div>
                <div className="flex justify-between">
                  <span>Governance Bonus:</span>
                  <span className="font-bold">{fuelStats.governanceBonusBalance} tokens</span>
                </div>
                <div className="flex justify-between">
                  <span>Cultural Access:</span>
                  <span className="font-bold">{fuelStats.culturalAccessBalance} tokens</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Oracle Assets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">🪙 Crypto Assets</h3>
            {cryptoAssets && (
              <div className="space-y-2">
                {cryptoAssets.symbols.map((symbol, index) => (
                  <div key={symbol} className="flex justify-between">
                    <span>{symbol}:</span>
                    <span className="font-bold">{cryptoAssets.weights[index]} bp</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">🥇 Metal Assets</h3>
            {metalAssets && (
              <div className="space-y-2">
                {metalAssets.symbols.map((symbol, index) => (
                  <div key={symbol} className="flex justify-between">
                    <span>{symbol}:</span>
                    <span className="font-bold">{metalAssets.weights[index]} bp</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">💱 Forex Assets</h3>
            {forexAssets && (
              <div className="space-y-2">
                {forexAssets.symbols.map((symbol, index) => (
                  <div key={symbol} className="flex justify-between">
                    <span>{symbol}:</span>
                    <span className="font-bold">{forexAssets.weights[index]} bp</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Governance Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">🏛️ Governance Actions</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Proposal Description</label>
                <textarea
                  value={proposalDescription}
                  onChange={(e) => setProposalDescription(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70"
                  placeholder="Describe your proposal..."
                  rows={3}
                />
              </div>
              
              <button
                onClick={createProposal}
                disabled={loading || !proposalDescription}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
              >
                Create Proposal ({fuelCosts?.proposalCost} fuel)
              </button>

              <button
                onClick={awardGovernanceBonus}
                disabled={loading}
                className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
              >
                Award Governance Bonus ({fuelCosts?.governanceBonusCost} fuel)
              </button>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">⚙️ Oracle Weight Adjustment</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white/20 border border-white/30 text-white"
                >
                  <option value="crypto">Crypto</option>
                  <option value="metal">Metal</option>
                  <option value="forex">Forex</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Symbols (comma-separated)</label>
                <input
                  type="text"
                  value={newSymbols}
                  onChange={(e) => setNewSymbols(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70"
                  placeholder="BTCUSD,ETHUSD,BNBUSD..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Weights (comma-separated, must sum to 10000)</label>
                <input
                  type="text"
                  value={newWeights}
                  onChange={(e) => setNewWeights(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70"
                  placeholder="3000,2500,2000,1500,1000"
                />
              </div>

              <button
                onClick={adjustOracleWeights}
                disabled={loading || !newSymbols || !newWeights}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
              >
                Adjust Oracle Weights (DAO Only)
              </button>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">ℹ️ How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-bold mb-2">Fuel System</h3>
              <ul className="space-y-2 text-sm">
                <li>• Create proposals: {fuelCosts?.proposalCost} transaction fee tokens</li>
                <li>• Vote on proposals: {fuelCosts?.voteCost} transaction fee tokens</li>
                <li>• Execute proposals: {fuelCosts?.executionCost} transaction fee tokens</li>
                <li>• Award bonuses: {fuelCosts?.governanceBonusCost} governance bonus tokens</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-2">DAO-Oracle Integration</h3>
              <ul className="space-y-2 text-sm">
                <li>• Only DAO can adjust oracle asset weights</li>
                <li>• Weights must sum to 10000 (100%)</li>
                <li>• Supports crypto, metal, and forex categories</li>
                <li>• Changes affect ZiG price calculation immediately</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DaoOraclePage; 