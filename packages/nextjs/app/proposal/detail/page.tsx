"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LinkOutlined } from "@ant-design/icons";
import { message } from "antd";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { ProposalOverview } from "~~/components/proposal/ProposalOverview";
import {
  useApproveProposal,
  useCancelProposal,
  useCastVote,
  useEmergencyShutdownProposal,
  useExecuteProposal,
  useHasVoted,
  useIsMaintainer,
  useProposalAllInfo,
  useProposalVoterInfo,
  useProposalVoters,
  useQueueProposal,
  useQuorumNumerator,
  useVoteSuccessThreshold,
} from "~~/hooks/blockchain/BCOSGovernor";
import { useTotalSupply } from "~~/hooks/blockchain/ERC20VotePower";
import { useDeployedContractInfo, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { ProposalState, VoteType } from "~~/services/store/store";
import { formatToken } from "~~/utils/TokenFormatter";
import { shortenAddress } from "~~/utils/scaffold-eth/common";

const ProposalDetail: NextPage = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { address } = useAccount();
  const { info: proposal, refetch } = useProposalAllInfo(Number(id));
  const isMaintainer = useIsMaintainer(address || "");
  const hasVoted = useHasVoted(Number(id), address || "");
  console.log(hasVoted, "hasVoted");
  const totalSupply = useTotalSupply() || 0;
  const [voteReason, setVoteReason] = useState("");
  const [isVoting, setIsVoting] = useState(false);
  const queueProposal = useQueueProposal(Number(id));
  const approveProposal = useApproveProposal(Number(id));
  const cancelProposal = useCancelProposal(Number(id));
  const emergencyShutdown = useEmergencyShutdownProposal(Number(id));
  const executeProposal = useExecuteProposal(Number(id));
  const voters = useProposalVoters(Number(id));
  console.log("proposal: ", proposal);
  console.log("voters: ", voters);
  const castVoteFor = useCastVote(Number(id), VoteType.VoteFor, voteReason);
  const castVoteAgainst = useCastVote(Number(id), VoteType.Against, voteReason);
  const castVoteAbstain = useCastVote(Number(id), VoteType.Abstain, voteReason);
  const voteSuccessThreshold = useVoteSuccessThreshold();
  const quorumNumerator = useQuorumNumerator();
  const { targetNetwork } = useTargetNetwork();
  const blockExplorerBaseURL = targetNetwork.blockExplorers?.default?.url;
  const bcosGovernor = useDeployedContractInfo({
    contractName: "BCOSGovernor",
  });
  const timelock = useDeployedContractInfo({ contractName: "CustomTimelockControllerUpgradeable" });
  const erc20 = useDeployedContractInfo({
    contractName: "ERC20VotePower",
  });

  if (!proposal || !bcosGovernor || !timelock || !erc20) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  // Convert values to BigInt for calculations
  const forVotesBigInt = BigInt(proposal.forVotes);
  const againstVotesBigInt = BigInt(proposal.againstVotes);
  const abstainVotesBigInt = BigInt(proposal.abstainVotes);
  const totalVotesBigInt = forVotesBigInt + againstVotesBigInt + abstainVotesBigInt;
  const totalSupplyBigInt = BigInt(totalSupply);

  // Calculate percentages
  const getPercentage = (value: bigint, total: bigint) => {
    if (total === 0n) return 0;
    return Number((value * 100n) / total);
  };

  // Use BigInt calculations instead
  const forPercentage = getPercentage(forVotesBigInt, totalVotesBigInt);

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

  const handleExecute = async () => {
    try {
      await executeProposal();
      message.success("Proposal executed successfully");
      refetch();
    } catch (error) {
      console.error("Error executing proposal:", error);
      message.error("Failed to execute proposal");
    }
  };

  const handleVoteFor = async () => {
    try {
      setIsVoting(true);
      await castVoteFor();
      message.success("Vote cast: For");
      console.log(99999, "vote success =================");
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
    const state = Number(proposal.state);
    const hasMetQuorum = getPercentage(totalVotesBigInt, totalSupplyBigInt) >= quorumNumerator;
    const hasMetThreshold = getPercentage(forVotesBigInt, totalVotesBigInt) >= voteSuccessThreshold;

    if (state === ProposalState.Succeeded && hasMetQuorum && hasMetThreshold) {
      return (
        <div className="bg-base-100 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-neutral mb-6">Proposal Actions</h2>
          <div className="space-y-4">
            <button
              onClick={handleQueue}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-300"
            >
              Put into execution queue
            </button>
          </div>
        </div>
      );
    }

    if (Number(proposal.state) === ProposalState.Pending && isMaintainer) {
      return (
        <div className="bg-base-100 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-neutral mb-6">Proposal Actions</h2>
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

    if (Number(proposal.state) === ProposalState.Queued && isMaintainer) {
      return (
        <div className="bg-base-100 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-neutral mb-6">Proposal Actions</h2>
          <div className="space-y-4">
            <button
              onClick={handleExecute}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-300"
            >
              Execute Proposal
            </button>
          </div>
        </div>
      );
    }

    if (Number(proposal.state) === ProposalState.Active && isMaintainer) {
      return (
        <div className="bg-base-100 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-neutral mb-6">Proposal Actions</h2>
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
    const { weight, blockNumber } = useProposalVoterInfo(proposalId, voter);

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
        <div className="w-2/3">
          <ProposalOverview proposal={proposal} isPreview={false} />

          {/* Voting Overview */}
          <div className="bg-base-100 rounded-xl shadow-lg p-6 mb-8 mt-8">
            <h2 className="text-xl font-bold text-base-content mb-6">Votes</h2>

            {proposal.state === ProposalState.Succeeded && (
              <div className="mb-6 p-4 bg-base-100 rounded-lg flex items-center gap-2 text-green-600">
                <CheckCircleIcon className="h-5 w-5" />
                <span>This proposal has been passed. We are preparing to execute the contents.</span>
              </div>
            )}

            <div className="space-y-8">
              {/* Participated Voting Power */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-neutral">Participated Voting Power</span>
                  <span className="text-sm font-medium text-neutral">Minimum ({quorumNumerator}%)</span>
                </div>
                <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full bg-blue-400"
                    style={{ width: `${getPercentage(forVotesBigInt, totalSupplyBigInt)}%` }}
                  />
                  <div
                    className="absolute h-full bg-gray-400"
                    style={{
                      left: `${getPercentage(forVotesBigInt, totalSupplyBigInt)}%`,
                      width: `${getPercentage(abstainVotesBigInt, totalSupplyBigInt)}%`,
                    }}
                  />
                  <div className="absolute h-full w-px bg-black" style={{ left: `${quorumNumerator}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">
                      {formatToken(proposal.forVotes).toFixed(4)} (
                      {getPercentage(forVotesBigInt, totalVotesBigInt).toFixed(2)}%)
                    </div>
                    <div className="text-sm text-neutral">Yes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-red-600">
                      {formatToken(proposal.againstVotes).toFixed(4)} (
                      {getPercentage(againstVotesBigInt, totalVotesBigInt).toFixed(2)}%)
                    </div>
                    <div className="text-sm text-neutral">No</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-600">
                      {formatToken(proposal.abstainVotes).toFixed(4)} (
                      {getPercentage(abstainVotesBigInt, totalVotesBigInt).toFixed(2)}%)
                    </div>
                    <div className="text-sm text-neutral">Abstain</div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-neutral">
                  Participated / Total Voting Power (Voting Rate): {formatToken(totalVotesBigInt).toFixed(4)} /{" "}
                  {formatToken(totalSupplyBigInt).toFixed(4)} (
                  {getPercentage(totalVotesBigInt, totalSupplyBigInt).toFixed(2)}%)
                </div>
              </div>

              {/* Participation */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-neutral">Participation Rate</span>
                  <span className="text-sm font-medium text-neutral">Minimum ({voteSuccessThreshold}%)</span>
                </div>
                <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div className="absolute h-full bg-green-400" style={{ width: `${forPercentage}%` }} />
                  <div className="absolute h-full w-px bg-black" style={{ left: `${voteSuccessThreshold}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Voting Details */}
          {shouldShowVotingDetails() && (
            <div className="bg-base-100 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-neutral mb-6">Voting Details</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-base-300">
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral uppercase">Voter</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral uppercase">Vote</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral uppercase">Weight</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral uppercase">Block</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-white divide-gray-200">{renderVotingDetails()}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="w-1/3">
          {renderVotingButtons()}

          {renderActionButtons()}

          <div className="bg-base-100 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-neutral mb-6">Contract Information</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-neutral">DAO Contract</p>
                <Link
                  href={`${blockExplorerBaseURL}/address/${bcosGovernor.data?.address}`}
                  className="text-md font-medium text-blue-500"
                  target="_blank"
                >
                  <LinkOutlined />
                  {shortenAddress(bcosGovernor.data?.address)}
                </Link>
              </div>
              <div>
                <p className="text-sm text-neutral">Timelock Contract</p>
                <Link
                  href={`${blockExplorerBaseURL}/address/${timelock.data?.address}`}
                  className="text-md font-medium text-blue-500"
                  target="_blank"
                >
                  <LinkOutlined />
                  {shortenAddress(timelock.data?.address)}
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-base-100 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-neutral mb-6">Governance Token</h2>
            <div className="space-y-4">
              <div>
                <Link
                  href={`${blockExplorerBaseURL}/address/${erc20.data?.address}`}
                  className="text-md font-medium text-blue-500"
                  target="_blank"
                >
                  <LinkOutlined />
                  {shortenAddress(erc20.data?.address)}
                </Link>
              </div>
              <div>
                <p className="text-sm text-neutral">Total Supply Value</p>
                <p className="text-lg font-bold text-neutral">{formatToken(totalSupplyBigInt).toFixed(4)} EVP</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

const ProposalDetailPage = () => {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <ProposalDetail />
    </Suspense>
  );
};

export default ProposalDetailPage;
