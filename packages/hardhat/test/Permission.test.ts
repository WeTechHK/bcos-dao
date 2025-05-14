import { expect } from "chai";
import { deployments, ethers } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { ProposalState } from "./helpers/enums";
import { BCOSGovernor__factory, ERC20VotePower__factory } from "../typechain-types";
import { TimelockControllerUpgradeable__factory } from "../typechain-types/factories/contracts/TimelockControllerUpgradeable__factory";

describe("Permission Test", function () {
  async function deployGovernor() {
    const [owner, newMaintainer, ...restVoters] = await ethers.getSigners();
    await deployments.fixture(["BCOSGovernor", "ERC20VotePower", "CustomTimelockControllerUpgradeable", "TimeSetting"]);
    const e = await deployments.get("ERC20VotePower");
    const t = await deployments.get("CustomTimelockControllerUpgradeable");
    const g = await deployments.get("BCOSGovernor");
    const governorTemplate = BCOSGovernor__factory.connect(g.address, owner);
    const erc20VotePowerTemplate = ERC20VotePower__factory.connect(e.address, owner);
    const tcTemplate = TimelockControllerUpgradeable__factory.connect(t.address, owner);
    return {
      owner,
      newMaintainer,
      voters: restVoters.slice(0, 10),
      governorTemplate,
      erc20VotePowerTemplate,
      tcTemplate,
    };
  }

  const fixture = async function () {
    return await deployGovernor();
  };
  describe("propose flow", function () {
    beforeEach(async function () {
      Object.assign(this, await fixture());
      const { erc20VotePowerTemplate, governorTemplate, owner, newMaintainer, voters } = this;

      // 先给 owner 铸币和委托
      await erc20VotePowerTemplate.connect(owner).delegate(owner.address);

      const calldata1 = (await ethers.getContractFactory("ERC20VotePower")).interface.encodeFunctionData("transfer", [
        voters[0].address,
        2000n,
      ]);
      const calldata2 = (await ethers.getContractFactory("ERC20VotePower")).interface.encodeFunctionData("transfer", [
        voters[1].address,
        2000n,
      ]);
      const calldata3 = (await ethers.getContractFactory("ERC20VotePower")).interface.encodeFunctionData("transfer", [
        voters[2].address,
        2000n,
      ]);
      const calldata4 = (await ethers.getContractFactory("ERC20VotePower")).interface.encodeFunctionData("transfer", [
        voters[3].address,
        2000n,
      ]);
      const calldata5 = (await ethers.getContractFactory("ERC20VotePower")).interface.encodeFunctionData("transfer", [
        voters[4].address,
        2000n,
      ]);

      await erc20VotePowerTemplate.connect(owner).delegate(owner.address);
      await erc20VotePowerTemplate.connect(voters[0]).delegate(voters[0].address);
      await erc20VotePowerTemplate.connect(voters[1]).delegate(voters[1].address);
      await erc20VotePowerTemplate.connect(voters[2]).delegate(voters[2].address);
      await erc20VotePowerTemplate.connect(voters[3]).delegate(voters[3].address);
      await erc20VotePowerTemplate.connect(voters[4]).delegate(voters[4].address);
      const erc20Address = await erc20VotePowerTemplate.getAddress();
      await governorTemplate
        .connect(owner)
        .proposeWithTitle(
          "Transfer to Voters",
          [erc20Address, erc20Address, erc20Address, erc20Address, erc20Address],
          [0n, 0n, 0n, 0n, 0n],
          [calldata1, calldata2, calldata3, calldata4, calldata5],
          "# Transfer to Voters",
        );
      let proposalId = await governorTemplate.proposalCount();
      let proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposer).to.equal(owner.address);
      expect(proposal.proposalDetail.targets[0]).to.equal(erc20Address);
      expect(proposal.proposalDetail.calldatas[0]).to.equal(calldata1);
      // const now = await time.latest();
      // expect(proposal.startTime).to.equal(now);
      // expect(proposal.endTime).to.eq(now + 10);
      expect(proposal.startTime).to.lt(proposal.endTime);
      expect(proposal.proposalState).to.equal(ProposalState.Pending);
      expect(proposal.proposalVote.forVotes).to.equal(0);
      expect(proposal.proposalVote.againstVotes).to.equal(0);
      expect(proposal.proposalVote.abstainVotes).to.equal(0);

      // approve
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
      proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalState).to.equal(ProposalState.Active);

      await governorTemplate.connect(owner).vote(proposalId, 1n, "");

      proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalState).to.equal(ProposalState.Succeeded);

      await governorTemplate.connect(owner).queueById(proposalId);

      const now = await time.latest();
      await time.setNextBlockTimestamp(now + 24 * 60 * 60);

      await governorTemplate.connect(owner).executeById(proposalId);

      expect(await erc20VotePowerTemplate.balanceOf(voters[0].address)).to.equal(2000n);
      expect(await erc20VotePowerTemplate.balanceOf(voters[1].address)).to.equal(2000n);
      expect(await erc20VotePowerTemplate.balanceOf(voters[2].address)).to.equal(2000n);
      expect(await erc20VotePowerTemplate.balanceOf(voters[3].address)).to.equal(2000n);
      expect(await erc20VotePowerTemplate.balanceOf(voters[4].address)).to.equal(2000n);

      const calldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData(
        "grantMaintainer",
        [newMaintainer.address],
      );

      await governorTemplate
        .connect(owner)
        .propose([await governorTemplate.getAddress()], [0n], [calldata], "# setMaintainer");
      proposalId = await governorTemplate.proposalCount();
      proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposer).to.equal(owner.address);
      expect(proposal.proposalDetail.targets[0]).to.equal(await governorTemplate.getAddress());
      expect(proposal.proposalDetail.calldatas[0]).to.equal(calldata);
      expect(proposal.startTime).to.lt(proposal.endTime);
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
      expect(await governorTemplate.proposalThreshold()).to.equal(3000000000000000000000n);

      // 检查持有足够代币的账户可以提案
      const hasEnoughTokens = owner;
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
      expect(proposal.proposalState).to.equal(ProposalState.Active);
    });

    it("dao setting should use proposal", async function () {
      const { governorTemplate, owner } = this;

      await expect(governorTemplate.connect(owner).revokeMaintainer(owner.address)).to.be.revertedWithCustomError(
        this.governorTemplate,
        "GovernorOnlyExecutor",
      );
      await expect(governorTemplate.connect(owner).grantMaintainer(owner.address)).to.be.revertedWithCustomError(
        this.governorTemplate,
        "GovernorOnlyExecutor",
      );
      await expect(governorTemplate.connect(owner).setVoteSuccessThreshold(1000n)).to.be.revertedWithCustomError(
        this.governorTemplate,
        "GovernorOnlyExecutor",
      );
      await expect(governorTemplate.connect(owner).setApproveThreshold(1000n)).to.be.revertedWithCustomError(
        this.governorTemplate,
        "GovernorOnlyExecutor",
      );
      await expect(governorTemplate.connect(owner).setVotingPeriod(1000n)).to.be.revertedWithCustomError(
        this.governorTemplate,
        "GovernorOnlyExecutor",
      );
      await expect(
        governorTemplate.connect(owner).grantRole(await governorTemplate.MAINTAINER_ROLE(), owner.address),
      ).to.be.revertedWithCustomError(this.governorTemplate, "GovernorOnlyExecutor");
      await expect(
        governorTemplate.connect(owner).revokeRole(await governorTemplate.MAINTAINER_ROLE(), owner.address),
      ).to.be.revertedWithCustomError(this.governorTemplate, "GovernorOnlyExecutor");

      await expect(
        governorTemplate.connect(owner).renounceRole(await governorTemplate.MAINTAINER_ROLE(), owner.address),
      ).to.be.revertedWithCustomError(this.governorTemplate, "GovernorOnlyExecutor");

      await expect(governorTemplate.connect(owner).mintToken(owner.address, 100n)).to.be.revertedWithCustomError(
        this.governorTemplate,
        "GovernorOnlyExecutor",
      );
      await expect(governorTemplate.connect(owner).burnToken(owner.address, 100n)).to.be.revertedWithCustomError(
        this.governorTemplate,
        "GovernorOnlyExecutor",
      );
      await expect(governorTemplate.connect(owner).pauseToken()).to.be.revertedWithCustomError(
        this.governorTemplate,
        "GovernorOnlyExecutor",
      );
      await expect(governorTemplate.connect(owner).unpauseToken()).to.be.revertedWithCustomError(
        this.governorTemplate,
        "GovernorOnlyExecutor",
      );
    });
  });
});
