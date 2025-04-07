"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Popover } from "antd";
import { useProposalVotes, useQuorumNumerator } from "~~/hooks/blockchain/BCOSGovernor";
import { useTotalSupply } from "~~/hooks/blockchain/ERC20VotePower";
import { ProposalState, stateColors } from "~~/services/store/store";
import { formatUTCDate } from "~~/utils/TimeFormatter";

interface ProposalCardProps {
  id: number;
  proposer: string;
  startTime: number;
  endTime: number;
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

function truncateWords(text: string, maxWords = 25) {
  const regex = new RegExp(`^(\\s*\\S+){${maxWords}}|.+$`, "g");
  const matched = text.match(regex);
  if (!matched) return text.slice(0, maxWords) + "...";
  return matched[0].replace(/(\s+\S*)$/, "...");
}

export const ProposalCard = ({
  id,
  title,
  proposer,
  startTime,
  endTime,
  eta,
  state,
  description,
}: ProposalCardProps) => {
  const {
    forVotes: forVotesFromContract,
    againstVotes: againstVotesFromContract,
    abstainVotes: abstainVotesFromContract,
  } = useProposalVotes(id);
  const quorumNumerator = useQuorumNumerator();
  const totalSupply = useTotalSupply();
  const quorum = (BigInt(quorumNumerator) * totalSupply) / 100n;
  const totalVotes = forVotesFromContract + againstVotesFromContract + abstainVotesFromContract;
  const progress = Number(quorum > 0 ? (totalVotes / quorum) * 100n : 0);
  const progressFixed = progress >= 100 ? 100 : progress;

  const [timeRange, setTimeRange] = useState<string>();
  const [etaTime, setEtaTime] = useState<string>();

  useEffect(() => {
    if (startTime && endTime) {
      const startTimeString = formatUTCDate(startTime * 1000);
      const endTimeString = formatUTCDate(endTime * 1000);
      setTimeRange(`${startTimeString} - ${endTimeString}`);
    }
  }, [startTime, endTime]);

  useEffect(() => {
    if (eta && eta !== 0) {
      const etaString = formatUTCDate(eta * 1000);
      setEtaTime(etaString);
    }
  }, [eta]);

  return (
    <div className="flex-col bg-white rounded-xl shadow-lg overflow-hidden hover:-translate-y-1.5 duration-300">
      <div>
        {/* Header */}
        <div
          className={`flex p-4 justify-between items-center ${
            stateColors[typeof state === "string" ? ProposalState[state as keyof typeof ProposalState] : Number(state)]
          }`}
        >
          <span className={`px-3 py-1 text-sm font-semibold rounded-full bg-white`}>
            {typeof state === "string" ? state : ProposalState[Number(state)]}
          </span>
          <span className="text-lg font-bold text-white">No. {id}</span>
        </div>
      </div>
      <div className="p-6 pt-3 flex flex-col h-[280px]">
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
          <div className="flex items-center gap-2">{truncateWords(description)}...</div>
        </div>

        {/* Footer */}
        <div className="mt-4">
          {state !== ProposalState.Pending && state !== ProposalState.Canceled && (
            <div className="space-y-2 mb-3">
              <div className="flex justify-between items-center text-sm">
                <span className=" text-gray-500">Total Votes: {(totalVotes / 10n ** 18n).toString()}</span>
                {progressFixed === 100 ? (
                  <span className="text-gray-900 font-medium">Reach Quorum!</span>
                ) : (
                  <span className="text-gray-900 font-medium">{progress.toFixed(1)}%</span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${progressFixed}%` }}></div>
              </div>
            </div>
          )}
          {/*show time range*/}
          {state === ProposalState.Canceled && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-900 font-medium">Canceled</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            {eta === 0 ? (
              <span className="text-sm text-gray-500">{timeRange ? timeRange : ""}</span>
            ) : (
              <span className="text-sm text-gray-500">Executable Time : {etaTime}</span>
            )}
            <Link href={{ pathname: "/proposal/detail", query: { id } }} className="text-blue-600 hover:text-blue-800">
              View Details →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
