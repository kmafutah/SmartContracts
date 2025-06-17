// scripts/updateOracleHub.js
const { ethers } = require('hardhat');

async function main() {
  const bandFeedAddress = '0x3F8D6D3B73febC2925e39e7C4A9F8fC4E0C98d26'; // From deployBandFeed.js
  const oracleHub = new ethers.Contract(
    '0xfD3f998807c1c6f85B5Aeb7a1d373e5a034c5ee2',
    ['function setOracle(string memory symbol, address source, uint8 decimals, bool isCustom, bool isInverse) external'],
    await ethers.getSigner('0xe0282d77cf60ba484e13d24fd5686a6618f09a3b')
  );
  const symbols = ['XAU', 'USD', 'BTC', 'ETH', 'XOF', 'ZAR'];
  for (const symbol of symbols) {
    const tx = await oracleHub.setOracle(symbol, bandFeedAddress, 18, false, false);
    await tx.wait();
    console.log(`Set ${symbol} to ${bandFeedAddress}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});