// scripts/updatePriceHistory.js
require('dotenv').config();
const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');

// Load deployment addresses
const deployment = require(path.join(__dirname, '../deployment-addresses-polygon_zkevm.json'));

// Load ABIs
const oracleHubAbi = require(path.join(__dirname, '../artifacts/contracts/economic_core/ZiGOracleHub.sol/ZiGOracleHub.json')).abi;
const oracleValidatorAbi = require(path.join(__dirname, '../artifacts/contracts/economic_core/OracleValidator.sol/OracleValidator.json')).abi;

// Environment variables
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!RPC_URL || !PRIVATE_KEY) {
  console.error('Error: RPC_URL and PRIVATE_KEY must be set in your .env file.');
  process.exit(1);
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const oracleHub = new ethers.Contract(deployment.ZiGOracleHub, oracleHubAbi, provider);
  const oracleValidator = new ethers.Contract(deployment.OracleValidator, oracleValidatorAbi, wallet);

  const asset = 'BTCUSD';

  try {
    // Fetch price from on-chain oracle
    const price = await oracleHub.getPrice(asset);
    console.log(`Fetched BTCUSD price from oracle: ${ethers.formatUnits(price, 18)}`);

    // Update price history
    const tx = await oracleValidator.updatePriceHistory(asset, price);
    console.log('Submitted updatePriceHistory transaction:', tx.hash);
    await tx.wait();
    console.log('Price history updated successfully!');
  } catch (err) {
    console.error('Error updating price history:', err);
    process.exit(1);
  }
}

main(); 