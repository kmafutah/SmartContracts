const redistributions = [
  { id: 12, time: '2 hrs ago', amount: '23.5 ZIG' },
  { id: 11, time: '1 day ago', amount: '18.2 ZIG' },
  { id: 10, time: '2 days ago', amount: '20.0 ZIG' },
];

export default function Vault() {
  return (
    <div className="min-h-screen bg-panAfrican-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="font-bold text-2xl mb-6">Vault & Redistribution</div>
        <div className="bg-panAfrican-green rounded-xl p-6 shadow-lg flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1">
              <div className="font-bold mb-2">Vault Balance</div>
              <div className="text-3xl font-mono mb-2">1,234.56 ZIG</div>
              <button className="bg-panAfrican-gold text-black font-bold py-2 px-4 rounded-lg">Claim Share</button>
            </div>
            <div className="w-32 h-32 rounded-full bg-panAfrican-gold opacity-70 flex items-center justify-center">
              <span className="text-black font-bold">Pie</span>
            </div>
          </div>
          <div>
            <div className="font-bold mb-2">Upcoming Redistributions</div>
            <ul className="text-sm">
              <li>Redistribution #13 <span className="float-right text-gray-400">in 3 days</span></li>
            </ul>
          </div>
          <div>
            <div className="font-bold mb-2">Redistribution History</div>
            <ul className="text-sm">
              {redistributions.map(r => (
                <li key={r.id}>Redistribution #{r.id} - {r.amount} <span className="float-right text-gray-400">{r.time}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 