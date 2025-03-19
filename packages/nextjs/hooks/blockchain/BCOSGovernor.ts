"use client";

import { useEffect, useState } from "react";
import * as dotenv from "dotenv";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

dotenv.config();

enum ProposalState {
  Pending = 0,
  Active = 1,
  Canceled = 2,
  Defeated = 3,
  Succeeded = 4,
  Queued = 5,
  Expired = 6,
  Executed = 7,
}

enum VoteType {
  Against = 0,
  VoteFor = 1,
  Abstain = 2,
}

interface ProposalAllInfo {
  id: number;
  proposer: string;
  startBlock: number;
  endBlock: number;
  eta: number;
  state: ProposalState | string;
  targets: string[];
  values: bigint[];
  calldatas: string[];
  description: string;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
}

interface ProposalApprovalFlow {
  proposalId: number;
  approvalFlow: {
    approvers: string[];
    approved: boolean;
  };
}

function getProposalInfo(data: any, proposalId: number) {
  const [proposer, state, proposalDetail, proposalVote, startBlock, endBlock, eta] = data;
  return {
    eta: Number(eta),
    id: proposalId,
    proposer: proposer,
    startBlock: Number(startBlock),
    endBlock: Number(endBlock),
    state: state,
    targets: [...proposalDetail.targets],
    values: [...proposalDetail.values],
    calldatas: [...proposalDetail.calldatas],
    description: proposalDetail.descriptionHash,
    forVotes: Number(proposalVote.forVotes),
    againstVotes: Number(proposalVote.againstVotes),
    abstainVotes: Number(proposalVote.abstainVotes),
  };
}

const useProposalAllInfo = (proposalId: number) => {
  if (proposalId === undefined || Number.isNaN(proposalId) || proposalId < 0) {
    throw new Error("Invalid proposal ID");
  }
  const { data, refetch } = useScaffoldReadContract({
    contractName: "BCOSGovernor",
    functionName: "getProposalAllInfo",
    args: [BigInt(proposalId)],
  });

  const [info, setInfo] = useState<ProposalAllInfo>();

  useEffect(() => {
    if (!data) {
      refetch()
        .then(data => {
          if (data) {
            setInfo(getProposalInfo(data, proposalId));
          }
        })
        .catch(error => {
          console.error("Error fetching proposal data:", error);
        });
    } else {
      setInfo(getProposalInfo(data, proposalId));
    }
  }, [data, proposalId, refetch]);
  return info;
};

const useLatestProposalId = () => {
  const [latestId, setLatestId] = useState<number>(0);
  const { data: latestProposalId } = useScaffoldReadContract({
    contractName: "BCOSGovernor",
    functionName: "latestProposalId",
  });

  useEffect(() => {
    console.log("useLatestProposalId useScaffoldReadContract: ", latestProposalId);
    setLatestId(Number(latestProposalId));
  }, [latestProposalId]);

  return latestId;
};

const useProposalInfoPage = (offset: number, page: number) => {
  const { data: proposalInfos } = useScaffoldReadContract({
    contractName: "BCOSGovernor",
    functionName: "getProposalInfoPage",
    args: [BigInt(offset), BigInt(page)],
  });

  return proposalInfos?.map(pro => {
    return getProposalInfo(pro, Number(pro.proposalId));
  });
};

function useHasVoted(proposalId: number, voter: string): boolean {
  const { data: hasVoted } = useScaffoldReadContract({
    contractName: "BCOSGovernor",
    functionName: "hasVoted",
    args: [BigInt(proposalId), voter],
  });

  if (hasVoted === undefined) {
    throw new Error("Invalid proposal has voted data");
  }
  console.log("useHasVoted useScaffoldReadContract: ", hasVoted);
  return Boolean(hasVoted);
}

function useProposalVoters(proposalId: number): { voters: string[] } {
  const { data: voters } = useScaffoldReadContract({
    contractName: "BCOSGovernor",
    functionName: "proposalVoters",
    args: [BigInt(proposalId)],
  });

  if (voters === undefined) {
    throw new Error("Invalid proposal voters data");
  }
  console.log("useProposalVoters useScaffoldReadContract: ", voters);
  return { voters: [...voters] };
}

function useProposalVoterWeight(proposalId: number, voter: string): { weight: bigint } {
  const { data: weight } = useScaffoldReadContract({
    contractName: "BCOSGovernor",
    functionName: "proposalVoterWeight",
    args: [BigInt(proposalId), voter],
  });

  if (weight === undefined) {
    throw new Error("Invalid proposal voter weight data");
  }
  console.log("useProposalVoterWeight useScaffoldReadContract: ", weight);
  return { weight: BigInt(weight) };
}

function useProposalVoterBlock(proposalId: number, voter: string): { blockNumber: number } {
  const { data: blockNumber } = useScaffoldReadContract({
    contractName: "BCOSGovernor",
    functionName: "proposalVoterBlock",
    args: [BigInt(proposalId), voter],
  });

  if (blockNumber === undefined) {
    throw new Error("Invalid proposal voter block number data");
  }
  console.log("useProposalVoterBlock useScaffoldReadContract: ", blockNumber);
  return { blockNumber: Number(blockNumber) };
}

function useProposalApprovalFlow(proposalId: number): ProposalApprovalFlow {
  const { data: latestProposalApprovalFlow } = useScaffoldReadContract({
    contractName: "BCOSGovernor",
    functionName: "getProposalApprovalFlow",
    args: [BigInt(proposalId)],
  });

  if (latestProposalApprovalFlow === undefined) {
    throw new Error("Invalid proposal approval flow data");
  }
  console.log("useProposalApprovalFlow useScaffoldReadContract: ", latestProposalApprovalFlow);
  return {
    proposalId: proposalId,
    approvalFlow: {
      approvers: [...latestProposalApprovalFlow.approvers] || [],
      approved: latestProposalApprovalFlow?.approved || false,
    },
  };
}

function useApproveProposal(proposalId: number) {
  const { writeContractAsync: approveProposalAsync } = useScaffoldWriteContract({ contractName: "BCOSGovernor" });
  return async () => {
    await approveProposalAsync({
      functionName: "approveProposal",
      args: [BigInt(proposalId)],
    });
  };
}

function useCancelProposal(proposalId: number) {
  const { writeContractAsync: cancelProposalAsync } = useScaffoldWriteContract({ contractName: "BCOSGovernor" });
  return async () => {
    await cancelProposalAsync({
      functionName: "cancelById",
      args: [BigInt(proposalId)],
    });
  };
}

function useEmergencyShutdownProposal(proposalId: number) {
  const { writeContractAsync: emergencyShutdownProposalAsync } = useScaffoldWriteContract({
    contractName: "BCOSGovernor",
  });
  return async () => {
    await emergencyShutdownProposalAsync({
      functionName: "emergencyShutdownProposal",
      args: [BigInt(proposalId)],
    });
  };
}

function useCastVote(proposalId: number, support: VoteType, reason: string) {
  const { writeContractAsync: castVoteAsync } = useScaffoldWriteContract({ contractName: "BCOSGovernor" });
  return async () => {
    await castVoteAsync({
      functionName: "vote",
      args: [BigInt(proposalId), support, reason],
    });
  };
}

function useQueueProposal(proposalId: number) {
  const { writeContractAsync: queueProposalAsync } = useScaffoldWriteContract({ contractName: "BCOSGovernor" });
  return async () => {
    await queueProposalAsync({
      functionName: "queueById",
      args: [BigInt(proposalId)],
    });
  };
}

function useExecuteProposal(proposalId: number) {
  const { writeContractAsync: executeProposalAsync } = useScaffoldWriteContract({ contractName: "BCOSGovernor" });
  return async () => {
    await executeProposalAsync({
      functionName: "executeById",
      args: [BigInt(proposalId)],
    });
  };
}

function useIsMaintainer(account: string): boolean {
  const { data: maintainerTag } = useScaffoldReadContract({
    contractName: "BCOSGovernor",
    functionName: "MAINTAINER_ROLE",
  });
  const { data: isMaintainer } = useScaffoldReadContract({
    contractName: "BCOSGovernor",
    functionName: "hasRole",
    args: [maintainerTag, account],
  });

  if (isMaintainer === undefined) {
    throw new Error("Invalid maintainer data");
  }
  console.log("useIsMaintainer useScaffoldReadContract: ", isMaintainer);
  return Boolean(isMaintainer);
}

export {
  useProposalAllInfo,
  useLatestProposalId,
  useProposalApprovalFlow,
  useProposalVoters,
  useProposalVoterWeight,
  useProposalVoterBlock,
  useApproveProposal,
  useCancelProposal,
  useEmergencyShutdownProposal,
  useCastVote,
  useHasVoted,
  useQueueProposal,
  useExecuteProposal,
  useIsMaintainer,
  useProposalInfoPage,
};

export type { ProposalAllInfo, ProposalState };
