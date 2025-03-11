// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import { GovernorVotesQuorumFractionUpgradeable } from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesQuorumFractionUpgradeable.sol";
import { GovernorSettingsUpgradeable } from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorSettingsUpgradeable.sol";
import { GovernorUpgradeable } from "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./VoteSuccessLogic.sol";

abstract contract DAOSettings is Initializable, GovernorSettingsUpgradeable, GovernorVotesQuorumFractionUpgradeable {
    IVoteSuccessLogic private _voteSuccessLogic;
    uint256 private _voteSuccessThreshold;
    uint256 private _approveThreshold = 0;

    function __DAOSettings_init(
        uint256 quorumNumeratorValue,
        uint48 initialVotingDelay,
        uint32 initialVotingPeriod,
        uint256 initialProposalThreshold
    ) internal onlyInitializing {
        __GovernorSettings_init(initialVotingDelay, initialVotingPeriod, initialProposalThreshold);
        __GovernorVotesQuorumFraction_init(quorumNumeratorValue);
        _voteSuccessLogic = new VoteSuccessLogic();
        _voteSuccessThreshold = 50;
    }

    function proposalThreshold()
        public
        view
        virtual
        override(GovernorSettingsUpgradeable, GovernorUpgradeable)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function approveThreshold() public view virtual returns (uint256) {
        return _approveThreshold;
    }

    function voteSuccessThreshold() public view returns (uint256) {
        return _voteSuccessThreshold;
    }

    function setVoteSuccessThreshold(uint256 threshold) public onlyGovernance {
        require(threshold > 0 && threshold <= 100, "Invalid threshold");
        _voteSuccessThreshold = threshold;
    }

    function setApproveThreshold(uint256 threshold) public onlyGovernance {
        _approveThreshold = threshold;
    }

    function updateVoteSuccessLogic(IVoteSuccessLogic newVoteSuccessLogic) public onlyGovernance {
        require(
            newVoteSuccessLogic.supportsInterface(type(IVoteSuccessLogic).interfaceId),
            "Invalid IVoteSuccessLogic implementation"
        );
        _voteSuccessLogic = newVoteSuccessLogic;
    }

    function isVoteSuccessful(uint256 forVotes, uint256 againstVotes, uint256 abstainVotes) public view returns (bool) {
        return _voteSuccessLogic.isVoteSuccessful(forVotes, againstVotes, abstainVotes, _voteSuccessThreshold);
    }
}
