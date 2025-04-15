import { formatEther } from "viem";

export const formatToken = (token: bigint | number | undefined) => {
  return token ? Number(formatEther(BigInt(token))) : 0;
};

export const formatAddress = (address: string | undefined) => {
  if (!address) return "";
  return address.length > 10 ? `${address.slice(0, 8)}...${address.slice(-6)}` : address;
};
