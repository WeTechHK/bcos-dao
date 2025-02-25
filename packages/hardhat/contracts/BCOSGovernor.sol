// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.26;

import { IGovernor, Governor } from "@openzeppelin/contracts/governance/Governor.sol";
import { GovernorCountingSimple } from "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import { GovernorVotes } from "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import { GovernorVotesQuorumFraction } from "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import { GovernorTimelockControl } from "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import { GovernorStorage } from "@openzeppelin/contracts/governance/extensions/GovernorStorage.sol";
import { GovernorSettings } from "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import { TimelockController } from "@openzeppelin/contracts/governance/TimelockController.sol";
import { IVotes } from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import { IERC165 } from "@openzeppelin/contracts/interfaces/IERC165.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import { IAccessControl, AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

contract BCOSGovernor is
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl,
    GovernorStorage,
    GovernorSettings,
    UUPSUpgradeable,
    AccessControl
{
    constructor(
        IVotes _token,
        TimelockController _timelock
    )
        Governor("BCOSGovernor")
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4)
        GovernorTimelockControl(_timelock)
        GovernorSettings(4, 0, 0)
    {}

    enum VoteType {
        Against,
        For,
        Abstain
    }

    struct ProposalVote {
        uint256 againstVotes;
        uint256 forVotes;
        uint256 abstainVotes;
        mapping(address voter => bool) hasVoted;
    }

    mapping(uint256 proposalId => ProposalVote) private _proposalVotes;

    /**
     * @dev See {IGovernor-COUNTING_MODE}.
     */
    // solhint-disable-next-line func-name-mixedcase
    function COUNTING_MODE() public pure virtual override returns (string memory) {
        return "support=bravo&quorum=for,against,abstain";
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(AccessControl, Governor) returns (bool) {
        return
            interfaceId == type(IAccessControl).interfaceId ||
            interfaceId == type(IGovernor).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev See {IGovernor-hasVoted}.
     */
    function hasVoted(uint256 proposalId, address account) public view virtual override returns (bool) {
        return _proposalVotes[proposalId].hasVoted[account];
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

    function proposalThreshold() public view override(GovernorSettings, Governor) returns (uint256) {
        // TODO: add maintainer can change proposal threshold
        return super.proposalThreshold();
    }

    /**
     * @dev See {Governor-_quorumReached}.
     */
    function _quorumReached(uint256 proposalId) internal view virtual override returns (bool) {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];

        return
            quorum(proposalSnapshot(proposalId)) <=
            (proposalVote.forVotes + proposalVote.againstVotes + proposalVote.abstainVotes);
    }

    /**
     * @dev See {Governor-_voteSucceeded}. In this module, the forVotes must be strictly over the againstVotes.
     */
    function _voteSucceeded(uint256 proposalId) internal view virtual override returns (bool) {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        // TODO: add maintainer can change vote threshold
        return proposalVote.forVotes > proposalVote.againstVotes;
    }

    /**
     * @dev See {Governor-_countVote}. In this module, the support follows the `VoteType` enum (from Governor Bravo).
     */
    function _countVote(
        uint256 proposalId,
        address account,
        uint8 support,
        uint256 weight,
        bytes memory // params
    ) internal virtual override {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];

        if (proposalVote.hasVoted[account]) {
            revert GovernorAlreadyCastVote(account);
        }
        proposalVote.hasVoted[account] = true;

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

    // TODO: add maintainer approve proposal function
    function state(
        uint256 proposalId
    ) public view virtual override(Governor, GovernorTimelockControl) returns (ProposalState) {
        // TODO: add expired state
        return super.state(proposalId);
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
        return super._propose(targets, values, calldatas, description, proposer);
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

    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public payable override returns (uint256) {
        // TODO: add only maintainer can execute proposal
        return super.execute(targets, values, calldatas, descriptionHash);
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

    function cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public virtual override(Governor) returns (uint256) {
        // TODO: only maintainer and proposer can cancel pending state proposal, only maintainer can cancel active state proposal
        return super.cancel(targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function proposalNeedsQueuing(
        uint256 /*proposalId*/
    ) public view virtual override(Governor, GovernorTimelockControl) returns (bool) {
        return true;
    }

    function _authorizeUpgrade(address newImplementation) internal override {
        // TODO: only maintainer can upgrade
    }
}
