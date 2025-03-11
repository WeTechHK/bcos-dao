// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.26;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { IERC165 } from "@openzeppelin/contracts/interfaces/IERC165.sol";

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

contract VoteSuccessLogic is IVoteSuccessLogic {
    function isVoteSuccessful(
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        uint256 threshold
    ) public pure override returns (bool) {
        uint256 totalVotes = againstVotes + forVotes + abstainVotes;
        // overflow check
        if (totalVotes < againstVotes) {
            return false;
        }
        // forVotes * 100 > totalVotes * threshold
        (bool result1, uint256 v1) = Math.tryMul(forVotes, 100);
        (bool result2, uint256 v2) = Math.tryMul(totalVotes, threshold);
        return result1 && result2 && (v1 > v2);
    }
}
