import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { useNotification } from '../components/Notification';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function DAO() {
  const notify = useNotification();
  const { contracts, account, isConnected, connectWallet } = useWallet();
  const [proposals, setProposals] = useState<any[]>([]);
  const [userInfo, setUserInfo] = useState<{ votingPower: string, africanVerified: boolean }>({ votingPower: '0', africanVerified: false });
  const [governanceBalance, setGovernanceBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [voting, setVoting] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newProposal, setNewProposal] = useState({ description: '', amount: '', recipient: '' });

  // Fetch proposals from contract
  useEffect(() => {
    const fetchProposals = async () => {
      if (!contracts.ReparationsDAO) return;
      setLoading(true);
      try {
        const count = await contracts.ReparationsDAO.getProposalCount();
        const proposals = await contracts.ReparationsDAO.getAllProposals(count, 0);
        setProposals(proposals);
      } catch (e) {
        setProposals([]);
      }
      setLoading(false);
    };
    fetchProposals();
  }, [contracts]);

  // Fetch user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!contracts.ReparationsDAO || !account) return;
      try {
        const [votingPower, africanVerified] = await contracts.ReparationsDAO.getUserInfo(account);
        setUserInfo({ votingPower: ethers.formatUnits(votingPower, 18), africanVerified });
      } catch {
        setUserInfo({ votingPower: '0', africanVerified: false });
      }
    };
    fetchUserInfo();
  }, [contracts, account]);

  // Fetch governance token balance
  useEffect(() => {
    const fetchGovernanceBalance = async () => {
      if (!contracts.ZiGGovernanceToken || !account) return;
      try {
        const balance = await contracts.ZiGGovernanceToken.balanceOf(account);
        setGovernanceBalance(ethers.formatUnits(balance, 18));
      } catch {
        setGovernanceBalance('0');
      }
    };
    fetchGovernanceBalance();
  }, [contracts, account]);

  // Vote on proposal
  const voteOnProposal = async (proposalId: number, support: boolean) => {
    if (!contracts.ReparationsDAO) return;
    setVoting(proposalId);
    try {
      const tx = await contracts.ReparationsDAO.vote(proposalId, support);
      notify('Transaction sent. Waiting for confirmation...', 'info');
      await tx.wait();
      notify('Vote successful!', 'success');
    } catch (e: any) {
      notify(`Failed to vote: ${e.message || e}`, 'error');
    } finally {
      setVoting(null);
    }
  };

  // Create proposal
  const createProposal = async () => {
    if (!contracts.ReparationsDAO) return;
    setCreating(true);
    try {
      const { description, amount, recipient } = newProposal;
      if (!description || !amount || !recipient) {
        notify('All fields are required', 'error');
        setCreating(false);
        return;
      }
      const tx = await contracts.ReparationsDAO.createProposal(description, ethers.parseUnits(amount, 18), recipient);
      notify('Proposal creation sent. Waiting for confirmation...', 'info');
      await tx.wait();
      notify('Proposal created!', 'success');
      setNewProposal({ description: '', amount: '', recipient: '' });
    } catch (e: any) {
      notify(`Failed to create proposal: ${e.message || e}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-panAfrican-black text-white">
      {/* Header */}
      <div className="bg-panAfrican-green p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold">Reparations DAO</div>
          <button
            onClick={connectWallet}
            className={`px-6 py-2 rounded-lg font-bold transition-colors ${
              isConnected 
                ? 'bg-panAfrican-gold text-black' 
                : 'bg-panAfrican-crimson text-white hover:bg-red-700'
            }`}
          >
            {isConnected && account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect Wallet'}
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="font-bold text-2xl mb-6">Reparations DAO</div>
          {isConnected && (
            <div className="bg-panAfrican-green rounded-xl p-4 mb-6">
              <div className="text-lg font-bold mb-2">Your Governance Power</div>
              <div className="text-2xl font-mono">{governanceBalance} GOV</div>
              <div className="text-sm text-gray-300 mt-1">
                Voting Power: {userInfo.votingPower} | African Verified: {userInfo.africanVerified ? '✅' : '❌'}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {loading ? <LoadingSpinner /> : proposals.length === 0 ? <div>No proposals found.</div> : proposals.map((p: any) => (
              <div key={p.id} className="bg-panAfrican-green rounded-xl p-4 shadow-lg flex flex-col gap-2">
                <div className="font-bold text-lg">{p.description}</div>
                <div className="text-sm">Recipient: <span className="font-mono">{p.recipient}</span></div>
                <div className="text-sm">Amount: {ethers.formatUnits(p.amount, 18)}</div>
                <div className="text-sm">Status: <span className="font-mono">{p.executed ? 'Executed' : (Date.now()/1000 > Number(p.deadline) ? 'Ended' : 'Active')}</span></div>
                <div className="text-xs">For: {ethers.formatUnits(p.votesFor, 18)} | Against: {ethers.formatUnits(p.votesAgainst, 18)} | African Votes: {ethers.formatUnits(p.africanVotes, 18)}</div>
                <div className="text-xs">Deadline: {new Date(Number(p.deadline) * 1000).toLocaleString()}</div>
                {!p.executed && isConnected && Date.now()/1000 < Number(p.deadline) && (
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => voteOnProposal(Number(p.id), true)}
                      disabled={voting === Number(p.id)}
                      className="bg-panAfrican-gold text-black font-bold py-1 px-3 rounded-lg disabled:opacity-50"
                    >
                      {voting === Number(p.id) ? <LoadingSpinner size="sm" color="black" /> : 'Vote For'}
                    </button>
                    <button 
                      onClick={() => voteOnProposal(Number(p.id), false)}
                      disabled={voting === Number(p.id)}
                      className="bg-panAfrican-crimson text-white font-bold py-1 px-3 rounded-lg disabled:opacity-50"
                    >
                      {voting === Number(p.id) ? <LoadingSpinner size="sm" /> : 'Vote Against'}
                    </button>
                  </div>
                )}
                {p.executed && <div className="text-green-700 font-bold">Proposal Executed</div>}
              </div>
            ))}
          </div>

          {isConnected && userInfo.votingPower !== '0' && userInfo.africanVerified && (
            <div className="mt-8 bg-gray-800 rounded-xl p-6">
              <div className="font-bold mb-2">Create New Proposal</div>
              <input
                type="text"
                placeholder="Description"
                className="w-full mb-2 p-2 rounded bg-gray-900 text-white"
                value={newProposal.description}
                onChange={e => setNewProposal({ ...newProposal, description: e.target.value })}
              />
              <input
                type="text"
                placeholder="Amount (in tokens)"
                className="w-full mb-2 p-2 rounded bg-gray-900 text-white"
                value={newProposal.amount}
                onChange={e => setNewProposal({ ...newProposal, amount: e.target.value })}
              />
              <input
                type="text"
                placeholder="Recipient address"
                className="w-full mb-2 p-2 rounded bg-gray-900 text-white"
                value={newProposal.recipient}
                onChange={e => setNewProposal({ ...newProposal, recipient: e.target.value })}
              />
              <button
                onClick={createProposal}
                disabled={creating}
                className="w-full bg-panAfrican-gold text-black font-bold py-2 px-4 rounded-lg mt-2 disabled:opacity-50"
              >
                {creating ? <LoadingSpinner size="sm" color="black" /> : 'Create Proposal'}
              </button>
            </div>
          )}

          {!isConnected && (
            <div className="text-center mt-8 text-gray-400">
              Connect your wallet to participate in governance
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 