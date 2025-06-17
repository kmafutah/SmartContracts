import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';

const REFRESH_INTERVAL_MS = 15000; // 15 seconds for live updates

const assetPairs = [
  "BTCUSD", "ETHUSD", "BNBUSD", "XAUUSD", "USDZAR", "USDXOF", "USDNGN",
  "USDEGP", "USDRUB", "USDTRY", "USDINR", "AUDUSD", "EURUSD", "GBPUSD",
  "USDCHF", "USDJPY", "NZDUSD", "CNYUSD", "CADUSD", "USDUSD"
];

// Helper function for timestamped logs
const getTimestamp = () => new Date().toLocaleTimeString();

export default function RealTimeContractPanel({ provider, contractAddresses, signer }) {
  const [prices, setPrices] = useState({});
  const [logs, setLogs] = useState([]);
  const [isFetching, setIsFetching] = useState(false);

  const logsRef = useRef([]);
  logsRef.current = logs;

  // Append log entry with timestamp
  const addLog = (message, level = 'info') => {
    const entry = { time: getTimestamp(), message, level };
    setLogs((prev) => [...prev, entry]);
  };

  // Fetch live prices from APIs
  const fetchLivePrices = async () => {
    try {
      addLog('Fetching live prices...');
      const [coingecko, fx] = await Promise.all([
        axios.get('https://api.coingecko.com/api/v3/simple/price', {
          params: { ids: 'bitcoin,ethereum,binancecoin', vs_currencies: 'usd' }
        }),
        axios.get('https://openexchangerates.org/api/latest.json', {
          params: { app_id: process.env.REACT_APP_OPENEXG_APPID, symbols: 'ZAR,XOF,NGN,EGP,RUB,TRY,INR,AUD,EUR,GBP,CHF,JPY,NZD,CNY,CAD,XAU' }
        }),
      ]);

      const livePrices = {
        BTCUSD: coingecko.data.bitcoin.usd,
        ETHUSD: coingecko.data.ethereum.usd,
        BNBUSD: coingecko.data.binancecoin.usd,
        XAUUSD: 1 / fx.data.rates.XAU,
        USDZAR: 1 / fx.data.rates.ZAR,
        USDXOF: 1 / fx.data.rates.XOF,
        USDNGN: 1 / fx.data.rates.NGN,
        USDEGP: 1 / fx.data.rates.EGP,
        USDRUB: 1 / fx.data.rates.RUB,
        USDTRY: 1 / fx.data.rates.TRY,
        USDINR: 1 / fx.data.rates.INR,
        AUDUSD: fx.data.rates.AUD,
        EURUSD: fx.data.rates.EUR,
        GBPUSD: fx.data.rates.GBP,
        USDCHF: fx.data.rates.CHF,
        USDJPY: fx.data.rates.JPY,
        NZDUSD: fx.data.rates.NZD,
        CNYUSD: 1 / fx.data.rates.CNY,
        CADUSD: fx.data.rates.CAD,
        USDUSD: 1
      };

      setPrices(livePrices);
      addLog('Live prices updated.', 'success');
      return livePrices;
    } catch (error) {
      addLog(`Failed to fetch prices: ${error.message}`, 'error');
      console.error(error);
      return null;
    }
  };

  // Example contract interaction: fetch some data from deployed contracts
  const interactWithContracts = async () => {
    if (!provider || !signer) {
      addLog('Provider or signer missing. Connect your wallet.', 'error');
      return;
    }

    try {
      addLog('Interacting with contracts...');
      // Example: connect to a contract and call a read method
      // Replace with your actual ABI and addresses

      const exampleAbi = [
        "function totalSupply() view returns (uint256)",
        "function name() view returns (string)"
      ];
      const exampleAddress = contractAddresses?.governanceToken;

      if (!exampleAddress) {
        addLog('Governance token contract address missing.', 'warn');
        return;
      }

      const contract = new ethers.Contract(exampleAddress, exampleAbi, provider);

      const name = await contract.name();
      const totalSupply = await contract.totalSupply();

      addLog(`Contract ${name} total supply: ${ethers.utils.formatEther(totalSupply)}`, 'success');
    } catch (err) {
      addLog(`Contract interaction error: ${err.message}`, 'error');
      console.error(err);
    }
  };

  // Periodically fetch prices and interact with contracts
  useEffect(() => {
    let intervalId;

    const updateData = async () => {
      setIsFetching(true);
      await fetchLivePrices();
      await interactWithContracts();
      setIsFetching(false);
    };

    updateData(); // Initial fetch

    intervalId = setInterval(updateData, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [provider, signer, contractAddresses]);

  // Render logs with colors for level
  const renderLogEntry = (log, idx) => {
    let color = 'black';
    if (log.level === 'error') color = 'red';
    else if (log.level === 'warn') color = 'orange';
    else if (log.level === 'success') color = 'green';

    return (
      <div key={idx} style={{ color, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
        [{log.time}] {log.message}
      </div>
    );
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: 20 }}>
      <h2>🔄 Real-Time Contract Panel</h2>

      <div style={{ marginBottom: 20 }}>
        <button onClick={() => { fetchLivePrices(); interactWithContracts(); }} disabled={isFetching}>
          {isFetching ? 'Fetching...' : 'Refresh Now'}
        </button>
      </div>

      <section>
        <h3>📈 Live Prices</h3>
        <div style={{ maxHeight: 200, overflowY: 'auto', background: '#f7f7f7', padding: 10, borderRadius: 5 }}>
          {Object.entries(prices).map(([pair, price]) => (
            <div key={pair}>
              <strong>{pair}</strong>: {price ? price.toFixed(6) : 'Loading...'}
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h3>📝 Logs</h3>
        <div
          style={{
            height: 300,
            overflowY: 'scroll',
            backgroundColor: '#222',
            color: '#eee',
            padding: 10,
            borderRadius: 5,
            fontSize: 12,
            fontFamily: 'monospace'
          }}
        >
          {logs.length === 0 ? <div>No logs yet...</div> : logs.map(renderLogEntry)}
        </div>
      </section>
    </div>
  );
}
