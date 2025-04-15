// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { ERC20PermitUpgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import { ERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import { ERC20VotesUpgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { NoncesUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/NoncesUpgradeable.sol";

import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "./TimeSetting.sol";
using EnumerableSet for EnumerableSet.AddressSet;

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
    bytes32 private constant DELEGATION_TYPEHASH =
        keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");

    function initialize(string memory name, string memory symbol, TimeSetting _timer) public initializer {
        __ERC20VotePower_init(name, symbol, _timer);
    }
    struct ERC20VotePowerStorage {
        TimeSetting _timer;
        EnumerableSet.AddressSet _delegates;
    }
    // keccak256(abi.encode(uint256(keccak256("bcos-dao.contracts.ERC20VotePowerStorage")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant ERC20_VOTE_POWER_STORAGE_POSITION =
        0x8748f413af8995b219d7537f98b1d17b74849147369f06e6db8cbd69f093d800;
    function _getERC20VotePowerStorage() private pure returns (ERC20VotePowerStorage storage $) {
        assembly {
            $.slot := ERC20_VOTE_POWER_STORAGE_POSITION
        }
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
        ERC20VotePowerStorage storage $ = _getERC20VotePowerStorage();
        $._timer = _timer;
    }

    function delegate(address delegatee) public virtual override {
        address account = _msgSender();
        ERC20VotePowerStorage storage $ = _getERC20VotePowerStorage();
        $._delegates.add(delegatee);
        _delegate(account, delegatee);
    }

    function delegateBySig(
        address delegatee,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual override {
        if (clock() > expiry) {
            revert VotesExpiredSignature(expiry);
        }
        address signer = ECDSA.recover(
            _hashTypedDataV4(keccak256(abi.encode(DELEGATION_TYPEHASH, delegatee, nonce, expiry))),
            v,
            r,
            s
        );
        _useCheckedNonce(signer, nonce);
        ERC20VotePowerStorage storage $ = _getERC20VotePowerStorage();
        $._delegates.add(delegatee);
        _delegate(signer, delegatee);
    }

    function getDelegatees() public view returns (address[] memory) {
        ERC20VotePowerStorage storage $ = _getERC20VotePowerStorage();
        return $._delegates.values();
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
        ERC20VotePowerStorage storage $ = _getERC20VotePowerStorage();
        return $._timer.clock();
    }

    function CLOCK_MODE() public view override returns (string memory) {
        ERC20VotePowerStorage storage $ = _getERC20VotePowerStorage();
        return $._timer.CLOCK_MODE();
    }

    function resetUint(uint256 _unit) public onlyOwner {
        ERC20VotePowerStorage storage $ = _getERC20VotePowerStorage();
        $._timer.resetUnit(_unit);
    }
}
