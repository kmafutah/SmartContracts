// Central contract registry for ZiGVerse frontend
import { ethers } from 'ethers';
import zigAbi from '../../artifacts/contracts/economic_core/ZiG.sol/ZiG.json';
import zigtAbi from '../../artifacts/contracts/economic_core/ZiGT.sol/ZiGT.json';
import utilityAbi from '../../artifacts/contracts/governance_identity_soulbound_statehood/ZiGUtilityToken.sol/ZiGUtilityToken.json';
import govAbi from '../../artifacts/contracts/governance_identity_soulbound_statehood/ZiGGovernanceToken.sol/ZiGGovernanceToken.json';
import memeAbi from '../../artifacts/contracts/governance_identity_soulbound_statehood/ZiGMemeToken.sol/ZiGMemeToken.json';
import gamefiAbi from '../../artifacts/contracts/gamefi_expansion/ZiGGameFiToken.sol/ZiGGameFiToken.json';
import vaultAbi from '../../artifacts/contracts/economic_core/Vault.sol/Vault.json';
import soulboundAbi from '../../artifacts/contracts/cultural_utilty_layer/ZiGSoulboundToken.sol/ZiGSoulboundToken.json';
import soulReparationAbi from '../../artifacts/contracts/cultural_utilty_layer/SoulReparationNFT.sol/SoulReparationNFT.json';
import nftAbi from '../../artifacts/contracts/governance_identity_soulbound_statehood/ZiGNFT.sol/ZiGNFT.json';
import rwaAbi from '../../artifacts/contracts/governance_identity_soulbound_statehood/ZiGRWAToken.sol/ZiGRWAToken.json';
import deployment from '../../deployment-addresses-polygon_zkevm.json';
import oracleHubAbi from '../../artifacts/contracts/economic_core/ZiGOracleHub.sol/ZiGOracleHub.json';
import bondingCurveAbi from '../../artifacts/contracts/gamefi_expansion/ZiGBondingCurve.sol/ZiGBondingCurve.json';
import oracleValidatorAbi from '../../artifacts/contracts/economic_core/OracleValidator.sol/OracleValidator.json';
import oracleAggregatorAbi from '../../artifacts/contracts/economic_core/OracleAggregator.sol/OracleAggregator.json';
import oracleHealthMonitorAbi from '../../artifacts/contracts/economic_core/OracleHealthMonitor.sol/OracleHealthMonitor.json';
import reparationsDaoAbi from '../../artifacts/contracts/governance_identity_soulbound_statehood/ReparationsDAO.sol/ReparationsDAO.json';
import regionalStablecoinsAbi from '../../artifacts/contracts/economic_core/RegionalStablecoins.sol/RegionalStablecoins.json';
import accessVerifierAbi from '../../artifacts/contracts/governance_identity_soulbound_statehood/AccessVerifier.sol/AccessVerifier.json';

export const CONTRACTS = {
  // Core Economic Contracts
  ZiG: {
    address: deployment.ZiG,
    abi: zigAbi.abi,
    symbol: 'ZIG',
    decimals: 18,
  },
  ZiGT: {
    address: deployment.ZiGT,
    abi: zigtAbi.abi,
    symbol: 'ZiGT',
    decimals: 18,
  },
  Vault: {
    address: deployment.Vault,
    abi: vaultAbi.abi,
    symbol: 'Vault',
    decimals: 18,
  },

  // Governance & Identity
  ZiGGovernanceToken: {
    address: deployment.ZiGGovernanceToken,
    abi: govAbi.abi,
    symbol: 'GOV',
    decimals: 18,
  },
  ZiGUtilityToken: {
    address: deployment.ZiGUtilityToken,
    abi: utilityAbi.abi,
    symbol: 'Utility',
    decimals: 18,
  },
  ZiGMemeToken: {
    address: deployment.ZiGMemeToken,
    abi: memeAbi.abi,
    symbol: 'MEME',
    decimals: 18,
  },
  ZiGRWAToken: {
    address: deployment.ZiGRWAToken,
    abi: rwaAbi.abi,
    symbol: 'RWA',
    decimals: 18,
  },

  // NFTs & Cultural
  ZiGNFT: {
    address: deployment.ZiGNFT,
    abi: nftAbi.abi,
    symbol: 'NFT',
    decimals: 0,
  },
  ZiGSoulboundToken: {
    address: deployment.ZiGSoulboundToken,
    abi: soulboundAbi.abi,
    symbol: 'Soulbound',
    decimals: 0,
  },
  SoulReparationNFT: {
    address: deployment.SoulReparationNFT,
    abi: soulReparationAbi.abi,
    symbol: 'SRPNFT',
    decimals: 0,
  },

  // GameFi
  ZiGGameFiToken: {
    address: deployment.ZiGGameFiToken,
    abi: gamefiAbi.abi,
    symbol: 'GAMEFI',
    decimals: 18,
  },

  // Oracle Infrastructure
  ZiGOracleHub: {
    address: deployment.ZiGOracleHub,
    abi: oracleHubAbi.abi,
    symbol: 'OracleHub',
    decimals: 0,
  },
  FeedRegistry: {
    address: deployment.FeedRegistry,
    abi: [], // Add ABI when available
    symbol: 'FeedRegistry',
    decimals: 0,
  },
  BandFeedRegistry: {
    address: deployment.BandFeedRegistry,
    abi: [], // Add ABI when available
    symbol: 'BandFeedRegistry',
    decimals: 0,
  },
  LiveBandFeed: {
    address: deployment.LiveBandFeed,
    abi: [], // Add ABI when available
    symbol: 'LiveBandFeed',
    decimals: 0,
  },
  MultiOracle: {
    address: deployment.MultiOracle,
    abi: [], // Add ABI when available
    symbol: 'MultiOracle',
    decimals: 0,
  },

  // Governance Infrastructure
  ReparationsDAO: {
    address: deployment.ReparationsDAO,
    abi: reparationsDaoAbi.abi,
    symbol: 'ReparationsDAO',
    decimals: 0,
  },
  AccessVerifier: {
    address: deployment.AccessVerifier,
    abi: accessVerifierAbi.abi, // Added ABI import
    symbol: 'AccessVerifier',
    decimals: 0,
  },
  EthicalGuard: {
    address: deployment.EthicalGuard,
    abi: [], // Add ABI when available
    symbol: 'EthicalGuard',
    decimals: 0,
  },

  // Additional Contracts
  ZiGWallet: {
    address: deployment.ZiGWallet,
    abi: [], // Add ABI when available
    symbol: 'ZiGWallet',
    decimals: 0,
  },
  ZiGBondingCurve: {
    address: deployment.ZiGBondingCurve,
    abi: bondingCurveAbi.abi,
    symbol: 'ZiGBondingCurve',
    decimals: 0,
  },
  OracleValidator: {
    address: deployment.OracleValidator,
    abi: oracleValidatorAbi.abi,
    symbol: 'OracleValidator',
    decimals: 0,
  },
  OracleAggregator: {
    address: deployment.OracleAggregator,
    abi: oracleAggregatorAbi.abi,
    symbol: 'OracleAggregator',
    decimals: 0,
  },
  OracleHealthMonitor: {
    address: deployment.OracleHealthMonitor,
    abi: oracleHealthMonitorAbi.abi,
    symbol: 'OracleHealthMonitor',
    decimals: 0,
  },
  RegionalStablecoins: {
    address: deployment.RegionalStablecoins,
    abi: regionalStablecoinsAbi.abi,
    symbol: 'RegionalStablecoins',
    decimals: 18,
  },
};

// Helper function to get contract instance
export const getContract = (contractName: keyof typeof CONTRACTS) => {
  const contract = CONTRACTS[contractName];
  if (!contract) {
    throw new Error(`Contract ${contractName} not found`);
  }
  
  // Check if we have a provider/signer available
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    return new ethers.Contract(contract.address, contract.abi, provider);
  }
  
  return contract;
}; 