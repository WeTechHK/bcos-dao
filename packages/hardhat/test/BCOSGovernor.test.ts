import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("BCOSGovernor", function () {
  async function deployGovernor() {
    const [owner] = await ethers.getSigners();
    const BCOSGovernor = await ethers.getContractFactory("BCOSGovernor");
    const ERC20VotePower = await ethers.getContractFactory("ERC20VotePower");
    const TimelockController = await ethers.getContractFactory("TimelockController");
    const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
    const evp = await ERC20VotePower.deploy("ERC20Vote", "EVP");
    const tc = await TimelockController.deploy(100n, [owner], [owner], owner);
    const governor = await BCOSGovernor.deploy(evp, tc);
    // empty data
    const proxy = await ERC1967Proxy.deploy(governor, "0x");
    return { owner, evp, tc, governor, proxy };
  }

  describe("constructor", function () {
    it("should set the correct values", async function () {
      const { evp, tc, governor, proxy } = await deployGovernor();
      expect(await proxy.implementation()).to.equal(governor);
      expect(await governor.token()).to.equal(evp);
      expect(await governor.timelock()).to.equal(tc);
    });
  });
});
