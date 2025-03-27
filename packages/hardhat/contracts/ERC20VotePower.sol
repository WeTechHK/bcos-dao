// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;
import { ERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import { ERC20VotesUpgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import { ERC20PermitUpgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import { PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import { NoncesUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/NoncesUpgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./TimeSetting.sol";

/**
 * @title ERC20VotePower
 * @dev Extension of ERC20Votes that adds vote power to the token.
 */

contract ERC20VotePower is
    Initializable,
    ERC20Upgradeable,
    ERC20VotesUpgradeable,
    ERC20PermitUpgradeable,
    PausableUpgradeable,
    OwnableUpgradeable
{
    TimeSetting private timer;

    function initialize(string memory name, string memory symbol, TimeSetting _timer) public initializer {
        __ERC20VotePower_init(name, symbol, _timer);
    }

    function __ERC20VotePower_init(
        string memory name,
        string memory symbol,
        TimeSetting _timer
    ) internal onlyInitializing {
        __ERC20Permit_init(name);
        __ERC20Votes_init();
        __ERC20_init(name, symbol);
        __Ownable_init(msg.sender);
        __Pausable_init();
        timer = _timer;
    }

    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20VotesUpgradeable, ERC20Upgradeable) whenNotPaused {
        super._update(from, to, amount);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public onlyOwner {
        _burn(from, amount);
    }

    function nonces(
        address owner
    ) public view virtual override(ERC20PermitUpgradeable, NoncesUpgradeable) returns (uint256) {
        return super.nonces(owner);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function clock() public view override returns (uint48) {
        return timer.clock();
    }

    function CLOCK_MODE() public view override returns (string memory) {
        return timer.CLOCK_MODE();
    }

    function resetUint(uint256 _unit) public onlyOwner {
        timer.resetUnit(_unit);
    }
}
