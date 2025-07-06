// src/pages/Dashboard.jsx
import React, { useState } from 'react';
import AutoExecutor from '../components/AutoExecutor';
import ZiGTDashboard from '../components/ZiGTDashboard';
import { useContract } from '../hooks/useContract';
import useZiGTData from '../hooks/useZiGTData';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('pmm');
  const { 
    isConnected, 
    connectWallet, 
    account,
    zigtContract,
    reparationsContract,
    registryContract,
    bandFeedRegistryContract
  } = useContract();

  const { totalSupply, valueUSD } = useZiGTData();

  return (
    
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-50 p-8 text-gray-800">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-800 mb-2">
            DeFi Strategy Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Manage both PMMS arbitrage and ZiGT ecosystem strategies
          </p>
        </header>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'pmm' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('pmm')}
          >
            PMMS Strategies
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'zigt' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('zigt')}
          >
            ZiGT Ecosystem
          </button>
        </div>
    <div>
      <h2>🌍 ZiGT Ecosystem Overview</h2>
      <p>Total Supply: {totalSupply} ₥MYRT</p>
      <p>Token Value (USD): ${valueUSD}</p>
    </div>
        {/* Wallet Connection (if not connected) */}
        {!isConnected && (
          <div className="text-center mb-8">
            <button
              onClick={connectWallet}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Connect Wallet to Continue
            </button>
          </div>
        )}

        {/* Tab Content */}
        <section className="grid grid-cols-1 md:grid-cols-1 gap-6">
          {activeTab === 'pmm' ? 
            <AutoExecutor 
              isConnected={isConnected} 
              account={account} 
              registryContract={registryContract} 
            /> : 
            <ZiGTDashboard 
              isConnected={isConnected} 
              account={account}
              zigtContract={zigtContract}
              reparationsContract={reparationsContract}
              bandFeedRegistryContract={bandFeedRegistryContract}
            />
          }
        </section>
      </div>
    </div>


  );
};

export default Dashboard;