// Usage: node scripts/upload-to-ipfs.js <file-path>
// Requires: npm install ipfs-http-client

const { create } = require('ipfs-http-client');
const fs = require('fs');
const path = require('path');

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/upload-to-ipfs.js <file-path>');
    process.exit(1);
  }

  // Connect to local IPFS node (default API address)
  const ipfs = create({ url: 'http://127.0.0.1:5001' });

  const fileName = path.basename(filePath);
  const fileContent = fs.readFileSync(filePath);

  const { cid } = await ipfs.add({ path: fileName, content: fileContent });
  console.log(`Uploaded ${fileName} to IPFS!`);
  console.log('CID:', cid.toString());
  console.log('ipfs://' + cid.toString());
}

main().catch((err) => {
  console.error('Error uploading to IPFS:', err);
  process.exit(1);
}); 