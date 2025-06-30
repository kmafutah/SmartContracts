export default function NFTs() {
  return (
    <div className="min-h-screen bg-panAfrican-black text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="font-bold text-2xl mb-6">NFT Gallery</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NFTCard label="SoulReparationNFT" desc="Your soulbound reparation NFT. Non-transferable." />
          <NFTCard label="ZiGNFT" desc="Collectible NFT series. Cultural significance." />
        </div>
        <div className="mt-8 bg-panAfrican-green rounded-xl p-6 shadow-lg">
          <div className="font-bold mb-2">Metadata Viewer</div>
          <div className="text-sm text-gray-200">Select an NFT to view its metadata here.</div>
        </div>
      </div>
    </div>
  );
}

function NFTCard({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="bg-panAfrican-green rounded-xl p-6 shadow-lg flex flex-col gap-2">
      <div className="font-bold text-lg">{label}</div>
      <div className="text-sm opacity-80">{desc}</div>
      <button className="bg-panAfrican-gold text-black font-bold py-1 px-3 rounded-lg mt-2">View NFT</button>
    </div>
  );
} 