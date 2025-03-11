import { ethers } from "ethers";

export const Enum = (...options: string[]) => Object.fromEntries(options.map((key, i) => [key, BigInt(i)]));
export const EnumTyped = (...options: string[]) =>
  Object.fromEntries(options.map((key, i) => [key, ethers.Typed.uint8(i)]));

export const ProposalState = Enum(
  "Pending",
  "Active",
  "Canceled",
  "Defeated",
  "Succeeded",
  "Queued",
  "Expired",
  "Executed",
);
export const VoteType = Object.assign(Enum("Against", "For", "Abstain"), { Parameters: 255n });
export const OperationState = Enum("Unset", "Waiting", "Ready", "Done");
