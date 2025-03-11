// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import { GovernorVotesQuorumFraction } from "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import { GovernorSettings } from "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import { IGovernor, Governor } from "@openzeppelin/contracts/governance/Governor.sol";
import "./VoteSuccessLogic.sol";

abstract contract DAOSettings is GovernorSettings, GovernorVotesQuorumFraction {
    IVoteSuccessLogic private voteSuccessLogic;
    uint256 private voteSuccessThreshold = 50;
    uint256 private approveThreshold = 0;

    constructor(
        uint256 quorumNumeratorValue,
        uint48 initialVotingDelay,
        uint32 initialVotingPeriod,
        uint256 initialProposalThreshold
    )
        GovernorSettings(initialVotingDelay, initialVotingPeriod, initialProposalThreshold)
        GovernorVotesQuorumFraction(quorumNumeratorValue)
    {
        voteSuccessLogic = new VoteSuccessLogic();
    }

    function proposalThreshold() public view virtual override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }

    function proposalApproveThreshold() public view virtual returns (uint256) {
        return approveThreshold;
    }

    function setVoteSuccessThreshold(uint256 threshold) public onlyGovernance {
        require(threshold > 0 && threshold <= 100, "Invalid threshold");
        voteSuccessThreshold = threshold;
    }

    function setApproveThreshold(uint256 threshold) public onlyGovernance {
        approveThreshold = threshold;
    }

    function updateVoteSuccessLogic(IVoteSuccessLogic newVoteSuccessLogic) public onlyGovernance {
        require(
            newVoteSuccessLogic.supportsInterface(type(IVoteSuccessLogic).interfaceId),
            "Invalid IVoteSuccessLogic implementation"
        );
        voteSuccessLogic = newVoteSuccessLogic;
    }

    function isVoteSuccessful(uint256 forVotes, uint256 againstVotes, uint256 abstainVotes) public view returns (bool) {
        return voteSuccessLogic.isVoteSuccessful(forVotes, againstVotes, abstainVotes, voteSuccessThreshold);
    }
}
