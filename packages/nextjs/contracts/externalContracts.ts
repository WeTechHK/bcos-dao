import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

/**
 * @example
 * const externalContracts = {
 *   1: {
 *     DAI: {
 *       address: "0x...",
 *       abi: [...],
 *     },
 *   },
 * } as const;
 */
const externalContracts = {
  20200: {
    CommitteeManager: {
      address: "0x0000000000000000000000000000000000010001",
      abi: [
        {
          inputs: [
            {
              internalType: "address[]",
              name: "initGovernors",
              type: "address[]",
            },
            {
              internalType: "uint32[]",
              name: "weights",
              type: "uint32[]",
            },
            {
              internalType: "uint8",
              name: "participatesRate",
              type: "uint8",
            },
            {
              internalType: "uint8",
              name: "winRate",
              type: "uint8",
            },
          ],
          stateMutability: "nonpayable",
          type: "constructor",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: "int256",
              name: "",
              type: "int256",
            },
          ],
          name: "execResult",
          type: "event",
        },
        {
          inputs: [],
          name: "_committee",
          outputs: [
            {
              internalType: "contract Committee",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "_proposalMgr",
          outputs: [
            {
              internalType: "contract ProposalManager",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "account",
              type: "address",
            },
            {
              internalType: "bool",
              name: "openFlag",
              type: "bool",
            },
            {
              internalType: "uint256",
              name: "blockNumberInterval",
              type: "uint256",
            },
          ],
          name: "createModifyDeployAuthProposal",
          outputs: [
            {
              internalType: "uint256",
              name: "currentproposalId",
              type: "uint256",
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "newAdmin",
              type: "address",
            },
            {
              internalType: "address",
              name: "contractAddr",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "blockNumberInterval",
              type: "uint256",
            },
          ],
          name: "createResetAdminProposal",
          outputs: [
            {
              internalType: "uint256",
              name: "currentproposalId",
              type: "uint256",
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "string",
              name: "node",
              type: "string",
            },
            {
              internalType: "uint256",
              name: "blockNumberInterval",
              type: "uint256",
            },
          ],
          name: "createRmNodeProposal",
          outputs: [
            {
              internalType: "uint256",
              name: "currentproposalId",
              type: "uint256",
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "string",
              name: "node",
              type: "string",
            },
            {
              internalType: "uint32",
              name: "weight",
              type: "uint32",
            },
            {
              internalType: "bool",
              name: "addFlag",
              type: "bool",
            },
            {
              internalType: "uint256",
              name: "blockNumberInterval",
              type: "uint256",
            },
          ],
          name: "createSetConsensusWeightProposal",
          outputs: [
            {
              internalType: "uint256",
              name: "currentproposalId",
              type: "uint256",
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint8",
              name: "deployAuthType",
              type: "uint8",
            },
            {
              internalType: "uint256",
              name: "blockNumberInterval",
              type: "uint256",
            },
          ],
          name: "createSetDeployAuthTypeProposal",
          outputs: [
            {
              internalType: "uint256",
              name: "currentproposalId",
              type: "uint256",
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint8",
              name: "participatesRate",
              type: "uint8",
            },
            {
              internalType: "uint8",
              name: "winRate",
              type: "uint8",
            },
            {
              internalType: "uint256",
              name: "blockNumberInterval",
              type: "uint256",
            },
          ],
          name: "createSetRateProposal",
          outputs: [
            {
              internalType: "uint256",
              name: "currentproposalId",
              type: "uint256",
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "string",
              name: "key",
              type: "string",
            },
            {
              internalType: "string",
              name: "value",
              type: "string",
            },
            {
              internalType: "uint256",
              name: "blockNumberInterval",
              type: "uint256",
            },
          ],
          name: "createSetSysConfigProposal",
          outputs: [
            {
              internalType: "uint256",
              name: "currentproposalId",
              type: "uint256",
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "account",
              type: "address",
            },
            {
              internalType: "uint32",
              name: "weight",
              type: "uint32",
            },
            {
              internalType: "uint256",
              name: "blockNumberInterval",
              type: "uint256",
            },
          ],
          name: "createUpdateGovernorProposal",
          outputs: [
            {
              internalType: "uint256",
              name: "currentproposalId",
              type: "uint256",
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "newAddr",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "blockNumberInterval",
              type: "uint256",
            },
          ],
          name: "createUpgradeVoteComputerProposal",
          outputs: [
            {
              internalType: "uint256",
              name: "currentproposalId",
              type: "uint256",
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "proposalId",
              type: "uint256",
            },
          ],
          name: "getProposalType",
          outputs: [
            {
              internalType: "uint8",
              name: "",
              type: "uint8",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "account",
              type: "address",
            },
          ],
          name: "isGovernor",
          outputs: [
            {
              internalType: "bool",
              name: "",
              type: "bool",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "proposalId",
              type: "uint256",
            },
          ],
          name: "revokeProposal",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "proposalId",
              type: "uint256",
            },
            {
              internalType: "bool",
              name: "agree",
              type: "bool",
            },
          ],
          name: "voteProposal",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
    },
  },
} as const;

export default externalContracts satisfies GenericContractsDeclaration;
