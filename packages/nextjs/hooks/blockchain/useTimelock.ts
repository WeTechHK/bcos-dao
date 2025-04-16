"use client";

import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export const useMinDelay = () => {
  const { data: minDelay } = useScaffoldReadContract({
    contractName: "CustomTimelockControllerUpgradeable",
    functionName: "getMinDelay",
  });

  return { minDelay };
};
