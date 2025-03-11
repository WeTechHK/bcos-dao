// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.26;

import { IGovernor, Governor } from "@openzeppelin/contracts/governance/Governor.sol";
import { GovernorVotes } from "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import { GovernorTimelockControl } from "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import { GovernorStorage } from "@openzeppelin/contracts/governance/extensions/GovernorStorage.sol";
import { TimelockController } from "@openzeppelin/contracts/governance/TimelockController.sol";
import { IVotes } from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import { IAccessControl, AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./DAOSettings.sol";
using EnumerableSet for EnumerableSet.AddressSet;

struct ProposalVoteCore {
    uint256 againstVotes;
    uint256 forVotes;
    uint256 abstainVotes;
}

struct ProposalVote {
    uint256 againstVotes;
    uint256 forVotes;
    uint256 abstainVotes;
    EnumerableSet.AddressSet voters;
    mapping(address voter => uint256) hasVoted;
    mapping(address voter => uint256) voteBlock;
}

contract BCOSGovernor is
    GovernorVotes,
    GovernorTimelockControl,
    GovernorStorage,
    DAOSettings,
    AccessControl,
    UUPSUpgradeable
{
    enum VoteType {
        Against,
        For,
        Abstain
    }
    bytes32 public constant MAINTAINER_ROLE = keccak256("MAINTAINER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    constructor(
        IVotes _token,
        TimelockController _timelock
    ) Governor("BCOSGovernor") GovernorVotes(_token) DAOSettings(30, 1, 1, 1000) GovernorTimelockControl(_timelock) {
        _grantRole(MAINTAINER_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, msg.sender);
    }

    struct ProposalApprovalFlow {
        address[] approvers;
        bool approved;
    }

    modifier onlyMaintainer() {
        require(hasRole(MAINTAINER_ROLE, _msgSender()), "BCOSGovernor: caller is not a maintainer");
        _;
    }

    mapping(uint256 proposalHash => uint256 proposalId) private _proposalIds;
    mapping(uint256 proposalId => uint256 proposalHash) private _proposalHashes;
    uint256 private _latestProposalId;
    // proposalId => vote
    mapping(uint256 proposalId => ProposalVote) private _proposalVotes;
    // proposalId => vote
    mapping(uint256 proposalId => ProposalApprovalFlow) private _proposalApprovalFlow;

    /**
     * @dev See {IGovernor-COUNTING_MODE}.
     */
    // solhint-disable-next-line func-name-mixedcase
    function COUNTING_MODE() public pure virtual override returns (string memory) {
        return "support=bravo&quorum=for,against,abstain";
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(Governor, AccessControl) returns (bool) {
        return
            interfaceId == type(IAccessControl).interfaceId ||
            interfaceId == type(IGovernor).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function getProposalHashById(uint256 proposalId) public view returns (uint256) {
        uint256 storedProposalHash = _proposalHashes[proposalId];
        if (storedProposalHash == 0) {
            revert GovernorNonexistentProposal(0);
        }
        return storedProposalHash;
    }

    function getProposalApprovalFlow(uint256 proposalId) public view returns (ProposalApprovalFlow memory) {
        return _proposalApprovalFlow[proposalId];
    }

    function getProposalAllInfo(
        uint256 proposalId
    )
        public
        view
        returns (
            ProposalDetails memory proposalDetail,
            ProposalState proposalState,
            ProposalVoteCore memory proposalVote,
            address proposer,
            uint256 startBlock,
            uint256 endBlock,
            uint256 eta
        )
    {
        uint256 proposalHash = _proposalHashes[proposalId];
        (
            proposalDetail.targets,
            proposalDetail.values,
            proposalDetail.calldatas,
            proposalDetail.descriptionHash
        ) = proposalDetails(proposalHash);
        proposalState = state(proposalHash);
        (proposalVote.forVotes, proposalVote.againstVotes, proposalVote.abstainVotes) = proposalVotes(proposalHash);
        startBlock = proposalSnapshot(proposalHash);
        endBlock = proposalDeadline(proposalHash);
        eta = proposalEta(proposalHash);
        proposer = proposalProposer(proposalHash);
    }

    function getProposalId(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public view returns (uint256) {
        uint256 proposalHash = hashProposal(targets, values, calldatas, descriptionHash);
        uint256 storedProposalId = _proposalIds[proposalHash];
        if (storedProposalId == 0) {
            revert GovernorNonexistentProposal(0);
        }
        return storedProposalId;
    }

    /**
     * @dev Returns the latest proposal id. A return value of 0 means no proposals have been created yet.
     */
    function latestProposalId() public view virtual returns (uint256) {
        return _latestProposalId;
    }

    /**
     * @dev See {IGovernor-hasVoted}.
     */
    function hasVoted(uint256 proposalId, address account) public view virtual override returns (bool) {
        return _proposalVotes[proposalId].hasVoted[account] > 0;
    }

    /**
     * @dev Accessor to the internal vote counts.
     */
    function proposalVotes(
        uint256 proposalId
    ) public view virtual returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes) {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        return (proposalVote.againstVotes, proposalVote.forVotes, proposalVote.abstainVotes);
    }

    function proposalVoters(uint256 proposalId) public view returns (address[] memory) {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        return proposalVote.voters.values();
    }

    function proposalVoterWeight(uint256 proposalId, address voter) public view returns (uint256) {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        return proposalVote.hasVoted[voter];
    }

    function proposalVoterBlock(uint256 proposalId, address voter) public view returns (uint256) {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        return proposalVote.voteBlock[voter];
    }

    function proposalThreshold() public view override(DAOSettings, Governor) returns (uint256) {
        return super.proposalThreshold();
    }

    /**
     * @dev See {Governor-_quorumReached}.
     */
    function _quorumReached(uint256 proposalHash) internal view virtual override returns (bool) {
        uint256 proposalId = _proposalIds[proposalHash];
        ProposalVote storage proposalVote = _proposalVotes[proposalId];

        return
            quorum(proposalSnapshot(proposalHash)) <=
            (proposalVote.forVotes + proposalVote.againstVotes + proposalVote.abstainVotes);
    }

    /**
     * @dev See {Governor-_voteSucceeded}. In this module, the forVotes must be strictly over the againstVotes.
     */
    function _voteSucceeded(uint256 proposalHash) internal view virtual override returns (bool) {
        uint256 proposalId = _proposalIds[proposalHash];
        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        return isVoteSuccessful(proposalVote.forVotes, proposalVote.againstVotes, proposalVote.abstainVotes);
    }

    /**
     * @dev See {Governor-_countVote}. In this module, the support follows the `VoteType` enum (from Governor Bravo).
     */
    function _countVote(
        uint256 proposalHash,
        address account,
        uint8 support,
        uint256 weight,
        bytes memory // params
    ) internal virtual override {
        uint256 proposalId = _proposalIds[proposalHash];
        ProposalVote storage proposalVote = _proposalVotes[proposalId];

        if (proposalVote.hasVoted[account] > 0) {
            revert GovernorAlreadyCastVote(account);
        }
        proposalVote.hasVoted[account] = weight;
        proposalVote.voters.add(account);
        proposalVote.voteBlock[account] = block.number;

        if (support == uint8(VoteType.Against)) {
            proposalVote.againstVotes += weight;
        } else if (support == uint8(VoteType.For)) {
            proposalVote.forVotes += weight;
        } else if (support == uint8(VoteType.Abstain)) {
            proposalVote.abstainVotes += weight;
        } else {
            revert GovernorInvalidVoteType();
        }
    }

    function approveProposal(uint256 proposalId) public onlyMaintainer {
        uint256 proposalHash = _proposalHashes[proposalId];
        ProposalState proposalState = state(proposalHash);
        if (proposalState != ProposalState.Pending) {
            revert GovernorUnexpectedProposalState(
                proposalId,
                proposalState,
                _encodeStateBitmap(ProposalState.Pending)
            );
        }
        ProposalApprovalFlow storage approvalFlow = _proposalApprovalFlow[proposalId];
        approvalFlow.approvers.push(_msgSender());
        if (approvalFlow.approvers.length >= proposalApproveThreshold()) {
            approvalFlow.approved = true;
        }
    }

    function stateById(uint256 proposalId) public view virtual returns (ProposalState) {
        uint256 proposalHash = _proposalHashes[proposalId];
        return state(proposalHash);
    }

    function state(
        uint256 proposalHash
    ) public view virtual override(Governor, GovernorTimelockControl) returns (ProposalState) {
        uint256 proposalId = _proposalIds[proposalHash];
        ProposalState proposalState = super.state(proposalHash);
        if (proposalState == ProposalState.Active) {
            ProposalApprovalFlow storage approvalFlow = _proposalApprovalFlow[proposalId];
            if (!approvalFlow.approved) {
                return ProposalState.Pending;
            }
        }
        return proposalState;
    }

    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }

    function _propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        address proposer
    ) internal override(Governor, GovernorStorage) returns (uint256) {
        uint256 proposalHash = hashProposal(targets, values, calldatas, keccak256(bytes(description)));
        uint256 storedProposalId = _proposalIds[proposalHash];
        if (storedProposalId == 0) {
            _latestProposalId++;
            _proposalIds[proposalHash] = _latestProposalId;
            _proposalHashes[_latestProposalId] = proposalHash;
        }
        return super._propose(targets, values, calldatas, description, proposer);
    }

    function queueById(uint256 proposalId) public {
        uint256 proposalHash = _proposalHashes[proposalId];
        super.queue(proposalHash);
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint48) {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function executeById(uint256 proposalId) public payable onlyMaintainer {
        uint256 proposalHash = _proposalHashes[proposalId];
        super.execute(proposalHash);
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function emergencyShutdownProposal(uint256 proposalId) public onlyMaintainer {
        uint256 proposalHash = _proposalHashes[proposalId];
        ProposalState proposalState = state(proposalHash);
        if (proposalState != ProposalState.Active) {
            revert GovernorUnexpectedProposalState(
                proposalHash,
                proposalState,
                _encodeStateBitmap(ProposalState.Active)
            );
        }
        (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas,
            bytes32 descriptionHash
        ) = proposalDetails(proposalHash);
        _cancel(targets, values, calldatas, descriptionHash);
    }

    function cancelById(uint256 proposalId) public onlyMaintainer {
        uint256 proposalHash = _proposalHashes[proposalId];
        super.cancel(proposalHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function grantMaintainer(address account) public onlyGovernance {
        grantRole(MAINTAINER_ROLE, account);
    }

    function grantRole(bytes32 role, address account) public override onlyGovernance {
        super.grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) public override onlyGovernance {
        super.revokeRole(role, account);
    }

    // FIXME)): remove this
    function renounceRole(bytes32 role, address account) public override onlyGovernance {
        super.renounceRole(role, account);
    }

    // 确保_governanceCall没有用，理解_governanceCall
    function proposalNeedsQueuing(
        uint256 /*proposalId*/
    ) public view virtual override(Governor, GovernorTimelockControl) returns (bool) {
        return true;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyGovernance {}
}
