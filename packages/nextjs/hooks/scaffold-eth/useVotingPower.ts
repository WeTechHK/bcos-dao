import { useAccount, useReadContract } from "wagmi";
import { useScaffoldContract } from "~~/hooks/scaffold-eth/useScaffoldContract";

export const useVotingPower = () => {
  const { address: userAddress } = useAccount();
  const { data: governorContract } = useScaffoldContract({ contractName: "BCOSGovernor" });
  console.log("userAddress", userAddress);
  console.log("governorContract", governorContract);
  const { data: votingPower } = useReadContract({
    address: governorContract?.address,
    abi: governorContract?.abi,
    functionName: "getVotes",
    args: [userAddress],
    query: {
      enabled: !!userAddress && !!governorContract,
    },
  });
  console.log("votingPower", votingPower);
  return {
    votingPower: votingPower ? Number(votingPower) : 0,
  };
};
