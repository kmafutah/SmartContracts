const feeds = [
  { name: 'ZiGOracleHub', pair: 'ZiG/USD', decimals: 18, source: 'On-chain' },
  { name: 'MultiOracle', pair: 'Gold/USD', decimals: 8, source: 'Band Protocol' },
  { name: 'LiveBandFeed', pair: 'ETH/USD', decimals: 8, source: 'Band Protocol' },
  { name: 'FeedRegistry', pair: 'BTC/USD', decimals: 8, source: 'Chainlink' },
];

export default function Oracles() {
  return (
    <div className="min-h-screen bg-panAfrican-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="font-bold text-2xl mb-6">Oracle Feeds</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feeds.map(feed => (
            <div key={feed.name} className="bg-panAfrican-green rounded-xl p-4 shadow-lg flex flex-col gap-2">
              <div className="font-bold text-lg">{feed.name}</div>
              <div className="text-sm">Pair: <span className="font-mono">{feed.pair}</span></div>
              <div className="text-sm">Decimals: {feed.decimals}</div>
              <div className="text-sm">Source: {feed.source}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 text-sm text-gray-300">
          <b>Fallback mechanism:</b> If a feed fails, the system automatically switches to the next available oracle.
        </div>
      </div>
    </div>
  );
} 