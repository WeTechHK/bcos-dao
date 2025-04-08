import { formatEther } from "viem";

export const formatToken = (token: bigint | number | undefined) => {
  return token ? Number(formatEther(BigInt(token))) : 0;
};
