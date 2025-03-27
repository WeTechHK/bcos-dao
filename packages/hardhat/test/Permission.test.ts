import { expect } from "chai";
import { ethers } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { ProposalState } from "./helpers/enums";
import {
  BCOSGovernor__factory,
  ERC20VotePower__factory,
  TimelockControllerUpgradeable__factory,
} from "../typechain-types";

describe("Permission Test", function () {
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
      expect(proposal.startBlock).to.equal(number + 1);
      expect(proposal.endBlock).to.eq(number + 1 + 10);
      expect(proposal.startBlock).to.lt(proposal.endBlock);
      expect(proposal.proposalState).to.equal(ProposalState.Pending);
      expect(proposal.proposalVote.forVotes).to.equal(0);
      expect(proposal.proposalVote.againstVotes).to.equal(0);
      expect(proposal.proposalVote.abstainVotes).to.equal(0);

      Object.assign(this, { calldata, proposalId });
    });
    // 跨权限铸币
    it("should reject minting from non-owner", async function () {
      const [, nonOwner] = await ethers.getSigners();

      await expect(this.erc20VotePowerTemplate.connect(nonOwner).mint(nonOwner.address, 1000n))
        .to.be.revertedWithCustomError(this.erc20VotePowerTemplate, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
    });
    // 验证 Proposer 权限要求 1000代币
    it("should verify proposer requirements", async function () {
      const { governorTemplate, owner, voters, erc20VotePowerTemplate } = this;

      // 检查默认提案阈值
      expect(await governorTemplate.proposalThreshold()).to.equal(1000n);

      // 检查持有足够代币的账户可以提案
      const hasEnoughTokens = voters[0]; // 持有 2000 代币
      const proposalData = {
        targets: [await governorTemplate.getAddress()],
        values: [0n],
        calldatas: ["0x"],
        description: "Test Proposal",
      };

      // 应该可以成功提案
      await expect(
        governorTemplate
          .connect(hasEnoughTokens)
          .propose(proposalData.targets, proposalData.values, proposalData.calldatas, proposalData.description),
      ).to.not.be.reverted;

      // 检查持有不足代币的账户不能提案
      const notEnoughTokens = voters[1];
      await erc20VotePowerTemplate.connect(notEnoughTokens).transfer(owner.address, 1500n); // 转走部分代币，剩余不足阈值

      // 应该提案失败
      await expect(
        governorTemplate
          .connect(notEnoughTokens)
          .propose(proposalData.targets, proposalData.values, proposalData.calldatas, proposalData.description),
      ).to.be.revertedWithCustomError(governorTemplate, "GovernorInsufficientProposerVotes");
    });
    // 跨权限approve提案
    it("should reject approve from non-owner", async function () {
      const { governorTemplate, proposalId, voters } = this;
      const nonOwner = voters[0]; // 使用第一个voter作为非owner用户

      await mine(2); // 等待提案进入可审批状态

      // 非owner尝试审批提案应该失败
      await expect(governorTemplate.connect(nonOwner).approveProposal(proposalId)).to.be.revertedWith(
        "BCOSGovernor: caller is not a maintainer",
      );

      // 验证提案状态仍然是Pending
      const proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalState).to.equal(ProposalState.Pending);

      // 验证审批列表为空
      const [approvers, approved] = await governorTemplate.getProposalApprovalFlow(proposalId);
      expect(approvers.length).to.eq(0);
      expect(approved).to.eq(false);
    });

    // 跨权限取消提案
    it("should reject cancel from non-owner", async function () {
      const { governorTemplate, proposalId, voters } = this;
      const nonOwner = voters[0]; // 使用第一个voter作为非owner用户

      await mine(2); // 等待提案进入可审批状态

      // 非owner尝试取消提案应该失败
      await expect(governorTemplate.connect(nonOwner).cancelById(proposalId)).to.be.revertedWith(
        "BCOSGovernor: caller is not a maintainer",
      );

      // 验证提案状态仍然是Pending
      const proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalState).to.equal(ProposalState.Pending);

      // 验证审批列表为空
      const [approvers, approved] = await governorTemplate.getProposalApprovalFlow(proposalId);
      expect(approvers.length).to.eq(0);
      expect(approved).to.eq(false);
    });

    it("approve", async function () {
      const { governorTemplate, owner, proposalId } = this;
      let [approvers, approved] = await governorTemplate.getProposalApprovalFlow(proposalId);
      expect(approvers.length).to.eq(0);
      expect(approved).to.eq(false);
      await mine(2);
      expect(await governorTemplate.state(await governorTemplate.getProposalHashById(proposalId))).to.equal(0n);
      await governorTemplate.connect(owner).approveProposal(proposalId);
      expect(await governorTemplate.state(await governorTemplate.getProposalHashById(proposalId))).to.equal(1n);
      [approvers, approved] = await governorTemplate.getProposalApprovalFlow(proposalId);
      expect(approvers.length).to.eq(1);
      expect(approved).to.eq(true);
      const proposal = await governorTemplate.getProposalAllInfo(proposalId);
      console.log(proposal);
      expect(proposal.proposalState).to.equal(ProposalState.Active);
    });
  });
});
