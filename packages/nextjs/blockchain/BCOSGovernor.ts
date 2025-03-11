// FIXME)): This file is not used in the project. It is just a reference for the future.
// import governorAbi from "../../hardhat/artifacts/contracts/BCOSGovernor.sol/BCOSGovernor.json";
import * as dotenv from "dotenv";

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

interface ProposalAllInfo {
  id: number;
  proposer: string;
  startBlock: number;
  endBlock: number;
  eta: number;
  state: ProposalState;
  targets: string[];
  values: bigint[];
  calldatas: string[];
  description: string;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
}

async function getProposalAllInfo(proposalId: number): Promise<ProposalAllInfo | undefined> {
  if (proposalId < 0) {
    throw new Error("Invalid proposal ID");
  }

  if (proposalId % 3 === 0) {
    return {
      id: proposalId,
      proposer: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      startBlock: 12,
      endBlock: 25,
      eta: 10,
      state: ProposalState.Pending,
      targets: ["0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"],
      values: [10000n],
      calldatas: ["0x67e4dc7200000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8"],
      description:
        "This proposal suggests updating the governance parameters to improve the decision-making process:\n" +
        "                            - Reduce minimum quorum from 60% to 51%\n" +
        "                            - Extend voting period from 7 days to 14 days\n" +
        "                            - Implement time-weighted voting power",
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
    };
  }
  if (proposalId % 3 === 1) {
    return {
      id: proposalId,
      proposer: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      startBlock: 33,
      endBlock: 99,
      eta: 10,
      state: ProposalState.Active,
      targets: ["0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"],
      values: [10000n],
      calldatas: ["0x67e4dc7200000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8"],
      description:
        "This proposal suggests updating the governance parameters to improve the decision-making process:\n" +
        "                            - Reduce minimum quorum from 60% to 51%\n" +
        "                            - Extend voting period from 7 days to 14 days\n" +
        "                            - Implement time-weighted voting power",
      forVotes: 10,
      againstVotes: 1,
      abstainVotes: 9,
    };
  }
  if (proposalId % 3 === 2) {
    return {
      id: proposalId,
      proposer: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      startBlock: 64,
      endBlock: 234,
      eta: 200,
      state: ProposalState.Canceled,
      targets: ["0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"],
      values: [10000n],
      calldatas: ["0x67e4dc7200000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8"],
      description:
        "This proposal suggests updating the governance parameters to improve the decision-making process:\n" +
        "                            - Reduce minimum quorum from 60% to 51%\n" +
        "                            - Extend voting period from 7 days to 14 days\n" +
        "                            - Implement time-weighted voting power",
      forVotes: 20,
      againstVotes: 1,
      abstainVotes: 0,
    };
  }
}

export { getProposalAllInfo };
