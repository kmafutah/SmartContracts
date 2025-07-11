import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '../lib/contracts';
import accessVerifierAbi from '../../artifacts/contracts/governance_identity_soulbound_statehood/AccessVerifier.sol/AccessVerifier.json';
import { useWallet } from './useWallet';

export function useSoulID() {
  const { account, provider } = useWallet();
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [verificationLevel, setVerificationLevel] = useState<number>(0);
  const [tribe, setTribe] = useState<string>(''); // Extend with actual tribe logic if available
  const [isAdmin, setIsAdmin] = useState<boolean>(false); // Extend with DAO/multisig logic
  const [isKYC, setIsKYC] = useState<boolean>(false); // Extend with KYC logic if available
  const [loading, setLoading] = useState<boolean>(true);

  // SoulID is just the user's address for now
  const soulID = account || '';

  useEffect(() => {
    if (!account || !provider) {
      setIsVerified(false);
      setVerificationLevel(0);
      setTribe('');
      setIsAdmin(false);
      setIsKYC(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const contract = new ethers.Contract(
      CONTRACTS.AccessVerifier.address,
      accessVerifierAbi.abi,
      provider
    );
    Promise.all([
      contract.isVerified(account),
      contract.verificationLevel(account)
    ]).then(([verified, level]: [boolean, ethers.BigNumberish]) => {
      setIsVerified(verified);
      setVerificationLevel(Number(level));
      // Tribe, isAdmin, isKYC: extend here with actual contract calls if available
      setTribe('PanAfrican'); // Placeholder
      setIsAdmin(account.toLowerCase() === CONTRACTS.AccessVerifier.address.toLowerCase()); // Placeholder: owner is admin
      setIsKYC(verified); // Placeholder: treat verified as KYC for now
      setLoading(false);
    }).catch(() => {
      setIsVerified(false);
      setVerificationLevel(0);
      setTribe('');
      setIsAdmin(false);
      setIsKYC(false);
      setLoading(false);
    });
  }, [account, provider]);

  return { isVerified, verificationLevel, tribe, isAdmin, isKYC, soulID, loading };
} 