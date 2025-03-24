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
  title: string;
}

interface ProposalApprovalFlow {
  proposalId: number;
  approvalFlow: {
    approvers: string[];
    approved: boolean;
  };
}

function getProposalInfo(data: any, proposalId: number) {
  const {
    proposer,
    proposalState,
    proposalDetail,
    proposalVote,
    startBlock,
    endBlock,
    eta,
    proposalTitle,
    proposalDesc,
  } = data;
  return {
    eta: Number(eta),
    id: proposalId,
    proposer: proposer,
    startBlock: Number(startBlock),
    endBlock: Number(endBlock),
    state: proposalState,
    targets: [...proposalDetail.targets],
    values: [...proposalDetail.values],
    calldatas: [...proposalDetail.calldatas],
    description: proposalDesc,
    forVotes: Number(proposalVote.forVotes),
    againstVotes: Number(proposalVote.againstVotes),
    abstainVotes: Number(proposalVote.abstainVotes),
    title: proposalTitle,
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
const useProposalList = (offset: number, page: number, totalNumber: number) => {
  const latestProposal = useLatestProposalId();
  console.log("latestProposal: ", latestProposal);
  // 状态管理
  const [data, setData] = useState<ProposalAllInfo[]>([]); // 存储接口返回的数据
  const [filterState, setFilterState] = useState(-1); // 存储接口返回的数据
  // const [loading, setLoading] = useState(false); // 加载状态
  const [currentOffset, setCurrentOffset] = useState(offset); // 当前偏移量
  const [currentPage] = useState(page); // 当前页码
  const { data: proposalInfosData, refetch } = useScaffoldReadContract({
    contractName: "BCOSGovernor",
    functionName: "getProposalInfoPage",
    args: [BigInt(currentOffset), BigInt(currentPage)],
  });

  useEffect(() => {
    console.log("proposalInfosData: ", proposalInfosData);
    if (proposalInfosData && totalNumber) {
      const handledData = proposalInfosData.map(pro => {
        return getProposalInfo(pro, Number(pro.proposalId));
      });
      setData(prevData =>
        [...prevData, ...handledData].filter(v => {
          if (filterState === -1) {
            return true;
          }
          return Number(v.state) === filterState;
        }),
      );
    }
  }, [proposalInfosData, filterState, totalNumber]); // 保持这个依赖

  // 添加新的 useEffect 来监听 currentOffset 变化
  useEffect(() => {
    // 当 offset 变化时，重新获取数据
    refetch();
  }, [currentOffset, refetch]);

  // 切换新的 filterState 来监听 currentOffset 变化
  useEffect(() => {
    // 当 offset 变化时，重新获取数据
    setCurrentOffset(0);
  }, [filterState]);

  function loadMore() {
    if (totalNumber > currentOffset) {
      console.log("load more");
      setCurrentOffset(currentOffset + currentPage);
    }
  }

  function switchProposalState(proposalState: number) {
    setFilterState(proposalState);
  }

  const hasMoreProposals = totalNumber > currentOffset;
  return { data, loadMore, hasMoreProposals, switchProposalState };
};

function useHasVoted(proposalId: number, voter: string): boolean {
  const { data: hasVoted } = useScaffoldReadContract({
    contractName: "BCOSGovernor",
    functionName: "hasVoted",
    args: [BigInt(proposalId), voter],
  });

  if (hasVoted === undefined) {
    return false;
    // throw new Error("Invalid proposal has voted data");
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

function useProposalVoterInfo(
  proposalId: number,
  voter: string,
): {
  voter: string;
  weight: number;
  support: VoteType;
  blockNumber: number;
} {
  const { data: info } = useScaffoldReadContract({
    contractName: "BCOSGovernor",
    functionName: "proposalVoterInfo",
    args: [BigInt(proposalId), voter],
  });

  if (info === undefined) {
    throw new Error("Invalid proposal voter weight data");
  }
  const [weight, support, blockNumber] = info;
  console.log("useProposalVoterInfo useScaffoldReadContract: ", info);
  return { voter: voter, weight: Number(weight), support: support, blockNumber: Number(blockNumber) };
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

function useProposalThreshold(): number {
  const { data: proposalThreshold } = useScaffoldReadContract({
    contractName: "BCOSGovernor",
    functionName: "proposalThreshold",
  });

  if (proposalThreshold === undefined) {
    throw new Error("Invalid proposal threshold data");
  }
  console.log("useProposalThreshold useScaffoldReadContract: ", proposalThreshold);
  return Number(proposalThreshold);
}

function useProposalVotes(proposalId: number) {
  const { data } = useScaffoldReadContract({
    contractName: "BCOSGovernor",
    functionName: "proposalVotes",
    args: [BigInt(proposalId)],
  });

  if (!data) return { againstVotes: 0n, forVotes: 0n, abstainVotes: 0n };

  const [against, forVotes, abstain] = data;
  return { againstVotes: against, forVotes, abstainVotes: abstain };
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
    return false;
    // throw new Error("Invalid maintainer data");
  }
  console.log("useIsMaintainer useScaffoldReadContract: ", isMaintainer);
  return Boolean(isMaintainer);
}

export {
  useProposalAllInfo,
  useLatestProposalId,
  useProposalApprovalFlow,
  useProposalVoters,
  useProposalVoterInfo,
  useApproveProposal,
  useCancelProposal,
  useEmergencyShutdownProposal,
  useCastVote,
  useHasVoted,
  useQueueProposal,
  useProposalThreshold,
  useExecuteProposal,
  useIsMaintainer,
  useProposalInfoPage,
  useProposalList,
  useProposalVotes,
};

export type { ProposalAllInfo, ProposalState };
