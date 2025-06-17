import React from 'react';
import Dashboard from './pages/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';

import './App.css';

function App() {
  return (
    <div className="App">
      <ErrorBoundary>
        <Dashboard />
      </ErrorBoundary>      
    </div>
  );
}

export default App;