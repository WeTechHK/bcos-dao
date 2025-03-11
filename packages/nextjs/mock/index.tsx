export const mockProposals = [
  {
    id: 0,
    proposer: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    startBlock: 12,
    endBlock: 25,
    eta: 10,
    state: "Pending",
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
  },
  {
    id: 1,
    proposer: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    startBlock: 33,
    endBlock: 99,
    eta: 10,
    state: "Active",
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
  },
  {
    id: 2,
    proposer: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    startBlock: 64,
    endBlock: 234,
    eta: 200,
    state: "Canceled",
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
  },
  {
    id: 3,
    proposer: "0x3456789012345678901234567890123456789012",
    startBlock: 1200,
    endBlock: 2200,
    eta: 0,
    state: "Pending",
    targets: ["0x3456..."],
    values: ["0"],
    calldatas: ["0x3456..."],
    description: "Proposal to update the governance framework for better decision-making.",
    forVotes: 156,
    againstVotes: 89,
    abstainVotes: 34,
  },
  {
    id: 4,
    proposer: "0x4567890123456789012345678901234567890123",
    startBlock: 1100,
    endBlock: 2100,
    eta: 0,
    state: "Defeated",
    targets: ["0x4567..."],
    values: ["0"],
    calldatas: ["0x4567..."],
    description: "Proposal to fund a comprehensive security audit of the network.",
    forVotes: 178,
    againstVotes: 245,
    abstainVotes: 67,
  },
];
