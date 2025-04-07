import { expect } from "chai";
import { ethers } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { ProposalState } from "./helpers/enums";
import {
  BCOSGovernor__factory,
  ERC20VotePower__factory,
  TimelockControllerUpgradeable__factory,
} from "../typechain-types";

describe("Timeout Test", function () {
  async function deployGovernor() {
    const [owner, newMaintainer, ...restVoters] = await ethers.getSigners();
    const BCOSGovernor = await ethers.getContractFactory("BCOSGovernor");
    const ERC20VotePower = await ethers.getContractFactory("ERC20VotePower");
    const TimelockController = await ethers.getContractFactory("CustomTimelockControllerUpgradeable");
    const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
    const evp = await ERC20VotePower.deploy(/*"ERC20Vote", "EVP"*/);
    const tc = await TimelockController.deploy(/*100n, [owner], [owner], owner*/);
    const governor = await BCOSGovernor.deploy(/*evp, tc*/);
    // empty data
    const erc20VotePower = await ERC1967Proxy.deploy(
      evp,
      ERC20VotePower.interface.encodeFunctionData("initialize", ["ERC20Vote", "EVP"]),
    );
    const tcProxy = await ERC1967Proxy.deploy(tc, "0x");
    const proxyGovernor = await ERC1967Proxy.deploy(
      governor,
      BCOSGovernor.interface.encodeFunctionData("initialize", [
        await erc20VotePower.getAddress(),
        await tcProxy.getAddress(),
      ]),
    );

    const proxyGovernorAddress = await proxyGovernor.getAddress();
    console.log("BCOSGovernor deployed to:", proxyGovernorAddress);
    console.log("ERC20VotePower deployed to:", await erc20VotePower.getAddress());
    console.log("TimelockController deployed to:", await tcProxy.getAddress());

    const governorTemplate = BCOSGovernor__factory.connect(proxyGovernorAddress, owner);
    const erc20VotePowerTemplate = ERC20VotePower__factory.connect(await erc20VotePower.getAddress(), owner);
    const tcTemplate = TimelockControllerUpgradeable__factory.connect(await tcProxy.getAddress(), owner);
    // await tcTemplate.initialize(30n, [proxyGovernorAddress], [proxyGovernorAddress], owner.address);
    return {
      owner,
      newMaintainer,
      evp,
      voters: restVoters.slice(0, 10),
      tc,
      governor,
      erc20VotePower,
      tcProxy,
      proxyGovernor,
      governorTemplate,
      erc20VotePowerTemplate,
      tcTemplate,
    };
  }
  const fixture = async function () {
    return await deployGovernor();
  };
  describe("constructor", function () {
    beforeEach(async function () {
      Object.assign(this, await fixture());
    });
    it("check the proxy initialize value", async function () {
      console.log(this.voters.length, "this.voters.length");
      expect(await this.proxyGovernor.implementation()).to.equal(this.governor);
      expect(await this.voters.length).to.equal(10);
      expect(await this.governorTemplate.token()).to.equal(this.erc20VotePower);
      expect(await this.governorTemplate.timelock()).to.equal(this.tcProxy);
      expect(await this.erc20VotePower.implementation()).to.equal(this.evp);
      expect(await this.tcProxy.implementation()).to.equal(this.tc);
      expect(await this.governorTemplate.executor()).to.equal(this.tcProxy);
      expect(await this.erc20VotePowerTemplate.owner()).to.equal(this.owner.address);
      expect(await this.tcTemplate.hasRole(await this.tcTemplate.DEFAULT_ADMIN_ROLE(), this.owner.address)).to.equal(
        true,
      );
    });

    it("check config", async function () {
      expect(await this.governorTemplate.proposalCount()).to.equal(0n);
      expect(await this.governorTemplate.latestProposalId()).to.equal(0n);
      expect(await this.governorTemplate.approveThreshold()).to.equal(0n);
      expect(await this.governorTemplate.proposalThreshold()).to.equal(1000n);
      expect(await this.governorTemplate.votingDelay()).to.equal(1n);
      expect(await this.governorTemplate.votingPeriod()).to.equal(10n);
      expect(await this.governorTemplate.quorumDenominator()).to.equal(100n);
      expect(await this.governorTemplate.quorumNumerator()).to.equal(30n);
      expect(await this.governorTemplate.voteSuccessThreshold()).to.equal(50n);
      expect(await this.governorTemplate.isVoteSuccessful(51n, 30n, 19n)).to.equal(true);
      expect(await this.governorTemplate.isVoteSuccessful(50n, 30n, 20n)).to.equal(false);
    });
  });
  describe("propose flow", function () {
    beforeEach(async function () {
      Object.assign(this, await fixture());
      const { erc20VotePowerTemplate, governorTemplate, owner, newMaintainer, voters } = this;

      // 先给 owner 铸币和委托
      await erc20VotePowerTemplate.connect(owner).mint(owner.address, 2000n);
      await erc20VotePowerTemplate.connect(owner).delegate(owner.address);

      // 让 owner 给每个 voter 铸币
      for (const voter of voters) {
        await erc20VotePowerTemplate.connect(owner).mint(voter.address, 2000n); // owner 调用 mint
        await erc20VotePowerTemplate.connect(voter).delegate(voter.address);
      }

      const calldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData(
        "grantMaintainer",
        [newMaintainer.address],
      );

      await governorTemplate
        .connect(owner)
        .propose([await governorTemplate.getAddress()], [0n], [calldata], "# setMaintainer");
      const proposalId = await governorTemplate.latestProposalId();
      const proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposer).to.equal(owner.address);
      expect(proposal.proposalDetail.targets[0]).to.equal(await governorTemplate.getAddress());
      expect(proposal.proposalDetail.calldatas[0]).to.equal(calldata);
      const number = await time.latestBlock();
      expect(proposal.startTime).to.equal(number + 1);
      expect(proposal.endTime).to.eq(number + 1 + 10);
      expect(proposal.startTime).to.lt(proposal.endTime);
      expect(proposal.proposalState).to.equal(ProposalState.Pending);
      expect(proposal.proposalVote.forVotes).to.equal(0);
      expect(proposal.proposalVote.againstVotes).to.equal(0);
      expect(proposal.proposalVote.abstainVotes).to.equal(0);

      Object.assign(this, { calldata, proposalId });
    });

    it("should expire after approval timeout", async function () {
      const { governorTemplate, proposalId } = this;

      // 获取提案哈希
      const proposalHash = await governorTemplate.hashProposal(
        [await governorTemplate.getAddress()],
        [0n],
        [this.calldata],
        ethers.keccak256(ethers.toUtf8Bytes("# setMaintainer")),
      );

      // 检查初始状态
      let proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalState).to.equal(ProposalState.Pending);

      // 等待超过审批时间
      await mine(15); // 增加等待区块数，确保超过审批时间

      // 检查提案是否过期
      proposal = await governorTemplate.getProposalAllInfo(proposalId);
      console.log("Current Block:", await time.latestBlock());
      console.log("Proposal Start Block:", proposal.startTime);
      console.log("Proposal End Block:", proposal.endTime);
      console.log("Proposal State:", proposal.proposalState);
      expect(proposal.proposalState).to.equal(ProposalState.Defeated);

      // 验证过期后不能审批
      await expect(governorTemplate.connect(this.owner).approveProposal(proposalId))
        .to.be.revertedWithCustomError(governorTemplate, "GovernorUnexpectedProposalState")
        .withArgs(
          proposalId,
          ProposalState.Defeated,
          "0x0000000000000000000000000000000000000000000000000000000000000001",
        );

      // 验证过期后不能取消
      await expect(governorTemplate.connect(this.owner).cancelById(proposalId))
        .to.be.revertedWithCustomError(governorTemplate, "GovernorUnexpectedProposalState")
        .withArgs(
          proposalHash,
          ProposalState.Defeated,
          "0x0000000000000000000000000000000000000000000000000000000000000001",
        );
    });

    it("should expire after voting timeout", async function () {
      const { governorTemplate, owner, proposalId } = this;
      // 获取提案哈希
      const proposalHash = await governorTemplate.hashProposal(
        [await governorTemplate.getAddress()],
        [0n],
        [this.calldata],
        ethers.keccak256(ethers.toUtf8Bytes("# setMaintainer")),
      );
      // 先审批提案
      await mine(2);
      await governorTemplate.connect(owner).approveProposal(proposalId);

      let proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalState).to.equal(ProposalState.Active);

      // 等待超过投票时间
      await mine(15); // 投票期是10个区块

      // 检查提案是否过期
      proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalState).to.equal(ProposalState.Defeated);

      // 验证过期后不能投票
      await expect(governorTemplate.connect(owner).vote(proposalId, 1n, ""))
        .to.be.revertedWithCustomError(governorTemplate, "GovernorUnexpectedProposalState")
        .withArgs(
          proposalHash,
          ProposalState.Defeated,
          "0x0000000000000000000000000000000000000000000000000000000000000002", // Active state bitmap
        );
    });
  });
});
