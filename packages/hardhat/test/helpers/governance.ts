import { ProposalState } from "./enums";
import { ethers } from "ethers";
import { expect } from "chai";
import Iterate from "./iterate";

export const proposalStatesToBitMap = (proposalStates: any[]) => {
  if (!Array.isArray(proposalStates)) {
    proposalStates = [proposalStates];
  }
  const statesCount = ethers.toBigInt(Object.keys(ProposalState).length);
  let result = 0n;

  for (const state of Iterate.unique(proposalStates)) {
    if (state < 0n || state >= statesCount) {
      expect.fail(`ProposalState ${state} out of possible states (0...${statesCount}-1)`);
    } else {
      result |= 1n << state;
    }
  }

  return ethers.toBeHex(result, 32);
};
