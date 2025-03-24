"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { message } from "antd";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import {
  useApproveProposal,
  useCancelProposal,
  useCastVote,
  useEmergencyShutdownProposal,
  useHasVoted,
  useIsMaintainer,
  useProposalAllInfo,
  useProposalVoterInfo,
  useProposalVoters,
  useQueueProposal,
} from "~~/hooks/blockchain/BCOSGovernor";
import { useTotalSupply } from "~~/hooks/blockchain/ERC20VotePower";
import { ProposalState, VoteType, stateColors } from "~~/services/store/store";

const ProposalDetail: NextPage = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { address } = useAccount();
  const { info: proposal, refetch } = useProposalAllInfo(Number(id));
  const isMaintainer = useIsMaintainer(address || "");
  const hasVoted = useHasVoted(Number(id), address || "");
  const totalSupply = useTotalSupply() || 0;
  const [voteReason, setVoteReason] = useState("");
  const [isVoting, setIsVoting] = useState(false);
  const queueProposal = useQueueProposal(Number(id));
  const approveProposal = useApproveProposal(Number(id));
  const cancelProposal = useCancelProposal(Number(id));
  const emergencyShutdown = useEmergencyShutdownProposal(Number(id));
  // Only fetch voters if the proposal state is not Pending, Canceled, or Defeated
  // const shouldFetchVoters =
  //   proposal &&
  //   ![ProposalState.Pending, ProposalState.Canceled, ProposalState.Defeated].includes(Number(proposal.state));
  const voters = useProposalVoters(Number(id));
  console.log("proposal: ", proposal);
  console.log("voters: ", voters);
  // const voters = null;
  // Vote casting functions
  const castVoteFor = useCastVote(Number(id), VoteType.VoteFor, voteReason);
  const castVoteAgainst = useCastVote(Number(id), VoteType.Against, voteReason);
  const castVoteAbstain = useCastVote(Number(id), VoteType.Abstain, voteReason);

  if (!proposal) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const forPercentage = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
  const participationRate = totalSupply > 0 ? (totalVotes / Number(totalSupply)) * 100 : 0;

  const handleQueue = async () => {
    try {
      await queueProposal();
      message.success("Proposal queued for execution");
      refetch();
    } catch (error) {
      console.error("Error queueing proposal:", error);
      message.error("Failed to queue proposal");
    }
  };

  const handleApprove = async () => {
    try {
      await approveProposal();
      message.success("Proposal approved");
      refetch();
    } catch (error) {
      console.error("Error approving proposal:", error);
      message.error("Failed to approve proposal");
    }
  };

  const handleReject = async () => {
    try {
      await cancelProposal();
      message.success("Proposal rejected");
      refetch();
    } catch (error) {
      console.error("Error rejecting proposal:", error);
      message.error("Failed to reject proposal");
    }
  };

  const handleEmergencyShutdown = async () => {
    try {
      await emergencyShutdown();
      message.success("Proposal emergency shutdown successful");
      refetch();
    } catch (error) {
      console.error("Error in emergency shutdown:", error);
      message.error("Failed to emergency shutdown proposal");
    }
  };

  // Vote handling functions
  const handleVoteFor = async () => {
    try {
      setIsVoting(true);
      await castVoteFor();
      message.success("Vote cast: For");
      refetch();
    } catch (error) {
      console.error("Error casting vote:", error);
      message.error("Failed to cast vote");
    } finally {
      setIsVoting(false);
    }
  };

  const handleVoteAgainst = async () => {
    try {
      setIsVoting(true);
      await castVoteAgainst();
      message.success("Vote cast: Against");
      refetch();
    } catch (error) {
      console.error("Error casting vote:", error);
      message.error("Failed to cast vote");
    } finally {
      setIsVoting(false);
    }
  };

  const handleVoteAbstain = async () => {
    try {
      setIsVoting(true);
      await castVoteAbstain();
      message.success("Vote cast: Abstain");
      refetch();
    } catch (error) {
      console.error("Error casting vote:", error);
      message.error("Failed to cast vote");
    } finally {
      setIsVoting(false);
    }
  };

  const renderActionButtons = () => {
    if (Number(proposal.state) === ProposalState.Pending && isMaintainer) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Proposal Actions</h2>
          <div className="space-y-4">
            <button
              onClick={handleApprove}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition duration-300"
            >
              Approve
            </button>
            <button
              onClick={handleReject}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition duration-300"
            >
              Reject
            </button>
          </div>
        </div>
      );
    }

    if (Number(proposal.state) === ProposalState.Succeeded && isMaintainer) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Proposal Actions</h2>
          <div className="space-y-4">
            {forPercentage >= 50 && (
              <button
                onClick={handleQueue}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-300"
              >
                Put into execution queue
              </button>
            )}
          </div>
        </div>
      );
    }
    if (Number(proposal.state) === ProposalState.Active && isMaintainer) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Proposal Actions</h2>
          <div className="space-y-4">
            <button
              onClick={handleEmergencyShutdown}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg transition duration-300"
            >
              Emergency Shutdown
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // Render voting buttons for active proposals
  const renderVotingButtons = () => {
    if (Number(proposal.state) !== ProposalState.Active || !address || hasVoted) {
      return null;
    }

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Cast Your Vote</h2>
        <div className="space-y-4">
          <div className="mb-4">
            <label htmlFor="voteReason" className="block text-sm font-medium text-gray-700 mb-2">
              Vote Reason (Optional)
            </label>
            <textarea
              id="voteReason"
              value={voteReason}
              onChange={e => setVoteReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Enter your reason for voting..."
            />
          </div>
          <button
            onClick={handleVoteFor}
            disabled={isVoting}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition duration-300 disabled:opacity-50"
          >
            {isVoting ? "Voting..." : "Vote For"}
          </button>
          <button
            onClick={handleVoteAgainst}
            disabled={isVoting}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition duration-300 disabled:opacity-50"
          >
            {isVoting ? "Voting..." : "Vote Against"}
          </button>
          <button
            onClick={handleVoteAbstain}
            disabled={isVoting}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition duration-300 disabled:opacity-50"
          >
            {isVoting ? "Voting..." : "Abstain"}
          </button>
        </div>
        {hasVoted && <p className="mt-4 text-sm text-gray-600">You have already voted on this proposal.</p>}
      </div>
    );
  };

  const VoterRow = ({ voter, proposalId }: { voter: string; proposalId: number }) => {
    const { weight, support, blockNumber } = useProposalVoterInfo(proposalId, voter);

    return (
      <tr key={voter}>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-900">{shortenAddress(voter)}</div>
        </td>
        <td className="px-6 py-4">
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
            ${Number(weight) > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
          >
            {Number(weight) > 0 ? "For" : "Against"}
          </span>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-900">{Number(weight)}</div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-900">{Number(blockNumber)}</div>
        </td>
      </tr>
    );
  };

  const renderVotingDetails = () => {
    if (!voters) return null;
    return voters.voters.map((voter: string) => <VoterRow key={voter} voter={voter} proposalId={Number(id)} />);
  };

  const shouldShowVotingDetails = () => {
    const state = Number(proposal.state);
    return ![ProposalState.Pending, ProposalState.Canceled, ProposalState.Defeated].includes(state);
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex gap-8">
        {/*Left Column*/}
        <div className="w-2/3">
          {/*Proposal Overview*/}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-800">{proposal.title}</h1>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${stateColors[Number(proposal.state)]}`}>
                {ProposalState[Number(proposal.state)]}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Proposer</p>
                <p className="text-md font-medium">{shortenAddress(proposal.proposer)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Proposer ID</p>
                <p className="text-md font-medium">{proposal.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Block Range</p>
                <p className="text-md font-medium">
                  {proposal.startBlock} ~ {proposal.endBlock}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Transaction</p>
                <a href="#" className="text-blue-600 hover:text-blue-800">
                  View on Explorer
                </a>
              </div>
            </div>

            {/*Proposal Description*/}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <div className="prose whitespace-pre-line break-all line-clamp-3">{proposal.description}</div>
            </div>
          </div>

          {/* Voting Overview */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Voting Overview</h2>

            {/* Progress Bars */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Vote Weight Approval</span>
                  <span className="text-sm font-medium text-gray-900">{forPercentage.toFixed(1)}% / 51%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${forPercentage}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Participation Rate</span>
                  <span className="text-sm font-medium text-gray-900">{participationRate}% / 30%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${participationRate}%` }}></div>
                </div>
              </div>
            </div>

            {/* Vote Statistics */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">For</p>
                <p className="text-xl font-bold text-green-700">{proposal.forVotes} votes</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Against</p>
                <p className="text-xl font-bold text-red-700">{proposal.againstVotes} votes</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Abstain</p>
                <p className="text-xl font-bold text-gray-700">{proposal.abstainVotes} votes</p>
              </div>
            </div>
          </div>

          {/* Voting Details */}
          {shouldShowVotingDetails() && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Voting Details</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voter</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vote</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Block</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">{renderVotingDetails()}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="w-1/3">
          {/* Voting Buttons */}
          {renderVotingButtons()}

          {/* Action Buttons */}
          {renderActionButtons()}

          {/* Contract Information */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Contract Information</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">DAO Contract</p>
                <a href="#" className="text-blue-600 hover:text-blue-800 text-sm break-all">
                  0x1234567890abcdef1234567890abcdef12345678
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-500">Explorer</p>
                <a href="#" className="text-blue-600 hover:text-blue-800 text-sm">
                  View on Block Explorer
                </a>
              </div>
            </div>
          </div>

          {/* Governance Token */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Governance Token</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Token Contract</p>
                <a href="#" className="text-blue-600 hover:text-blue-800 text-sm break-all">
                  0xabcdef1234567890abcdef1234567890abcdef12
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Locked Value</p>
                <p className="text-lg font-bold text-gray-900">1,234,567 BCOS</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

const shortenAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default ProposalDetail;
