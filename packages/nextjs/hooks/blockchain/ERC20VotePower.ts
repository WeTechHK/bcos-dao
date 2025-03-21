"use client";

import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export const useVotePower = (address: string) => {
  const { data: votePowerData } = useScaffoldReadContract({
    contractName: "ERC20VotePower",
    functionName: "getVotes",
    args: [address],
  });

  return votePowerData;
};

export const useDelegates = (address: string) => {
  const { data: delegatesData } = useScaffoldReadContract({
    contractName: "ERC20VotePower",
    functionName: "delegates",
    args: [address],
  });

  return delegatesData;
};

export const useDelegate = (address: string) => {
  const { writeContractAsync: delegateAsync } = useScaffoldWriteContract({
    contractName: "ERC20VotePower",
  });

  return async () => {
    await delegateAsync({
      functionName: "delegate",
      args: [address],
    });
  };
};
