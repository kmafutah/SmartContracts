export default function Identity() {
  return (
    <div className="min-h-screen bg-panAfrican-black text-white flex flex-col items-center p-8">
      <div className="w-full max-w-xl bg-panAfrican-green rounded-xl p-6 flex flex-col gap-4 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-panAfrican-crimson flex items-center justify-center">
            <span className="text-4xl">🧑🏾‍🦱</span>
          </div>
          <div>
            <div className="text-xl font-serif font-bold">ZiGSoulboundToken</div>
            <div className="flex items-center gap-2 text-green-400 font-semibold">
              <span>Verified</span>
              <span className="w-3 h-3 bg-green-400 rounded-full inline-block"></span>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="font-bold">AccessVerifier Status:</div>
          <div className="text-green-300">Eligible (Tribe: Shona, Diaspora: Yes)</div>
        </div>
        <div className="mt-4">
          <button className="bg-panAfrican-gold text-black font-bold py-2 px-4 rounded-lg">Claim SoulReparationNFT</button>
        </div>
      </div>
    </div>
  );
} 