import { expect } from "chai";
import { deployments, ethers } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { ProposalState } from "./helpers/enums";
import { proposalStatesToBitMap } from "./helpers/governance";
import {
  BCOSGovernor__factory,
  ERC20VotePower__factory,
  TimelockControllerUpgradeable__factory,
} from "../typechain-types";

describe("BCOSGovernor", function () {
  async function deployScript() {
    const [owner, newMaintainer] = await ethers.getSigners();
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
      erc20VotePowerTemplate,
      governorTemplate,
      tcTemplate,
    };
  }

  const fixtureByDeployment = async () => {
    return await deployScript();
  };

  describe("constructor", function () {
    beforeEach(async function () {
      Object.assign(this, await fixtureByDeployment());
    });
    it("check the proxy initialize value", async function () {
      expect(await this.governorTemplate.token()).to.equal(this.erc20VotePowerTemplate);
      expect(await this.governorTemplate.timelock()).to.equal(this.tcTemplate);
      expect(await this.governorTemplate.executor()).to.equal(this.tcTemplate);
      expect(await this.erc20VotePowerTemplate.owner()).to.equal(this.governorTemplate);
      expect(await this.tcTemplate.hasRole(await this.tcTemplate.DEFAULT_ADMIN_ROLE(), this.owner.address)).to.equal(
        true,
      );
    });

    it("check config", async function () {
      expect(await this.governorTemplate.proposalCount()).to.equal(0n);
      expect(await this.governorTemplate.latestProposalId()).to.equal(0n);
      expect(await this.governorTemplate.approveThreshold()).to.equal(0n);
      expect(await this.governorTemplate.proposalThreshold()).to.equal(10000000000000000n);
      expect(await this.governorTemplate.votingDelay()).to.equal(0n);
      expect(await this.governorTemplate.votingPeriod()).to.equal(7n * 24n * 60n * 60n);
      expect(await this.governorTemplate.quorumDenominator()).to.equal(100n);
      expect(await this.governorTemplate.quorumNumerator()).to.equal(30n);
      expect(await this.governorTemplate.voteSuccessThreshold()).to.equal(50n);
      expect(await this.governorTemplate.isVoteSuccessful(51n, 30n, 19n)).to.equal(true);
      expect(await this.governorTemplate.isVoteSuccessful(50n, 30n, 20n)).to.equal(false);
    });
  });

  describe("propose flow", function () {
    beforeEach(async function () {
      Object.assign(this, await fixtureByDeployment());
      const { erc20VotePowerTemplate, governorTemplate, owner, newMaintainer } = this;
      const calldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData(
        "grantMaintainer",
        [newMaintainer.address],
      );

      await erc20VotePowerTemplate.connect(owner).delegate(owner.address);

      await governorTemplate
        .connect(owner)
        .proposeWithTitle("New Proposal", [await governorTemplate.getAddress()], [0n], [calldata], "# setMaintainer");
      const proposalId = await governorTemplate.latestProposalId();
      const proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposer).to.equal(owner.address);
      expect(proposal.proposalDetail.targets[0]).to.equal(await governorTemplate.getAddress());
      expect(proposal.proposalDetail.calldatas[0]).to.equal(calldata);
      // const now = await time.latest();
      // expect(proposal.startTime).to.equal(now);
      // expect(proposal.endTime).to.eq(now + 10);
      expect(proposal.startTime).to.lt(proposal.endTime);
      expect(proposal.proposalState).to.equal(ProposalState.Pending);
      expect(proposal.proposalVote.forVotes).to.equal(0);
      expect(proposal.proposalVote.againstVotes).to.equal(0);
      expect(proposal.proposalVote.abstainVotes).to.equal(0);

      Object.assign(this, { calldata, proposalId });
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

    it("vote and queue and exec", async function () {
      const { proposalId, governorTemplate, owner, newMaintainer } = this;

      await governorTemplate.connect(owner).approveProposal(proposalId);
      let proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalState).to.equal(ProposalState.Active);

      const tx = await governorTemplate.connect(owner).vote(proposalId, 1n, "");
      const receipt = await tx.wait();
      proposal = await governorTemplate.getProposalAllInfo(proposalId);

      const balance = await this.erc20VotePowerTemplate.balanceOf(owner.address);

      expect(proposal.proposalVote.forVotes).to.equal(balance);
      expect(proposal.proposalState).to.equal(ProposalState.Succeeded);
      await governorTemplate.connect(owner).queueById(proposalId);
      proposal = await governorTemplate.getProposalAllInfo(proposalId);

      expect(await governorTemplate.hasVoted(proposalId, owner.address)).to.eq(true);
      const voters = await governorTemplate.proposalVoters(proposalId);
      expect(voters.length).to.eq(1);
      expect(voters[0]).to.eq(owner.address);
      console.log(proposal);
      const [weight, type, number] = await governorTemplate.proposalVoterInfo(proposalId, owner.address);
      expect(weight).to.eq(balance);
      expect(type).to.eq(1n);
      expect(proposal.proposalVote.forVotes).to.equal(balance);
      expect(proposal.proposalState).to.equal(ProposalState.Queued);

      expect(number).to.equal(receipt.blockNumber);

      const now = await time.latest();
      await time.setNextBlockTimestamp(now + 24 * 60 * 60);
      await governorTemplate.connect(owner).executeById(proposalId);

      expect(await governorTemplate.hasRole(await governorTemplate.MAINTAINER_ROLE(), newMaintainer)).to.eq(true);

      expect(await governorTemplate.stateById(proposalId)).to.equal(ProposalState.Executed);
    });
  });

  describe("cancel flow", function () {
    beforeEach(async function () {
      Object.assign(this, await fixtureByDeployment());
      const { erc20VotePowerTemplate, governorTemplate, owner, newMaintainer } = this;

      const calldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData("grantRole", [
        await governorTemplate.MAINTAINER_ROLE(),
        newMaintainer.address,
      ]);

      await erc20VotePowerTemplate.connect(owner).delegate(owner.address);

      await governorTemplate
        .connect(owner)
        .propose([await governorTemplate.getAddress()], [0n], [calldata], "# setMaintainer");
      const proposalId = await governorTemplate.latestProposalId();
      await mine(1);
      const proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalState).to.equal(ProposalState.Pending);
      Object.assign(this, { calldata, proposalId });
    });

    it("cancelByProposer", async function () {
      const { governorTemplate, owner, proposalId } = this;
      await governorTemplate.connect(owner).cancelById(proposalId);
      const proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalState).to.equal(ProposalState.Canceled);
    });

    it("cancel wrong state proposal", async function () {
      const { governorTemplate, owner, proposalId } = this;

      await governorTemplate.connect(owner).approveProposal(proposalId);

      expect(await governorTemplate.stateById(proposalId)).to.eq(ProposalState.Active);
      const hash = await governorTemplate.getProposalHashById(proposalId);
      await expect(governorTemplate.connect(owner).cancelById(proposalId))
        .to.be.revertedWithCustomError(this.governorTemplate, "GovernorUnexpectedProposalState")
        .withArgs(hash, ProposalState.Active, proposalStatesToBitMap([ProposalState.Pending]));
    });

    it("emergency cancel", async function () {
      const { governorTemplate, owner, proposalId, newMaintainer } = this;

      await governorTemplate.connect(owner).approveProposal(proposalId);

      expect(await governorTemplate.stateById(proposalId)).to.eq(ProposalState.Active);

      await expect(governorTemplate.connect(newMaintainer).emergencyShutdownProposal(proposalId)).to.be.revertedWith(
        "BCOSGovernor: caller is not a maintainer",
      );

      await expect(governorTemplate.emergencyShutdownProposal(proposalId)).to.emit(
        governorTemplate,
        "ProposalCanceled",
      );

      expect(await governorTemplate.stateById(proposalId)).to.eq(ProposalState.Canceled);
    });
  });
});
