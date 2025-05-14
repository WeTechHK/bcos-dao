import { expect } from "chai";
import { deployments, ethers } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { ProposalState } from "./helpers/enums";
import { BCOSGovernor__factory, ERC20VotePower__factory } from "../typechain-types";
import { TimelockControllerUpgradeable__factory } from "../typechain-types/factories/contracts/TimelockControllerUpgradeable__factory";

describe("Multiple Voters Test", function () {
  async function deployGovernor() {
    const [owner, newMaintainer, ...restVoters] = await ethers.getSigners();
    await deployments.fixture(["BCOSGovernor", "ERC20VotePower", "CustomTimelockControllerUpgradeable", "TimeSetting"]);
    const e = await deployments.get("ERC20VotePower");
    const t = await deployments.get("CustomTimelockControllerUpgradeable");
    const g = await deployments.get("BCOSGovernor");
    const governorTemplate = BCOSGovernor__factory.connect(g.address, owner);
    const erc20VotePowerTemplate = ERC20VotePower__factory.connect(e.address, owner);
    const tcTemplate = TimelockControllerUpgradeable__factory.connect(t.address, owner);

    // await tcTemplate.initialize(30n, [proxyGovernorAddress], [proxyGovernorAddress], owner.address);
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
      const { erc20VotePowerTemplate, governorTemplate, newMaintainer, owner, voters } = this;

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
        .proposeWithTitle("New Proposal", [await governorTemplate.getAddress()], [0n], [calldata], "# setMaintainer");
      proposalId = await governorTemplate.proposalCount();

      Object.assign(this, { calldata, proposalId });
    });

    it("more voters agree", async function () {
      const { proposalId, governorTemplate, owner, newMaintainer, voters } = this;

      await governorTemplate.connect(owner).approveProposal(proposalId);
      await mine(1);
      let proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalState).to.equal(ProposalState.Active);

      // Voter 1-3 vote for
      await governorTemplate.connect(voters[0]).vote(proposalId, 1n, "");
      await governorTemplate.connect(voters[1]).vote(proposalId, 1n, "");
      await governorTemplate.connect(voters[2]).vote(proposalId, 1n, "");
      // double vote
      await expect(governorTemplate.connect(voters[2]).vote(proposalId, 1n, ""))
        .to.be.revertedWithCustomError(governorTemplate, "GovernorAlreadyCastVote")
        .withArgs(voters[2].address);
      // Voter 4 votes against
      await governorTemplate.connect(voters[3]).vote(proposalId, 0n, "");

      // Voter 5 abstains
      await governorTemplate.connect(voters[4]).vote(proposalId, 2n, "");
      // Owner votes for
      const tx = await governorTemplate.connect(owner).vote(proposalId, 1n, "");
      const receipt = await tx.wait();
      await mine(10);
      proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalVote.forVotes).to.equal(3000000000000000006000n); // Owner + Voter1-3
      expect(proposal.proposalVote.againstVotes).to.equal(2000n); // Voter4 = 2000
      expect(proposal.proposalVote.abstainVotes).to.equal(2000n); // Voter5 = 2000
      console.log(proposal.proposalState, "proposal.proposalState");
      expect(proposal.proposalState).to.equal(ProposalState.Succeeded);

      // 添加队列操作
      await governorTemplate.connect(owner).queueById(proposalId);
      proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalState).to.equal(ProposalState.Queued);

      // 等待时间锁延迟
      const now = await time.latest();
      await time.setNextBlockTimestamp(now + 24 * 60 * 60);

      // 执行提案 - 只执行一次
      await governorTemplate.connect(owner).executeById(proposalId);
      expect(await governorTemplate.hasRole(await governorTemplate.MAINTAINER_ROLE(), newMaintainer)).to.eq(true);
      expect(await governorTemplate.stateById(proposalId)).to.equal(ProposalState.Executed);

      // 验证投票结果
      expect(await governorTemplate.hasVoted(proposalId, owner.address)).to.eq(true);
      expect(await governorTemplate.hasVoted(proposalId, voters[0].address)).to.eq(true);
      expect(await governorTemplate.hasVoted(proposalId, voters[1].address)).to.eq(true);
      expect(await governorTemplate.hasVoted(proposalId, voters[2].address)).to.eq(true);
      expect(await governorTemplate.hasVoted(proposalId, voters[3].address)).to.eq(true);
      expect(await governorTemplate.hasVoted(proposalId, voters[4].address)).to.eq(true);

      const votersList = await governorTemplate.proposalVoters(proposalId);
      expect(votersList.length).to.eq(6); // Owner + 5 voters
      expect(votersList).to.include(owner.address);
      expect(votersList).to.include(voters[0].address);
      expect(votersList).to.include(voters[1].address);
      expect(votersList).to.include(voters[2].address);
      expect(votersList).to.include(voters[3].address);
      expect(votersList).to.include(voters[4].address);

      expect((await governorTemplate.proposalVoterInfo(proposalId, owner.address)).weight).to.eq(
        3000000000000000000000n,
      );
      expect((await governorTemplate.proposalVoterInfo(proposalId, owner.address)).voteType).to.eq(1n);
      expect((await governorTemplate.proposalVoterInfo(proposalId, owner.address)).number).to.eq(receipt.blockNumber);
      expect((await governorTemplate.proposalVoterInfo(proposalId, voters[0].address)).weight).to.eq(2000n);
      expect((await governorTemplate.proposalVoterInfo(proposalId, voters[0].address)).voteType).to.eq(1n);
      expect((await governorTemplate.proposalVoterInfo(proposalId, voters[1].address)).weight).to.eq(2000n);
      expect((await governorTemplate.proposalVoterInfo(proposalId, voters[1].address)).voteType).to.eq(1n);
      expect((await governorTemplate.proposalVoterInfo(proposalId, voters[2].address)).weight).to.eq(2000n);
      expect((await governorTemplate.proposalVoterInfo(proposalId, voters[2].address)).voteType).to.eq(1n);
      expect((await governorTemplate.proposalVoterInfo(proposalId, voters[3].address)).weight).to.eq(2000n);
      expect((await governorTemplate.proposalVoterInfo(proposalId, voters[3].address)).voteType).to.eq(0n);
      expect((await governorTemplate.proposalVoterInfo(proposalId, voters[4].address)).weight).to.eq(2000n);
      expect((await governorTemplate.proposalVoterInfo(proposalId, voters[4].address)).voteType).to.eq(2n);
      proposal = await governorTemplate.getProposalAllInfo(proposalId);

      expect(proposal.proposalState).to.equal(ProposalState.Executed);
    });

    it("more voters against", async function () {
      const { proposalId, governorTemplate, owner, voters } = this;

      await governorTemplate.connect(owner).approveProposal(proposalId);
      await mine(1);
      let proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalState).to.equal(ProposalState.Active);

      // Voter 1-3 vote for
      await governorTemplate.connect(voters[0]).vote(proposalId, 1n, "");
      await governorTemplate.connect(voters[1]).vote(proposalId, 1n, "");
      await governorTemplate.connect(voters[2]).vote(proposalId, 1n, "");

      // Voter 4 votes against
      await governorTemplate.connect(voters[3]).vote(proposalId, 0n, "");

      // Voter 5 abstains
      await governorTemplate.connect(voters[4]).vote(proposalId, 2n, "");
      // Owner votes against
      await governorTemplate.connect(owner).vote(proposalId, 0n, "");

      await mine(10);
      proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalVote.againstVotes).to.equal(3000000000000000002000n); // Owner + Voter4(2000)
      expect(proposal.proposalVote.forVotes).to.equal(6000n); // Voter2-6(3 * 2000) = 10000
      expect(proposal.proposalVote.abstainVotes).to.equal(2000n);
      const now = await time.latest();
      await time.setNextBlockTimestamp(now + 24 * 60 * 60);
      await mine(10);
      proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalState).to.equal(ProposalState.Defeated);

      expect(await governorTemplate.hasVoted(proposalId, owner.address)).to.eq(true);
      expect(await governorTemplate.hasVoted(proposalId, voters[0].address)).to.eq(true);
      expect(await governorTemplate.hasVoted(proposalId, voters[1].address)).to.eq(true);
      expect(await governorTemplate.hasVoted(proposalId, voters[2].address)).to.eq(true);
      expect(await governorTemplate.hasVoted(proposalId, voters[3].address)).to.eq(true);
      expect(await governorTemplate.hasVoted(proposalId, voters[4].address)).to.eq(true);

      const votersList = await governorTemplate.proposalVoters(proposalId);
      expect(votersList.length).to.eq(6); // Owner + 5 voters
      expect(votersList).to.include(owner.address);
      expect(votersList).to.include(voters[0].address);
      expect(votersList).to.include(voters[1].address);
      expect(votersList).to.include(voters[2].address);
      expect(votersList).to.include(voters[3].address);
      expect(votersList).to.include(voters[4].address);
    });
  });
});
