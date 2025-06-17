import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import RealTimeContractPanel from './RealTimeContractPanel';


const ZiGTDashboard = ({ isConnected, account, zigtContract, reparationsContract, bandFeedRegistryContract }) => {
  const [zigtBalance, setZigtBalance] = useState('0');
  const [zigtValue, setZigtValue] = useState('0');
  const [assetPrices, setAssetPrices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [log, setLog] = useState([]);

  const getSigner = async () => {
    if (!window.ethereum) throw new Error('MetaMask not detected');
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return signer;
  };

  useEffect(() => {
    if (isConnected && account && zigtContract && reparationsContract) {
      loadZiGTData();
    }
  }, [isConnected, account, zigtContract, reparationsContract]);

    const loadZiGTData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch data from ZiGT contract
      const balance = await zigtContract.balanceOf(account);
      const value = await zigtContract.calculateZiGTValue();
      
      // Fetch prices using Band Feed Registry
      const assetSymbols = ['BTCUSD', 'ETHUSD', 'XAUUSD', 'ZAR', 'XOF'];
      const pricesData = [];
      
      for (const symbol of assetSymbols) {
        try {
          const feedAddress = await bandFeedRegistryContract.getFeedAddress(symbol);
          const feedContract = new ethers.Contract(
            feedAddress,
            [
              "function getLatestPrice() view returns (uint256)",
              "function decimals() view returns (uint8)"
            ],
            zigtContract.runner
          );
          
          const price = await feedContract.getLatestPrice();
          const decimals = await feedContract.decimals();
          const formattedPrice = ethers.formatUnits(price, decimals);
          
          pricesData.push({
            symbol,
            price: formattedPrice
          });
        } catch (err) {
          console.error(`Error fetching price for ${symbol}:`, err);
          pricesData.push({
            symbol,
            price: 'N/A'
          });
        }
      }

      setZigtBalance(ethers.formatUnits(balance, 18));
      setZigtValue(ethers.formatUnits(value, 18));
      setAssetPrices(pricesData);

      setLog(prev => [...prev, "✅ Successfully loaded ZiGT data"]);
    } catch (err) {
      setLog(prev => [...prev, `❌ Error: ${err.message}`]);
      console.error('Error loading ZiGT data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkInitialization = async () => {
    try {
      const version = await zigtContract.version();
      console.log('Contract Version:', version);
      const bandFeedRegistry = await zigtContract.bandFeedRegistry();
      console.log('Band Feed Registry:', bandFeedRegistry);
      const governance = await zigtContract.governance();
      console.log('Governance:', governance);
      const ratio = await zigtContract.selectedRatio();
      console.log('Selected Ratio:', ratio);
      const direction = await zigtContract.selectedDirection();
      console.log('Selected Direction:', direction);
      setLog(prev => [...prev, '✅ Checked contract initialization']);
    } catch (err) {
      console.error('Initialization Check Error:', err);
      setLog(prev => [...prev, `❌ Initialization check failed: ${err.message}`]);
    }
  };

  const checkOracles = async () => {
    try {
      const assetKeys = [
        ethers.keccak256(ethers.toUtf8Bytes('XAUUSD')),
        ethers.keccak256(ethers.toUtf8Bytes('BTCUSD')),
        ethers.keccak256(ethers.toUtf8Bytes('ETHUSD'))
      ];
      for (const key of assetKeys) {
        const oracle = await zigtContract.assetOracles(key);
        const price = await zigtContract.cachedPrice(key);
        const timestamp = await zigtContract.cachedTimestamp(key);
        console.log(`Asset Key: ${key}`);
        console.log('Oracle Config:', oracle);
        console.log('Cached Price:', price.toString());
        console.log('Cached Timestamp:', timestamp.toString());
      }
      setLog(prev => [...prev, '✅ Checked oracles']);
    } catch (err) {
      console.error('Oracle Check Error:', err);
      setLog(prev => [...prev, `❌ Oracle check failed: ${err.message}`]);
    }
  };

  const testFunctions = async () => {
    try {
      const balance = await zigtContract.balanceOf(account);
      console.log('Balance:', ethers.formatUnits(balance, 18));
      try {
        const [symbols, prices, timestamps] = await zigtContract.getAllPrices();
        const pricesData = symbols.map((sym, i) => ({
          symbol: sym,
          price: ethers.formatUnits(prices[i], 18),
          timestamp: timestamps[i].toString()
        }));
        console.log('Get All Prices:', pricesData);
        setLog(prev => [...prev, `✅ getAllPrices: ${JSON.stringify(pricesData)}`]);
      } catch (getPricesErr) {
        console.error('getAllPrices failed:', getPricesErr);
        setLog(prev => [...prev, `❌ getAllPrices failed: ${getPricesErr.message}`]);
      }
      setLog(prev => [...prev, '✅ Tested balanceOf']);
    } catch (err) {
      console.error('Test Functions Error:', err);
      setLog(prev => [...prev, `❌ Function test failed: ${err.message}`]);
    }
  };

  const checkBandFeeds = async () => {
    try {
      const signer = await getSigner();
      const bandFeedRegistry = new ethers.Contract(
        '0xfD9e4c97Bc38b56d4b87203087e7450E4D01236D',
        ['function getFeedAddress(string memory assetPair) external view returns (address)'],
        signer
      );
      const assetPairs = ['XAUUSD', 'BTCUSD', 'ETHUSD'];
      for (const pair of assetPairs) {
        try {
          const feedAddress = await bandFeedRegistry.getFeedAddress(pair);
          console.log(`Feed for ${pair}: ${feedAddress}`);
          setLog(prev => [...prev, `Feed for ${pair}: ${feedAddress}`]);
        } catch (err) {
          console.error(`Failed to get feed for ${pair}:`, err);
          setLog(prev => [...prev, `❌ Feed for ${pair}: ${err.message}`]);
        }
      }
      setLog(prev => [...prev, '✅ Checked Band feeds']);
    } catch (err) {
      console.error('Band Feed Check Error:', err);
      setLog(prev => [...prev, `❌ Band feed check failed: ${err.message}`]);
    }
  };

  const setupOracles = async () => {
    try {
      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      if (signerAddress.toLowerCase() !== '0x8DB03A3b8fBa6111835EA62E2a0652EF27224F1A'.toLowerCase()) {
        throw new Error('Signer is not governance address');
      }
      const zigtWithGovernance = zigtContract.connect(signer);
      const assetKeys = [
        ethers.keccak256(ethers.toUtf8Bytes('XAUUSD')),
        ethers.keccak256(ethers.toUtf8Bytes('BTCUSD')),
        ethers.keccak256(ethers.toUtf8Bytes('ETHUSD'))
      ];
      const bandFeedRegistryAddress = await zigtContract.bandFeedRegistry();
      const bandFeedRegistry = new ethers.Contract(
        bandFeedRegistryAddress,
        ['function getFeedAddress(string) view returns (address)'],
        signer
      );
      for (const key of assetKeys) {
        const symbol = ['XAUUSD', 'BTCUSD', 'ETHUSD'][assetKeys.indexOf(key)];
        const bandFeed = await bandFeedRegistry.getFeedAddress(symbol);
        const tx = await zigtWithGovernance.setOracle(key, {
          chainlinkFeed: ethers.ZeroAddress,
          bandFeed: bandFeed,
          maxPriceAge: 3600,
          decimals: 18,
          description: `Price for ${symbol}`
        });
        await tx.wait();
        console.log(`Oracle set for ${symbol}`);
        setLog(prev => [...prev, `✅ Oracle set for ${symbol}`]);
      }
      setLog(prev => [...prev, '✅ Oracles updated']);
    } catch (err) {
      console.error('Oracle Setup Error:', err);
      setLog(prev => [...prev, `❌ Oracle setup failed: ${err.message}`]);
    }
  };

  const updateGovernance = async () => {
    try {
      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      if (signerAddress.toLowerCase() !== '0x8DB03A3b8fBa6111835EA62E2a0652EF27224F1A'.toLowerCase()) {
        throw new Error('Signer is not current governance address');
      }
      const zigtWithGovernance = zigtContract.connect(signer);
      const tx = await zigtWithGovernance.setGovernance('0xE0282D77cF60BA484e13d24fd5686A6618F09A3B');
      await tx.wait();
      console.log('Governance updated to 0xE0282D77...');
      setLog(prev => [...prev, '✅ Governance updated to 0xE0282D77...']);
    } catch (err) {
      console.error('Governance Update Error:', err);
      setLog(prev => [...prev, `❌ Governance update failed: ${err.message}`]);
    }
  };

  const checkReparationsOracles = async () => {
    try {
      const signer = await getSigner();
      const oracleRouterAddress = await reparationsContract.oracleRouter();
      console.log('Oracle Router:', oracleRouterAddress);
      const oracleRouter = new ethers.Contract(
        oracleRouterAddress,
        ['function getRate(string memory symbol) view returns (uint256 rate, uint8 decimals)'],
        signer
      );
      const symbols = ['XAU', 'USD', 'BTC', 'ETH', 'XOF', 'ZAR'];
      for (const symbol of symbols) {
        try {
          const [rate, decimals] = await oracleRouter.getRate(symbol);
          console.log(`Symbol: ${symbol}, Rate: ${rate.toString()}, Decimals: ${decimals}`);
          setLog(prev => [...prev, `Symbol: ${symbol}, Rate: ${ethers.formatUnits(rate, decimals)}`]);
        } catch (err) {
          console.error(`Failed to get rate for ${symbol}:`, err);
          setLog(prev => [...prev, `❌ Rate for ${symbol}: ${err.message}`]);
        }
      }
      setLog(prev => [...prev, '✅ Checked reparations oracles']);
    } catch (err) {
      console.error('Reparations Oracle Check Error:', err);
      setLog(prev => [...prev, `❌ Reparations oracle check failed: ${err.message}`]);
    }
  };

  const mintZiGT = async (amount) => {
    try {
      setIsLoading(true);
      if (!reparationsContract) throw new Error('Reparations contract not initialized');
      if (!amount || isNaN(amount) || Number(amount) <= 0) throw new Error('Invalid amount');
      const signer = await getSigner();
      const reparationsWithSigner = reparationsContract.connect(signer);
      const tx = await reparationsWithSigner.mint(ethers.parseUnits(amount, 18));
      await tx.wait();
      setLog(prev => [...prev, `✅ Minted ${amount} ZiGT | Tx: ${tx.hash}`]);
      loadZiGTData();
    } catch (err) {
      setLog(prev => [...prev, `❌ Mint failed: ${err.message}`]);
      console.error('Mint error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
      <h2 className="text-2xl font-bold text-blue-700 mb-4">ZiGT Ecosystem Dashboard</h2>
      {isConnected ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-700">Your ZiGT Balance</h3>
              <p className="text-2xl font-bold">{zigtBalance} ZiGT</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-700">Current Value</h3>
              <p className="text-2xl font-bold">${zigtValue}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-2">Mint ZiGT Tokens</h3>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Amount"
                className="px-3 py-2 border rounded-lg w-32"
                id="mintAmount"
                min="0.01"
                step="0.01"
              />
              <button
                onClick={() => {
                  const amount = document.getElementById('mintAmount').value;
                  if (amount) mintZiGT(amount);
                }}
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg ${isLoading ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'} text-white`}
              >
                {isLoading ? 'Processing...' : 'Mint'}
              </button>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-2">Asset Prices</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {assetPrices.map((asset, i) => (
                <div key={i} className="p-2 bg-gray-100 rounded">
                  <span className="font-medium">{asset.symbol}: </span>${asset.price} (at {asset.timestamp})
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-2">Debug Tools</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={checkInitialization}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Check Initialization
              </button>
              <button
                onClick={checkOracles}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Check Oracles
              </button>
              <button
                onClick={testFunctions}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Test Functions
              </button>
              <button
                onClick={checkBandFeeds}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Check Band Feeds
              </button>
              <button
                onClick={setupOracles}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Setup Oracles
              </button>
              <button
                onClick={updateGovernance}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Governance
              </button>
              <button
                onClick={checkReparationsOracles}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Check Reparations Oracles
              </button>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-lg font-bold mb-2">Activity Log</h4>
            <ul className="text-sm bg-white border rounded-lg p-3 max-h-60 overflow-y-auto space-y-1">
              {log.map((entry, i) => (
                <li key={i} className="whitespace-nowrap">{entry}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="text-gray-600">Please connect your wallet to interact with the ZiGT ecosystem</p>
      )}
    </div>
  );
};

export default ZiGTDashboard;