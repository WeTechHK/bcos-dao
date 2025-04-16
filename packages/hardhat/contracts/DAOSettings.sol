// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import { GovernorVotesQuorumFractionUpgradeable } from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesQuorumFractionUpgradeable.sol";
import { GovernorSettingsUpgradeable } from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorSettingsUpgradeable.sol";
import { GovernorUpgradeable } from "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./VoteSuccessLogic.sol";

abstract contract DAOSettings is Initializable, GovernorSettingsUpgradeable, GovernorVotesQuorumFractionUpgradeable {
    struct DAOSettingsStorage {
        IVoteSuccessLogic _voteSuccessLogic;
        uint256 _voteSuccessThreshold;
        uint256 _approveThreshold;
    }

    // keccak256(abi.encode(uint256(keccak256("bcos-dao.contracts.DAOSettingsStorage")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant DAO_SETTINGS_STORAGE_POSITION =
        0x3ff949ad3020a4405d4cf7e74b1fe5dffa976db27d2dfb620c9716a7eb7f4400;
    function _getDAOSettingsStorage() private pure returns (DAOSettingsStorage storage $) {
        assembly {
            $.slot := DAO_SETTINGS_STORAGE_POSITION
        }
    }

    function __DAOSettings_init(
        uint256 quorumNumeratorValue,
        uint48 initialVotingDelay,
        uint32 initialVotingPeriod,
        uint256 initialProposalThreshold
    ) internal onlyInitializing {
        __GovernorSettings_init(initialVotingDelay, initialVotingPeriod, initialProposalThreshold);
        __GovernorVotesQuorumFraction_init(quorumNumeratorValue);
        DAOSettingsStorage storage $ = _getDAOSettingsStorage();
        $._voteSuccessLogic = new VoteSuccessLogic();
        $._voteSuccessThreshold = 50;
        $._approveThreshold = 0;
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
        DAOSettingsStorage storage $ = _getDAOSettingsStorage();
        return $._approveThreshold;
    }

    function voteSuccessThreshold() public view returns (uint256) {
        DAOSettingsStorage storage $ = _getDAOSettingsStorage();
        return $._voteSuccessThreshold;
    }

    function setVoteSuccessThreshold(uint256 threshold) public onlyGovernance {
        require(threshold > 0 && threshold <= 100, "Invalid threshold");
        DAOSettingsStorage storage $ = _getDAOSettingsStorage();
        $._voteSuccessThreshold = threshold;
    }

    function setApproveThreshold(uint256 threshold) public onlyGovernance {
        DAOSettingsStorage storage $ = _getDAOSettingsStorage();
        $._approveThreshold = threshold;
    }

    function updateVoteSuccessLogic(IVoteSuccessLogic newVoteSuccessLogic) public onlyGovernance {
        require(
            newVoteSuccessLogic.supportsInterface(type(IVoteSuccessLogic).interfaceId),
            "Invalid IVoteSuccessLogic implementation"
        );
        DAOSettingsStorage storage $ = _getDAOSettingsStorage();
        $._voteSuccessLogic = newVoteSuccessLogic;
    }

    function isVoteSuccessful(uint256 forVotes, uint256 againstVotes, uint256 abstainVotes) public view returns (bool) {
        DAOSettingsStorage storage $ = _getDAOSettingsStorage();
        return $._voteSuccessLogic.isVoteSuccessful(forVotes, againstVotes, abstainVotes, $._voteSuccessThreshold);
    }
}
