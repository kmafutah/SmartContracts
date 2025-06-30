// Central contract registry for ZiGVerse frontend
import zigAbi from '../../artifacts/contracts/economic_core/ZiG.sol/ZiG.json';
import zigtAbi from '../../artifacts/contracts/economic_core/ZiGT.sol/ZiGT.json';
import utilityAbi from '../../artifacts/contracts/governance_identity_soulbound_statehood/ZiGUtilityToken.sol/ZiGUtilityToken.json';
import govAbi from '../../artifacts/contracts/governance_identity_soulbound_statehood/ZiGGovernanceToken.sol/ZiGGovernanceToken.json';
import memeAbi from '../../artifacts/contracts/governance_identity_soulbound_statehood/ZiGMemeToken.sol/ZiGMemeToken.json';
import gamefiAbi from '../../artifacts/contracts/gamefi_expansion/ZiGGameFiToken.sol/ZiGGameFiToken.json';
import deployment from '../../deployment-addresses-polygon_zkevm.json';

export const CONTRACTS = {
  ZIG: {
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
  Utility: {
    address: deployment.ZiGUtilityToken,
    abi: utilityAbi.abi,
    symbol: 'Utility',
    decimals: 18,
  },
  Governance: {
    address: deployment.ZiGGovernanceToken,
    abi: govAbi.abi,
    symbol: 'GOV',
    decimals: 18,
  },
  Meme: {
    address: deployment.ZiGMemeToken,
    abi: memeAbi.abi,
    symbol: 'MEME',
    decimals: 18,
  },
  GameFi: {
    address: deployment.ZiGGameFiToken,
    abi: gamefiAbi.abi,
    symbol: 'GAMEFI',
    decimals: 18,
  },
}; 