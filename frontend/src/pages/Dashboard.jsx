import React from 'react';
import ExecuteStrategy from '../components/ExecuteStrategy';
import RegisterStrategyForm from '../components/RegisterStrategyForm';
import StrategyList from '../components/StrategyList';
import '../App.css';

const Dashboard = () => {
  return (
    <div className="dashboard">
      <h1>Profit Maximizer Modular System</h1>
      <div className="dashboard-sections">
        <section>
          <ExecuteStrategy />
        </section>
        <section>
          <RegisterStrategyForm />
        </section>
        <section>
          <StrategyList />
        </section>
      </div>
    </div>
  );
};

export default Dashboard;