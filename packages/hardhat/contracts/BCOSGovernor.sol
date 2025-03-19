// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.26;

import { GovernorUpgradeable } from "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import { GovernorVotesUpgradeable } from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesUpgradeable.sol";
import { GovernorTimelockControlUpgradeable } from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorTimelockControlUpgradeable.sol";
import { GovernorStorageUpgradeable } from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorStorageUpgradeable.sol";
import { TimelockControllerUpgradeable } from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import { VotesUpgradeable } from "@openzeppelin/contracts-upgradeable/governance/utils/VotesUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./DAOSettings.sol";
using EnumerableSet for EnumerableSet.AddressSet;

struct ProposalVoteCore {
    uint256 forVotes;
    uint256 againstVotes;
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
    GovernorVotesUpgradeable,
    GovernorTimelockControlUpgradeable,
    GovernorStorageUpgradeable,
    DAOSettings,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    struct ProposalInfo {
        uint256 proposalId;
        address proposer;
        ProposalState proposalState;
        ProposalDetails proposalDetail;
        ProposalVoteCore proposalVote;
        uint256 startBlock;
        uint256 endBlock;
        uint256 eta;
        string proposalTitle;
        string proposalDesc;
    }
    enum VoteType {
        Against,
        For,
        Abstain
    }
    bytes32 public constant MAINTAINER_ROLE = keccak256("MAINTAINER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    function initialize(VotesUpgradeable _token, TimelockControllerUpgradeable _timelock) public initializer {
        __Governor_init("BCOSGovernor");
        __GovernorVotes_init(_token);
        __DAOSettings_init(30, 1, 10, 1000);
        address[] memory self = new address[](1);
        self[0] = address(this);
        _timelock.initialize(30, self, self, _msgSender());
        // FIXME)): add token initialize() here
        __GovernorTimelockControl_init(_timelock);
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
    mapping(uint256 proposalId => string) private _proposalDesc;
    mapping(uint256 proposalId => string) private _proposalTitle;
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

    function executor() public view returns (address) {
        return _executor();
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(GovernorUpgradeable, AccessControlUpgradeable) returns (bool) {
        return
            interfaceId == type(AccessControlUpgradeable).interfaceId ||
            interfaceId == type(GovernorUpgradeable).interfaceId ||
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

    function getProposalAllInfo(uint256 proposalId) public view returns (ProposalInfo memory info) {
        uint256 proposalHash = _proposalHashes[proposalId];
        (
            info.proposalDetail.targets,
            info.proposalDetail.values,
            info.proposalDetail.calldatas,
            info.proposalDetail.descriptionHash
        ) = proposalDetails(proposalHash);
        info.proposalState = state(proposalHash);
        (info.proposalVote.forVotes, info.proposalVote.againstVotes, info.proposalVote.abstainVotes) = proposalVotes(
            proposalId
        );
        info.startBlock = proposalSnapshot(proposalHash);
        info.endBlock = proposalDeadline(proposalHash);
        info.eta = proposalEta(proposalHash);
        info.proposer = proposalProposer(proposalHash);
        info.proposalDesc = _proposalDesc[proposalId];
    }

    function getProposalInfoPage(
        uint256 offset,
        uint256 pageSize
    ) public view returns (ProposalInfo[] memory infoList) {
        uint256 latestIndex = _latestProposalId;
        if (offset >= latestIndex) {
            return infoList;
        }
        uint256 end = offset + pageSize;
        if (end > latestIndex) {
            end = latestIndex;
        }
        infoList = new ProposalInfo[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            infoList[i - offset] = getProposalAllInfo(i);
        }
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
        return (proposalVote.forVotes, proposalVote.againstVotes, proposalVote.abstainVotes);
    }

    function proposalVoters(uint256 proposalId) public view returns (address[] memory) {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        return proposalVote.voters.values();
    }

    // TODO)): 返回更多字段
    function proposalVoterWeight(uint256 proposalId, address voter) public view returns (uint256) {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        return proposalVote.hasVoted[voter];
    }

    function proposalVoterBlock(uint256 proposalId, address voter) public view returns (uint256) {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        return proposalVote.voteBlock[voter];
    }

    function proposalThreshold() public view override(DAOSettings, GovernorUpgradeable) returns (uint256) {
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
    ) internal virtual override returns (uint256) {
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

        return weight;
    }

    function vote(uint256 proposalId, uint8 support, string calldata reason) public returns (uint256) {
        uint256 proposalHash = _proposalHashes[proposalId];
        return super.castVoteWithReason(proposalHash, support, reason);
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
        if (approvalFlow.approvers.length >= approveThreshold()) {
            approvalFlow.approved = true;
        }
    }

    function stateById(uint256 proposalId) public view virtual returns (ProposalState) {
        uint256 proposalHash = _proposalHashes[proposalId];
        return state(proposalHash);
    }

    function state(
        uint256 proposalHash
    ) public view virtual override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (ProposalState) {
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

    function _executor()
        internal
        view
        override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (address)
    {
        return super._executor();
    }

    function propose(
        string memory title,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public returns (uint256) {
        uint proposalHash = super.propose(targets, values, calldatas, description);
        _proposalDesc[_latestProposalId] = description;
        _proposalTitle[_latestProposalId] = title;
        return proposalHash;
    }

    function _propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        address proposer
    ) internal override(GovernorUpgradeable, GovernorStorageUpgradeable) returns (uint256) {
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
    ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (uint48) {
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
    ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) {
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
    ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function grantMaintainer(address account) public onlyGovernance {
        _grantRole(MAINTAINER_ROLE, account);
    }

    function grantRole(bytes32 role, address account) public override onlyGovernance {
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) public override onlyGovernance {
        _revokeRole(role, account);
    }

    function renounceRole(bytes32 role, address account) public override onlyGovernance {}

    function proposalNeedsQueuing(
        uint256 /*proposalId*/
    ) public view virtual override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (bool) {
        return true;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyGovernance {}
}
