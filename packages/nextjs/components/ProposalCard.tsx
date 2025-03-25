"use client";

import Link from "next/link";
import { Popover } from "antd";
import { useProposalVotes } from "~~/hooks/blockchain/BCOSGovernor";
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
  title: string;
}

export const ProposalCard = ({ id, title, proposer, startBlock, endBlock, state, description }: ProposalCardProps) => {
  const {
    forVotes: forVotesFromContract,
    againstVotes: againstVotesFromContract,
    abstainVotes: abstainVotesFromContract,
  } = useProposalVotes(id);
  const totalVotes = Number(forVotesFromContract) + Number(againstVotesFromContract) + Number(abstainVotesFromContract);
  const progress = totalVotes > 0 ? (Number(forVotesFromContract) / totalVotes) * 100 : 0;

  return (
    <div className="proposal-card bg-white rounded-xl shadow-lg overflow-hidden hover:-translate-y-1.5 duration-300">
      <div className="p-6 flex flex-col h-[280px]">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full ${
              stateColors[
                typeof state === "string" ? ProposalState[state as keyof typeof ProposalState] : Number(state)
              ]
            }`}
          >
            {typeof state === "string" ? state : ProposalState[Number(state)]}
          </span>
          <span className="text-sm text-gray-500">
            Block: {startBlock} - {endBlock}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1">
          <Popover content={title} trigger="hover" placement="topLeft" overlayStyle={{ maxWidth: "50%" }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer">
              {title}
            </h3>
          </Popover>
          <div className="flex items-center gap-2">
            <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-sm">
              By: {proposer.slice(0, 6)}...{proposer.slice(-4)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4">
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
    </div>
  );
};
