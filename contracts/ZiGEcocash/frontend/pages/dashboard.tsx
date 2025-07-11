import React from 'react';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '../lib/contracts';
import { useNotification } from '../components/Notification';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useWallet } from '../hooks/useWallet';

// Network configuration for Polygon zkEVM
const NETWORK_CONFIG = {
  chainId: '0x44d', // 1101 in hex
  chainName: 'Polygon zkEVM',
  rpcUrl: 'https://zkevm-rpc.com',
  explorerUrl: 'https://zkevm.polygonscan.com/',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  }
};

export default function Dashboard() {
  const notify = useNotification();
  const { isConnected, account, provider, signer, contracts, connectWallet } = useWallet();
  const [balances, setBalances] = useState<{ [k: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [vaultBalance, setVaultBalance] = useState('0');
  const [vaultLoading, setVaultLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [utilityBalances, setUtilityBalances] = useState<{ [id: number]: string }>({});
  const [userCollateralZiG, setUserCollateralZiG] = useState('0');
  const [userCollateralZiGT, setUserCollateralZiGT] = useState('0');
  const [userMintedZiG, setUserMintedZiG] = useState('0');
  const [userMintedZiGT, setUserMintedZiGT] = useState('0');
  const [zigPrice, setZigPrice] = useState<string | null>(null);
  const [zigtPrice, setZigtPrice] = useState<string | null>(null);
  const [utilityPrices, setUtilityPrices] = useState<{ [id: number]: string | null }>({});
  const [govPrice, setGovPrice] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Switch to correct network
  const switchToZkEVM = async () => {
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NETWORK_CONFIG.chainId }]
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: NETWORK_CONFIG.chainId,
              chainName: NETWORK_CONFIG.chainName,
              nativeCurrency: NETWORK_CONFIG.nativeCurrency,
              rpcUrls: [NETWORK_CONFIG.rpcUrl],
              blockExplorerUrls: [NETWORK_CONFIG.explorerUrl]
            }]
          });
        } catch (addError: any) {
          throw new Error('Failed to add Polygon zkEVM network');
        }
      } else {
        throw new Error('Failed to switch to Polygon zkEVM');
      }
    }
  };

  // Connect wallet function
  const claimVaultShare = async () => {
    if (!signer) {
      notify('Please connect your wallet first', 'error');
      return;
    }

    try {
      const vaultContract = new ethers.Contract(
        CONTRACTS.Vault.address,
        CONTRACTS.Vault.abi,
        signer
      );
      
      const tx = await vaultContract.claim();
      await tx.wait();
      notify('Vault share claimed successfully!', 'success');
      
      // Refresh balances
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      notify(`Failed to claim vault share: ${error.message}`, 'error');
    }
  };

  // Deposit to vault function
  const depositToVault = async () => {
    if (!signer) {
      notify('Please connect your wallet first', 'error');
      return;
    }

    try {
      const vaultContract = new ethers.Contract(
        CONTRACTS.Vault.address,
        CONTRACTS.Vault.abi,
        signer
      );
      
      const zigContract = new ethers.Contract(
        CONTRACTS.ZiG.address,
        CONTRACTS.ZiG.abi,
        signer
      );
      
      // Approve first
      const approveTx = await zigContract.approve(vaultContract.target, ethers.MaxUint256);
      await approveTx.wait();
      
      // Deposit 1000 ZiG tokens
      const depositAmount = ethers.parseUnits('1000', 18);
      const tx = await vaultContract.deposit(depositAmount);
      await tx.wait();
      notify('Successfully deposited to vault!', 'success');
      
      // Refresh balances
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      notify(`Failed to deposit to vault: ${error.message}`, 'error');
    }
  };

  // Fetch balances using provider (read-only)
  useEffect(() => {
    async function fetchBalances() {
      if (!isConnected || !account || !provider) return;
      
      setLoading(true);
      try {
        const newBalances: { [k: string]: string } = {};
        const newUtilityBalances: { [id: number]: string } = {};
        
        // Fetch balances for main tokens using provider (read-only)
        const contractsToCheck = ['ZiG', 'ZiGT', 'ZiGUtilityToken', 'ZiGGovernanceToken'];
        
        for (const contractName of contractsToCheck) {
          try {
            const contractConfig = CONTRACTS[contractName as keyof typeof CONTRACTS];
            if (contractConfig && contractConfig.abi && contractConfig.abi.length > 0) {
              if (contractName === 'ZiGUtilityToken') {
                // ERC1155: fetch all defined IDs
                const utilityIds = [1, 2, 3, 4];
                const contract = new ethers.Contract(
                  contractConfig.address,
                  contractConfig.abi,
                  provider
                );
                for (const id of utilityIds) {
                  const balance = await contract.balanceOf(account, id);
                  newUtilityBalances[id] = ethers.formatUnits(balance, contractConfig.decimals);
                }
              } else {
                const contract = new ethers.Contract(
                  contractConfig.address,
                  contractConfig.abi,
                  provider
                );
                const balance = await contract.balanceOf(account);
                newBalances[contractName] = ethers.formatUnits(balance, contractConfig.decimals);
              }
            }
          } catch (e) {
            console.error(`Failed to fetch ${contractName} balance:`, e);
            if (contractName === 'ZiGUtilityToken') {
              [1,2,3,4].forEach(id => newUtilityBalances[id] = '0');
            } else {
              newBalances[contractName] = '0';
            }
          }
        }
        setBalances(newBalances);
        setUtilityBalances(newUtilityBalances);
      } catch (e: any) {
        notify('Failed to fetch balances', 'error');
        console.error('Balance fetch error:', e);
      } finally {
        setLoading(false);
      }
    }
    
    fetchBalances();
  }, [isConnected, account, provider, notify]);

  // Fetch vault balance
  useEffect(() => {
    async function fetchVaultBalance() {
      if (!isConnected || !account || !contracts.Vault) return;
      
      setVaultLoading(true);
      try {
        const vaultContract = contracts.Vault;
        const balance = await vaultContract.balanceOf(account);
        setVaultBalance(ethers.formatUnits(balance, 18));
      } catch (e) {
        console.error('Failed to fetch vault balance:', e);
        setVaultBalance('0');
      } finally {
        setVaultLoading(false);
      }
    }
    
    fetchVaultBalance();
  }, [isConnected, account, contracts]);

  // Fetch vault data for user
  useEffect(() => {
    async function fetchVaultUserData() {
      if (!isConnected || !account || !contracts.Vault) return;
      setVaultLoading(true);
      try {
        const vaultContract = contracts.Vault;
        // getTotalCollateralValueForZiG and getTotalCollateralValueForZiGT return uint256
        const [collateralZiG, collateralZiGT, mintedZiG, mintedZiGT] = await Promise.all([
          vaultContract.getTotalCollateralValueForZiG(account),
          vaultContract.getTotalCollateralValueForZiGT(account),
          vaultContract.userMintedZiG(account),
          vaultContract.userMintedZiGT(account),
        ]);
        setUserCollateralZiG(ethers.formatUnits(collateralZiG, 18));
        setUserCollateralZiGT(ethers.formatUnits(collateralZiGT, 18));
        setUserMintedZiG(ethers.formatUnits(mintedZiG, 18));
        setUserMintedZiGT(ethers.formatUnits(mintedZiGT, 18));
      } catch (e) {
        console.error('Failed to fetch vault user data:', e);
        setUserCollateralZiG('0');
        setUserCollateralZiGT('0');
        setUserMintedZiG('0');
        setUserMintedZiGT('0');
      } finally {
        setVaultLoading(false);
      }
    }
    fetchVaultUserData();
  }, [isConnected, account, contracts]);

  // Claim vault share function
  // Deposit to vault function

  // Fetch token prices from OracleHub
  useEffect(() => {
    async function fetchPrices() {
      if (!provider) return;
      try {
        const oracleHub = new ethers.Contract(
          CONTRACTS.ZiGOracleHub.address,
          CONTRACTS.ZiGOracleHub.abi,
          provider
        );
        // ZiG price (in USD, 18 decimals)
        const zigPriceRaw = await oracleHub.calculateZiGPrice();
        setZigPrice(ethers.formatUnits(zigPriceRaw, 18));
        // ZiGT price (if available)
        try {
          const zigtPriceRaw = await oracleHub.getTokenPrice(CONTRACTS.ZiGT.address);
          setZigtPrice(ethers.formatUnits(zigtPriceRaw, 18));
        } catch (e) {
          setZigtPrice(null);
        }
        // Governance Token price
        try {
          const govPriceRaw = await oracleHub.getTokenPrice(CONTRACTS.ZiGGovernanceToken.address);
          setGovPrice(ethers.formatUnits(govPriceRaw, 18));
        } catch (e) {
          setGovPrice(null);
        }
        // Utility Token prices (for each ID)
        const utilityIds = [1, 2, 3, 4];
        const newUtilityPrices: { [id: number]: string | null } = {};
        for (const id of utilityIds) {
          try {
            const priceRaw = await oracleHub.getTokenPrice(CONTRACTS.ZiGUtilityToken.address);
            newUtilityPrices[id] = ethers.formatUnits(priceRaw, 18);
          } catch (e) {
            newUtilityPrices[id] = null;
          }
        }
        setUtilityPrices(newUtilityPrices);
      } catch (e) {
        setZigPrice(null);
        setZigtPrice(null);
        setGovPrice(null);
        setUtilityPrices({});
      }
    }
    fetchPrices();
  }, [provider]);

  // Fetch recent activity for the user from Vault events
  useEffect(() => {
    async function fetchRecentActivity() {
      if (!provider || !account) return;
      try {
        const vaultIface = new ethers.Interface(CONTRACTS.Vault.abi);
        const vaultAddress = CONTRACTS.Vault.address;
        const vault = new ethers.Contract(vaultAddress, CONTRACTS.Vault.abi, provider);
        const currentBlock = await provider.getBlockNumber();
        // Look back over the last 5000 blocks for recent events
        const fromBlock = Math.max(currentBlock - 5000, 0);
        const topics = [
          // Only interested in events with user indexed
          vaultIface.getEventName('CollateralDeposited'),
          vaultIface.getEventName('CollateralWithdrawn'),
          vaultIface.getEventName('ZiGMinted'),
          vaultIface.getEventName('ZiGTMinted'),
          vaultIface.getEventName('ZiGBurned'),
          vaultIface.getEventName('ZiGTBurned'),
        ].filter(Boolean) as string[];
        // Fetch logs for each event type
        const logs = await provider.getLogs({
          address: vaultAddress,
          fromBlock,
          toBlock: 'latest',
        });
        // Parse and filter logs for this user
        const userActivity = logs
          .map(log => {
            try {
              const parsed = vaultIface.parseLog(log);
              // Only include if user is involved
              if (
                parsed &&
                (
                  (parsed.args.user && parsed.args.user.toLowerCase() === account.toLowerCase()) ||
                  (parsed.args.from && parsed.args.from.toLowerCase() === account.toLowerCase())
                )
              ) {
                return {
                  type: parsed.name,
                  args: parsed.args,
                  blockNumber: log.blockNumber,
                  txHash: log.transactionHash,
                };
              }
              return null;
            } catch (e) {
              return null;
            }
          })
          .filter(Boolean)
          .sort((a, b) => b!.blockNumber - a!.blockNumber)
          .slice(0, 10); // Most recent 10
        setRecentActivity(userActivity as any[]);
      } catch (e) {
        setRecentActivity([]);
      }
    }
    fetchRecentActivity();
  }, [provider, account]);

  return (
    <div className="min-h-screen bg-panAfrican-black text-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-panAfrican-green p-4 flex flex-col gap-4">
        <div className="text-2xl font-bold mb-6">ZiGVerse</div>
        <nav className="flex flex-col gap-3">
          <a href="/dashboard" className="font-semibold">Dashboard</a>
          <a href="/identity">Identity</a>
          <a href="/tokens">Tokens</a>
          <a href="/oracles">Oracles</a>
          <a href="/dao">DAO</a>
          <a href="/nfts">NFTs</a>
          <a href="/vault">Vault</a>
        </nav>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 flex flex-col gap-6">
        {/* Top Bar */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {isConnected ? `Network: Polygon zkEVM` : 'Please connect wallet'}
          </div>
          <button
            onClick={connectWallet}
            className={`px-6 py-2 rounded-lg font-bold transition-colors ${
              isConnected 
                ? 'bg-panAfrican-gold text-black' 
                : 'bg-panAfrican-crimson text-white hover:bg-red-700'
            }`}
          >
            {isConnected && account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect Wallet'}
          </button>
        </div>

        {/* SoulReparationNFT Card */}
        <div className="bg-panAfrican-black rounded-xl p-6 flex items-center gap-4 shadow-lg">
          <div className="w-20 h-20 rounded-full bg-panAfrican-crimson flex items-center justify-center">
            <span className="text-4xl">🧑🏾‍🦱</span>
          </div>
          <div>
            <div className="text-xl font-serif font-bold">SoulReparationNFT</div>
            <div className="flex items-center gap-2 text-green-400 font-semibold">
              <span>Verified</span>
              <span className="w-3 h-3 bg-green-400 rounded-full inline-block"></span>
            </div>
          </div>
        </div>

        {/* Live Balances */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <BalanceCard 
            label="ZIG" 
            value={loading ? <LoadingSpinner size="sm" /> : balances.ZiG || '0'} 
            usd={zigPrice && balances.ZiG ? `$${(parseFloat(zigPrice) * parseFloat(balances.ZiG)).toFixed(2)}` : 'N/A'} 
            color="gold" 
          />
          <BalanceCard 
            label="ZiGT" 
            value={loading ? <LoadingSpinner size="sm" /> : balances.ZiGT || '0'} 
            usd={zigtPrice && balances.ZiGT ? `$${(parseFloat(zigtPrice) * parseFloat(balances.ZiGT)).toFixed(2)}` : 'N/A'} 
            color="gold" 
          />
          <BalanceCard 
            label="Utility: Transaction Fee" 
            value={loading ? <LoadingSpinner size="sm" /> : utilityBalances[1] || '0'} 
            usd={utilityPrices[1] && utilityBalances[1] ? `$${(parseFloat(utilityPrices[1]!) * parseFloat(utilityBalances[1])).toFixed(2)}` : 'N/A'} 
            color="green" 
          />
          <BalanceCard 
            label="Utility: Staking Reward" 
            value={loading ? <LoadingSpinner size="sm" /> : utilityBalances[2] || '0'} 
            usd={utilityPrices[2] && utilityBalances[2] ? `$${(parseFloat(utilityPrices[2]!) * parseFloat(utilityBalances[2])).toFixed(2)}` : 'N/A'} 
            color="green" 
          />
          <BalanceCard 
            label="Utility: Governance Bonus" 
            value={loading ? <LoadingSpinner size="sm" /> : utilityBalances[3] || '0'} 
            usd={utilityPrices[3] && utilityBalances[3] ? `$${(parseFloat(utilityPrices[3]!) * parseFloat(utilityBalances[3])).toFixed(2)}` : 'N/A'} 
            color="green" 
          />
          <BalanceCard 
            label="Utility: Cultural Access" 
            value={loading ? <LoadingSpinner size="sm" /> : utilityBalances[4] || '0'} 
            usd={utilityPrices[4] && utilityBalances[4] ? `$${(parseFloat(utilityPrices[4]!) * parseFloat(utilityBalances[4])).toFixed(2)}` : 'N/A'} 
            color="green" 
          />
          <BalanceCard 
            label="Governance Token" 
            value={loading ? <LoadingSpinner size="sm" /> : balances.ZiGGovernanceToken || '0'} 
            usd={govPrice && balances.ZiGGovernanceToken ? `$${(parseFloat(govPrice) * parseFloat(balances.ZiGGovernanceToken)).toFixed(2)}` : 'N/A'} 
            color="crimson" 
          />
        </div>

        {/* Vault & Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-panAfrican-black rounded-xl p-6 flex flex-col gap-4 shadow-lg">
            <div className="font-bold mb-2">Vault</div>
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <div className="w-32 h-32 rounded-full bg-panAfrican-gold opacity-70 flex items-center justify-center mb-2">
                <span className="text-black font-bold text-lg">
                  {vaultLoading ? <LoadingSpinner size="sm" color="black" /> : `${parseFloat(userCollateralZiG).toFixed(2)} (ZiG)`}
                </span>
              </div>
              <div className="w-32 h-32 rounded-full bg-panAfrican-gold opacity-70 flex items-center justify-center mb-2">
                <span className="text-black font-bold text-lg">
                  {vaultLoading ? <LoadingSpinner size="sm" color="black" /> : `${parseFloat(userCollateralZiGT).toFixed(2)} (ZiGT)`}
                </span>
              </div>
              <div className="text-sm text-gray-200">
                {vaultLoading ? <LoadingSpinner size="sm" /> : `Minted ZiG: ${parseFloat(userMintedZiG).toFixed(4)}`}
              </div>
              <div className="text-sm text-gray-200">
                {vaultLoading ? <LoadingSpinner size="sm" /> : `Minted ZiGT: ${parseFloat(userMintedZiGT).toFixed(4)}`}
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={depositToVault}
                className="flex-1 bg-panAfrican-green text-white font-bold py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Deposit 1000 ZiG
              </button>
              <button 
                onClick={claimVaultShare}
                className="flex-1 bg-panAfrican-gold text-black font-bold py-2 rounded-lg hover:bg-yellow-400 transition-colors"
              >
                Claim Share
              </button>
            </div>
          </div>
          <div className="bg-panAfrican-black rounded-xl p-6 flex flex-col gap-4 shadow-lg">
            <div className="font-bold mb-2">Recent Activity</div>
            <ul className="text-sm">
              {recentActivity.length === 0 && <li>No recent activity found.</li>}
              {recentActivity.map((act, idx) => (
                <li key={act.txHash + idx} className="mb-1">
                  <span className="font-bold">{act.type.replace(/([A-Z])/g, ' $1').trim()}</span>
                  {act.type === 'CollateralDeposited' && (
                    <>: Deposited {ethers.formatUnits(act.args.amount, 18)} {act.args.forZiG ? 'for ZiG' : 'for ZiGT'}</>
                  )}
                  {act.type === 'CollateralWithdrawn' && (
                    <>: Withdrew {ethers.formatUnits(act.args.amount, 18)} {act.args.forZiG ? 'for ZiG' : 'for ZiGT'}</>
                  )}
                  {act.type === 'ZiGMinted' && (
                    <>: Minted {ethers.formatUnits(act.args.amount, 18)} ZiG</>
                  )}
                  {act.type === 'ZiGTMinted' && (
                    <>: Minted {ethers.formatUnits(act.args.amount, 18)} ZiGT</>
                  )}
                  {act.type === 'ZiGBurned' && (
                    <>: Burned {ethers.formatUnits(act.args.amount, 18)} ZiG</>
                  )}
                  {act.type === 'ZiGTBurned' && (
                    <>: Burned {ethers.formatUnits(act.args.amount, 18)} ZiGT</>
                  )}
                  <span className="float-right text-gray-400">Block {act.blockNumber}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

function BalanceCard({ label, value, usd, color }: { label: string; value: any; usd: string; color: string }) {
  const colorMap: Record<string, string> = {
    gold: 'bg-panAfrican-gold text-black',
    green: 'bg-panAfrican-green text-white',
    crimson: 'bg-panAfrican-crimson text-white',
  };
  let displayValue = value;
  if (typeof value === 'string' && !isNaN(Number(value))) {
    displayValue = parseFloat(value).toFixed(4);
  }
  if (typeof value === 'number') {
    displayValue = value.toFixed(4);
  }
  return (
    <div className={`rounded-xl p-4 flex flex-col items-start shadow-lg ${colorMap[color]}`}>
      <div className="font-bold text-lg">{label}</div>
      <div className="text-2xl font-mono">{displayValue}</div>
      <div className="text-xs opacity-80">{usd}</div>
    </div>
  );
}