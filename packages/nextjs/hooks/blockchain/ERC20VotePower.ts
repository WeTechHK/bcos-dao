"use client";

import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export const useVotePower = (address: string) => {
  const { data: votePowerData, refetch: refetchVotePower } = useScaffoldReadContract({
    contractName: "ERC20VotePower",
    functionName: "getVotes",
    args: [address],
  });

  return { votePowerData, refetchVotePower };
};

export const useVotePowerDecimal = () => {
  const { data: decimals } = useScaffoldReadContract({
    contractName: "ERC20VotePower",
    functionName: "decimals",
  });

  return decimals;
};

export const useDelegates = (address: string) => {
  const { data: delegatesData } = useScaffoldReadContract({
    contractName: "ERC20VotePower",
    functionName: "delegates",
    args: [address],
  });

  return delegatesData;
};

export const useDelegatees = () => {
  const { data: delegateesData } = useScaffoldReadContract({
    contractName: "ERC20VotePower",
    functionName: "getDelegatees",
  });

  return delegateesData;
};

export const useDelegate = () => {
  const { writeContractAsync: delegateAsync } = useScaffoldWriteContract({
    contractName: "ERC20VotePower",
  });

  return async (address: string) => {
    await delegateAsync({
      functionName: "delegate",
      args: [address],
    });
  };
};

export const useTotalSupply = () => {
  const { data: totalSupplyData } = useScaffoldReadContract({
    contractName: "ERC20VotePower",
    functionName: "totalSupply",
  });

  if (totalSupplyData === undefined) {
    return 0n;
  }

  return totalSupplyData;
};

export const useBalanceOf = (address: string) => {
  const { data: balanceData } = useScaffoldReadContract({
    contractName: "ERC20VotePower",
    functionName: "balanceOf",
    args: [address],
  });

  return balanceData;
};

export const useSymbol = () => {
  const { data: symbol } = useScaffoldReadContract({
    contractName: "ERC20VotePower",
    functionName: "symbol",
  });

  return symbol;
};
