"use client";

import Link from "next/link";
import { UserRole, useGlobalState } from "~~/services/store/store";

interface ProposalCardProps {
  id: number;
  proposer: string;
  startBlock: number;
  endBlock: number;
  eta: number;
  state: string;
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
  const { userRole } = useGlobalState(state => state);

  // 根据状态设置颜色
  const stateColors = {
    Pending: "bg-yellow-100 text-yellow-800",
    Active: "bg-green-100 text-green-800",
    Canceled: "bg-gray-100 text-gray-800",
    Defeated: "bg-red-100 text-red-800",
    Succeeded: "bg-blue-100 text-blue-800",
    Queued: "bg-purple-100 text-purple-800",
    Expired: "bg-orange-100 text-orange-800",
    Executed: "bg-green-100 text-green-800",
  };

  const totalVotes = forVotes + againstVotes + abstainVotes;
  const progress = totalVotes > 0 ? (forVotes / totalVotes) * 100 : 0;

  const renderActionButtons = () => {
    if (state === "Pending" && userRole === UserRole.MAINTAINER) {
      return (
        <div className="flex gap-3 mt-4">
          <button className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
            Approve
          </button>
          <button className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
            Reject
          </button>
        </div>
      );
    }

    if (state === "Active" && userRole === UserRole.VOTER) {
      return (
        <div className="flex gap-3 mt-4">
          <button className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
            For
          </button>
          <button className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
            Against
          </button>
          <button className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
            Abstain
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="proposal-card bg-white rounded-xl shadow-lg overflow-hidden hover:-translate-y-1.5 duration-300">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full ${stateColors[state as keyof typeof stateColors]}`}
          >
            {state}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Block: {startBlock} - {endBlock}
            </span>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Proposal #{id}</h3>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-sm">
            By: {proposer.slice(0, 6)}...{proposer.slice(-4)}
          </span>
        </div>
        <div className="space-y-3">
          {state === "Active" && (
            <>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">For Votes</span>
                <span className="text-gray-900 font-medium">{progress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            </>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total Votes: {totalVotes}</span>
            <Link href={{ pathname: "/proposal/detail", query: { id } }} className="text-blue-600 hover:text-blue-800">
              View Details →
            </Link>
          </div>
          {renderActionButtons()}
        </div>
      </div>
    </div>
  );
};
