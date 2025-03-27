// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { IERC6372 } from "@openzeppelin/contracts/interfaces/IERC6372.sol";
import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

contract TimeSetting is OwnableUpgradeable, IERC6372 {
    uint256 public unit = 1;

    function initialize(uint256 _unit) public initializer {
        __Ownable_init(msg.sender);
        unit = _unit;
    }

    // This function should always return in 'second' unit
    function clock() public view override returns (uint48) {
        (, uint256 timestamp) = Math.tryDiv(block.timestamp, unit);
        return SafeCast.toUint48(timestamp);
    }

    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=timestamp";
    }

    function resetUnit(uint256 _unit) public onlyOwner {
        require(_unit > 0, "unit should be greater than 0");
        unit = _unit;
    }
}
