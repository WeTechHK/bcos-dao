"use client";

import Link from "next/link";
import { message } from "antd";
import { useAccount } from "wagmi";
import { useApproveProposal, useCancelProposal, useIsMaintainer } from "~~/hooks/blockchain/BCOSGovernor";
import { ProposalState, stateColors } from "~~/services/store/store";

interface ProposalCardProps {
  id: number;
  proposer: string;
  startBlock: number;
  endBlock: number;
  eta: number;
  state: string | ProposalState;
  targets: string[];
  values: string[] | bigint[];
  calldatas: string[];
  description: string;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
}

export const ProposalCard = ({
  id,
  proposer,
  startBlock,
  endBlock,
  state,
  description,
  forVotes,
  againstVotes,
  abstainVotes,
}: ProposalCardProps) => {
  const { address } = useAccount();
  const isMaintainer = useIsMaintainer(address || "");
  const approveProposal = useApproveProposal(id);
  const cancelProposal = useCancelProposal(id);

  const totalVotes = forVotes + againstVotes + abstainVotes;
  const progress = totalVotes > 0 ? (forVotes / totalVotes) * 100 : 0;

  const handleApprove = async () => {
    try {
      await approveProposal();
      message.success("Proposal approved");
    } catch (error) {
      console.error("Error approving proposal:", error);
      message.error("Failed to approve proposal");
    }
  };

  const handleReject = async () => {
    try {
      await cancelProposal();
      message.success("Proposal rejected");
    } catch (error) {
      console.error("Error rejecting proposal:", error);
      message.error("Failed to reject proposal");
    }
  };

  const renderActionButtons = () => {
    if (state === ProposalState.Pending && isMaintainer) {
      return (
        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={handleReject}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Reject
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="proposal-card bg-white rounded-xl shadow-lg overflow-hidden hover:-translate-y-1.5 duration-300 flex flex-col">
      <div className="p-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${stateColors[Number(state)]}`}>
            {ProposalState[Number(state)]}
          </span>
          <span className="text-sm text-gray-500">
            Block: {startBlock} - {endBlock}
          </span>
        </div>

        {/* Content */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Proposal #{id}</h3>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2 break-all">{description}</p>
          <div className="flex items-center gap-2">
            <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-sm">
              By: {proposer.slice(0, 6)}...{proposer.slice(-4)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto">
          {state === ProposalState.Active && (
            <div className="space-y-2 mb-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">For Votes</span>
                <span className="text-gray-900 font-medium">{progress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total Votes: {totalVotes}</span>
            <Link href={{ pathname: "/proposal/detail", query: { id } }} className="text-blue-600 hover:text-blue-800">
              View Details →
            </Link>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-gray-50 border-t border-gray-100 p-4">{renderActionButtons() || <div className="h-10" />}</div>
    </div>
  );
};
