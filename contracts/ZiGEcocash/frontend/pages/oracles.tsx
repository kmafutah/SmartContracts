import { useEffect, useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { ethers } from 'ethers';

const CRYPTO_ASSETS = ["BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD"];
const METAL_ASSETS = ["XAUUSD", "XPTUSD", "XPDUSD", "XAGUSD"];
const FOREX_ASSETS = ["EURUSD", "GBPUSD", "USDZAR", "USDJPY", "USDCHF", "USDCNH"];

const ASSET_CATEGORIES = [
  { label: 'Crypto', assets: CRYPTO_ASSETS, category: 'crypto' },
  { label: 'Metals', assets: METAL_ASSETS, category: 'metal' },
  { label: 'Forex', assets: FOREX_ASSETS, category: 'forex' },
];

export default function Oracles() {
  const { contracts, isConnected, connectWallet } = useWallet();
  const [assetData, setAssetData] = useState<any>({});
  const [alerts, setAlerts] = useState<any[]>([]);
  const [healthAlerts, setHealthAlerts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [validatorStatus, setValidatorStatus] = useState<string>('');
  const [aggregatorStatus, setAggregatorStatus] = useState<string>('');
  const [healthStatus, setHealthStatus] = useState<string>('');
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [loadingHealthAlerts, setLoadingHealthAlerts] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch asset prices, last update, validity
  useEffect(() => {
    const fetchAssets = async () => {
      if (!contracts.ZiGOracleHub) return;
      setLoadingAssets(true);
      const data: any = {};
      for (const { assets, category } of ASSET_CATEGORIES) {
        for (const asset of assets) {
          try {
            const [price, timestamp, isValid] = await contracts.ZiGOracleHub.getAssetPrice(asset, category);
            data[asset] = {
              price: Number(price) / 1e18,
              timestamp: Number(timestamp),
              isValid,
              category,
            };
          } catch {
            data[asset] = { price: null, timestamp: null, isValid: false, category };
          }
        }
      }
      setAssetData(data);
      setLoadingAssets(false);
    };
    fetchAssets();
  }, [contracts]);

  // Fetch alerts from OracleValidator
  useEffect(() => {
    const fetchAlerts = async () => {
      if (!contracts.OracleValidator) return;
      setLoadingAlerts(true);
      try {
        const alerts = await contracts.OracleValidator.getActiveAlerts();
        setAlerts(alerts);
      } catch {
        setAlerts([]);
      }
      setLoadingAlerts(false);
    };
    fetchAlerts();
  }, [contracts]);

  // Fetch alerts from OracleHealthMonitor
  useEffect(() => {
    const fetchHealthAlerts = async () => {
      if (!contracts.OracleHealthMonitor) return;
      setLoadingHealthAlerts(true);
      try {
        const alerts = await contracts.OracleHealthMonitor.getActiveAlerts();
        setHealthAlerts(alerts);
      } catch {
        setHealthAlerts([]);
      }
      setLoadingHealthAlerts(false);
    };
    fetchHealthAlerts();
  }, [contracts]);

  // Fetch historical price data for BTCUSD from OracleValidator
  useEffect(() => {
    const fetchHistory = async () => {
      if (!contracts.OracleValidator) return;
      setLoadingHistory(true);
      try {
        const history = await contracts.OracleValidator.getPriceHistory('BTCUSD');
        setHistory(history.map((p: any) => Number(p) / 1e18));
      } catch {
        setHistory([]);
      }
      setLoadingHistory(false);
    };
    fetchHistory();
  }, [contracts]);

  // Existing system status cards
  useEffect(() => {
    const fetchOracleData = async () => {
      if (!contracts.OracleValidator || !contracts.OracleAggregator || !contracts.OracleHealthMonitor) return;
      try {
        const [isValid, message] = await contracts.OracleValidator.validatePrice('BTCUSD', ethers.parseUnits('30000', 18));
        setValidatorStatus(isValid ? `BTCUSD valid: ${message}` : `BTCUSD invalid: ${message}`);
      } catch (e) {
        setValidatorStatus('Unavailable');
      }
      try {
        const agg = await contracts.OracleAggregator.getAggregatedPrice('BTCUSD');
        setAggregatorStatus(`BTCUSD: $${Number(agg[0]) / 1e18} (confidence: ${agg[2]})`);
      } catch (e) {
        setAggregatorStatus('Unavailable');
      }
      try {
        const status = await contracts.OracleHealthMonitor.getSystemStatus();
        setHealthStatus(status.overallHealthy ? 'Healthy' : `Unhealthy (${status.activeAlerts} alerts)`);
      } catch (e) {
        setHealthStatus('Unavailable');
      }
    };
    fetchOracleData();
  }, [contracts]);

  return (
    <div className="min-h-screen bg-panAfrican-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="font-bold text-2xl mb-6">Oracle Feeds</div>
        <div className="mb-8">
          <div className="font-bold text-lg mb-2">Live Oracle System Status</div>
          {!isConnected && (
            <button onClick={connectWallet} className="bg-blue-600 px-4 py-2 rounded text-white mb-4">Connect Wallet</button>
          )}
          <div className="bg-gray-800 rounded-xl p-4 mb-2">
            <div className="font-semibold">Validator:</div>
            <div className="text-sm">{validatorStatus}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 mb-2">
            <div className="font-semibold">Aggregator:</div>
            <div className="text-sm">{aggregatorStatus}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="font-semibold">Health Monitor:</div>
            <div className="text-sm">{healthStatus}</div>
          </div>
        </div>
        <div className="mb-8">
          <div className="font-bold text-lg mb-2">All Asset Feeds</div>
          {loadingAssets ? <div>Loading asset data...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ASSET_CATEGORIES.map(({ label, assets, category }) => (
                <div key={label}>
                  <div className="font-bold text-md mb-2">{label}</div>
                  <div className="space-y-2">
                    {assets.map(asset => (
                      <div key={asset} className="bg-panAfrican-green rounded p-3 flex flex-col">
                        <div className="font-mono text-sm">{asset}</div>
                        <div className="text-xs">Price: {assetData[asset]?.price ?? 'N/A'}</div>
                        <div className="text-xs">Last Update: {assetData[asset]?.timestamp ? new Date(assetData[asset].timestamp * 1000).toLocaleString() : 'N/A'}</div>
                        <div className="text-xs">Valid: {assetData[asset]?.isValid ? '✅' : '❌'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mb-8">
          <div className="font-bold text-lg mb-2">Detailed Alerts (Validator)</div>
          {loadingAlerts ? <div>Loading alerts...</div> : alerts.length === 0 ? <div>No active alerts.</div> : (
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <div key={i} className="bg-red-700 rounded p-3 text-xs">
                  <div><b>Asset:</b> {alert.asset}</div>
                  <div><b>Type:</b> {alert.alertType}</div>
                  <div><b>Message:</b> {alert.message}</div>
                  <div><b>Time:</b> {alert.timestamp ? new Date(Number(alert.timestamp) * 1000).toLocaleString() : 'N/A'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mb-8">
          <div className="font-bold text-lg mb-2">Detailed Alerts (Health Monitor)</div>
          {loadingHealthAlerts ? <div>Loading alerts...</div> : healthAlerts.length === 0 ? <div>No active alerts.</div> : (
            <div className="space-y-2">
              {healthAlerts.map((alert, i) => (
                <div key={i} className="bg-yellow-700 rounded p-3 text-xs">
                  <div><b>Type:</b> {alert.alertType}</div>
                  <div><b>Message:</b> {alert.message}</div>
                  <div><b>Severity:</b> {alert.severity}</div>
                  <div><b>Time:</b> {alert.timestamp ? new Date(Number(alert.timestamp) * 1000).toLocaleString() : 'N/A'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mb-8">
          <div className="font-bold text-lg mb-2">BTCUSD Historical Prices (Validator)</div>
          {loadingHistory ? <div>Loading history...</div> : history.length === 0 ? <div>No history.</div> : (
            <div className="flex flex-wrap gap-2">
              {history.map((price, i) => (
                <div key={i} className="bg-gray-700 rounded p-2 text-xs">{price}</div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-8 text-sm text-gray-300">
          <b>Fallback mechanism:</b> If a feed fails, the system automatically switches to the next available oracle.
        </div>
      </div>
    </div>
  );
} 