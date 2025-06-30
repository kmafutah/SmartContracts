const proposals = [
  { id: 1, title: 'Redistribute Vault Surplus', status: 'Active', votesFor: 120, votesAgainst: 10 },
  { id: 2, title: 'Fund Community Project', status: 'Pending', votesFor: 80, votesAgainst: 5 },
];

export default function DAO() {
  return (
    <div className="min-h-screen bg-panAfrican-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="font-bold text-2xl mb-6">Reparations DAO</div>
        <div className="flex flex-col gap-4">
          {proposals.map(p => (
            <div key={p.id} className="bg-panAfrican-green rounded-xl p-4 shadow-lg flex flex-col gap-2">
              <div className="font-bold text-lg">{p.title}</div>
              <div className="text-sm">Status: <span className="font-mono">{p.status}</span></div>
              <div className="flex gap-2 mt-2">
                <button className="bg-panAfrican-gold text-black font-bold py-1 px-3 rounded-lg">Vote For</button>
                <button className="bg-panAfrican-crimson text-white font-bold py-1 px-3 rounded-lg">Vote Against</button>
              </div>
              <div className="text-xs mt-2">For: {p.votesFor} | Against: {p.votesAgainst}</div>
            </div>
          ))}
        </div>
        <button className="mt-8 bg-panAfrican-gold text-black font-bold py-2 px-4 rounded-lg w-full">Create Proposal</button>
      </div>
    </div>
  );
} 