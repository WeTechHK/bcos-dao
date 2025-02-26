// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.26;

import { IERC165 } from "@openzeppelin/contracts/interfaces/IERC165.sol";

struct ProposalVote {
    uint256 againstVotes;
    uint256 forVotes;
    uint256 abstainVotes;
    mapping(address voter => bool) hasVoted;
}

abstract contract IVoteSuccessLogic is IERC165 {
    function isVoteSuccessful(
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        uint256 threshold
    ) public pure virtual returns (bool);

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IVoteSuccessLogic).interfaceId;
    }
}
