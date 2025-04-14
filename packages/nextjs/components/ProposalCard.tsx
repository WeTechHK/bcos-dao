"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Popover } from "antd";
import classNames from "classnames";
import { useProposalVotes, useQuorumNumerator } from "~~/hooks/blockchain/BCOSGovernor";
import { useTotalSupply } from "~~/hooks/blockchain/ERC20VotePower";
import { ProposalState, stateColorsClassName } from "~~/services/store/store";
import { formatUTCDate } from "~~/utils/TimeFormatter";
import { formatToken } from "~~/utils/TokenFormatter";

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
  executedBlock: number;
  canceledBlock: number;
}

function truncateWords(text: string, maxWords = 25) {
  const maxLength = maxWords * 6;
  const regex = new RegExp(`^(\\s*\\S+){${maxWords}}|.+$`, "g");
  const matched = text.match(regex);
  if (!matched) {
    if (text.length > maxLength) {
      return text.slice(0, maxWords) + "...";
    } else {
      return text;
    }
  }
  const result = matched[0].replace(/(\s+\S*)$/, "...");
  if (result.length > maxLength) {
    return result.slice(0, maxLength) + "...";
  } else {
    return result;
  }
}

function CardHeader(props: { state: string | ProposalState; id: number }) {
  const colorClassName =
    stateColorsClassName[
      typeof props.state === "string" ? ProposalState[props.state as keyof typeof ProposalState] : Number(props.state)
    ];
  return (
    <div
      className={classNames(
        "flex p-4 justify-between items-center",
        `bg-${colorClassName}-300`,
        `border-${colorClassName}-300`,
        `text-${colorClassName}-800`,
      )}
    >
      <span className={`px-3 py-1 text-sm font-semibold rounded-full bg-white`}>
        {typeof props.state === "string" ? props.state : ProposalState[Number(props.state)]}
      </span>
      <span className="text-lg font-bold text-white">No. {props.id}</span>
    </div>
  );
}

function CardFooter(props: {
  state: string | ProposalState;
  totalVotes: any;
  progressFixed: number;
  progress: number;
  eta: number;
  startTime: number;
  endTime: number;
  id: number;
  executedBlock: number;
  canceledBlock: number;
}) {
  const [timeRange, setTimeRange] = useState<string>();
  const [etaTime, setEtaTime] = useState<string>();

  useEffect(() => {
    if (props.startTime && props.endTime) {
      const startTimeString = formatUTCDate(props.startTime * 1000);
      const endTimeString = formatUTCDate(props.endTime * 1000);
      setTimeRange(`${startTimeString} - ${endTimeString}`);
    }
  }, [props.startTime, props.endTime]);

  useEffect(() => {
    if (props.eta && props.eta !== 0) {
      const etaString = formatUTCDate(props.eta * 1000);
      setEtaTime(etaString);
    }
  }, [props.eta]);
  return (
    <div className="mt-4">
      {props.state === ProposalState.Pending && (
        <div className="flex justify-between text-sm">
          <span className="text-sm text-base-content">{"Pending to be approved by maintainer."}</span>
          <Link
            href={{ pathname: "/proposal/detail", query: { id: props.id } }}
            className="text-blue-600 hover:text-blue-800"
          >
            View Details →
          </Link>
        </div>
      )}
      {(props.state === ProposalState.Active ||
        props.state === ProposalState.Defeated ||
        props.state === ProposalState.Succeeded ||
        props.state === ProposalState.Queued) && (
        <>
          <div className="space-y-2 mb-3">
            <div className="flex justify-between items-center text-sm">
              <span className=" text-base-content">Total Votes: {formatToken(props.totalVotes).toFixed(4)} EVP</span>
              {props.progressFixed === 100 ? (
                <span className="text-base-content font-medium">Reach Quorum!</span>
              ) : (
                <span className="text-base-content font-medium">{props.progress.toFixed(1)}%</span>
              )}
            </div>
            <div className="w-full bg-base-content rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${props.progressFixed}%` }}></div>
            </div>
          </div>
          <div className="flex justify-between text-sm">
            {props.eta === 0 ? (
              <span className="text-sm text-base-content">{timeRange ? timeRange : ""}</span>
            ) : (
              <span className="text-sm text-base-content">Executable Time : {etaTime}</span>
            )}
            <Link
              href={{ pathname: "/proposal/detail", query: { id: props.id } }}
              className="text-blue-600 hover:text-blue-800"
            >
              View Details →
            </Link>
          </div>
        </>
      )}
      {/*show time range*/}
      {props.state === ProposalState.Canceled && (
        <div className="flex justify-between text-sm">
          <span className="text-base-content font-medium">Canceled in block #{props.canceledBlock.toString()}</span>
          <Link
            href={{ pathname: "/proposal/detail", query: { id: props.id } }}
            className="text-blue-600 hover:text-blue-800"
          >
            View Details →
          </Link>
        </div>
      )}
      {props.state === ProposalState.Executed && (
        <div className="flex justify-between text-sm">
          <span className="text-base-content font-medium">Executed in block #{props.executedBlock.toString()}</span>
          <Link
            href={{ pathname: "/proposal/detail", query: { id: props.id } }}
            className="text-blue-600 hover:text-blue-800"
          >
            View Details →
          </Link>
        </div>
      )}
    </div>
  );
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
  executedBlock,
  canceledBlock,
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

  return (
    <div className="flex-col bg-base-100 rounded-xl shadow-lg overflow-hidden hover:-translate-y-1.5 duration-300">
      <div>
        {/* Header */}
        <CardHeader state={state} id={id} />
      </div>
      <div className="p-6 pt-3 flex flex-col h-[280px]">
        {/* Content */}
        <div className="flex-1">
          <Popover content={title} trigger="hover" placement="topLeft" overlayStyle={{ maxWidth: "50%" }}>
            <h3 className="text-lg font-semibold text-neutral mb-2 whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer">
              {title}
            </h3>
          </Popover>
          <div className="flex items-center gap-2">
            <span className="bg-base-200 text-neutral px-2 py-1 rounded text-sm">
              By: {proposer.slice(0, 6)}...{proposer.slice(-4)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-base-content">{truncateWords(description)}</div>
        </div>

        {/* Footer */}
        <CardFooter
          state={state}
          totalVotes={totalVotes}
          progressFixed={progressFixed}
          progress={progress}
          eta={eta}
          startTime={startTime}
          endTime={endTime}
          id={id}
          executedBlock={executedBlock}
          canceledBlock={canceledBlock}
        />
      </div>
    </div>
  );
};
