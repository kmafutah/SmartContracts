// src/pages/Dashboard.jsx
import React from 'react';
import AutoExecutor from '../components/AutoExecutor';
import StrategyList from '../components/StrategyList';
import ContractInteractor from '../components/RegisterStrategyForm'

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-50 p-8 text-gray-800">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-800 mb-2">
            PMMS Strategy Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Automate DeFi arbitrage, liquidation, and rebalancing strategies on-chain
          </p>
        </header>
        <section className="grid grid-cols-1 md:grid-cols-1 gap-6">
          <AutoExecutor />
          <StrategyList />
          <ContractInteractor />
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
