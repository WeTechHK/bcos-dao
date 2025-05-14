import { expect } from "chai";
import { deployments, ethers } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { ProposalState } from "./helpers/enums";
import { proposalStatesToBitMap } from "./helpers/governance";
import { BCOSGovernor, BCOSGovernor__factory, ERC20VotePower__factory } from "../typechain-types";
import { TimelockControllerUpgradeable__factory } from "../typechain-types/factories/contracts/TimelockControllerUpgradeable__factory";

describe("BCOSGovernor", async function () {
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
      expect(await this.governorTemplate.COUNTING_MODE()).to.equal("support=bravo&quorum=for,against,abstain");
      expect(await this.governorTemplate.supportsInterface(ethers.getBytes("0xb7fb511b"))).to.equal(false);
      expect(await this.governorTemplate.proposalNeedsQueuing(0n)).to.equal(true);
    });

    it("check config", async function () {
      expect(await this.governorTemplate.proposalCount()).to.equal(0n);
      expect(await this.governorTemplate.approveThreshold()).to.equal(0n);
      expect(await this.governorTemplate.proposalThreshold()).to.equal(3000000000000000000000n);
      expect(await this.governorTemplate.votingDelay()).to.equal(0n);
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

      await expect(governorTemplate.getProposalHashById(10000000n))
        .to.be.revertedWithCustomError(governorTemplate, "GovernorNonexistentProposal")
        .withArgs("10000000");
      await governorTemplate
        .connect(owner)
        .proposeWithTitle("New Proposal", [await governorTemplate.getAddress()], [0n], [calldata], "# setMaintainer");
      const proposalId = await governorTemplate.proposalCount();
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
      expect(proposal.proposalState).to.equal(ProposalState.Active);
    });

    it("vote and queue and exec", async function () {
      const { proposalId, governorTemplate, owner, newMaintainer } = this;

      await governorTemplate.connect(owner).approveProposal(proposalId);
      let proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalState).to.equal(ProposalState.Active);

      // new maintainer dont have weight
      await expect(governorTemplate.connect(newMaintainer).vote(proposalId, 1n, "")).to.be.revertedWithCustomError(
        governorTemplate,
        "GovernorInvalidVoteType",
      );
      // invalid vote type
      await expect(governorTemplate.connect(owner).vote(proposalId, 3n, "")).to.be.revertedWithCustomError(
        governorTemplate,
        "GovernorInvalidVoteType",
      );
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
      const executed = await governorTemplate.getExecutedProposals();
      expect(executed.length).to.equal(1);
      expect(executed[0]).to.equal(proposalId);
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
      const proposalId = await governorTemplate.proposalCount();
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
      const canceled = await governorTemplate.getCancelledProposals();
      expect(canceled.length).to.equal(1);
      expect(canceled[0]).to.equal(proposalId);
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

      await expect(governorTemplate.connect(owner).emergencyShutdownProposal(proposalId)).to.be.revertedWithCustomError(
        governorTemplate,
        "GovernorUnexpectedProposalState",
      );

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
      const canceled = await governorTemplate.getCancelledProposals();
      expect(canceled.length).to.equal(1);
      expect(canceled[0]).to.equal(proposalId);
    });
  });

  describe("BCOSGovernor - getProposalInfoPage", function () {
    beforeEach(async function () {
      Object.assign(this, await fixtureByDeployment());
      const { erc20VotePowerTemplate, owner, newMaintainer } = this;
      await erc20VotePowerTemplate.connect(owner).delegate(owner.address);
      const calldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData(
        "grantMaintainer",
        [newMaintainer.address],
      );
      Object.assign(this, { calldata });
    });

    it("returns empty list when offset exceeds latest index", async function () {
      const { governorTemplate } = this;
      const offset = 10;
      const pageSize = 5;

      const result = await governorTemplate.getProposalInfoPage(offset, pageSize);
      await expect(result).to.be.an("array").that.is.empty;
    });

    it("returns correct page when offset and pageSize are valid", async function () {
      const { governorTemplate, calldata, owner } = this;

      // 模拟提案
      for (let i = 0; i < 10; i++) {
        await governorTemplate
          .connect(owner)
          .proposeWithTitle(`Title ${i}`, [owner.address], [0n], [calldata], `Description ${i}`);
      }

      let offset = 2;
      let pageSize = 3;

      const result = await governorTemplate.getProposalInfoPage(offset, pageSize);
      expect(result.length).to.equal(3);
      expect(result[0].proposalId).to.equal(3);
      expect(result[1].proposalId).to.equal(4);
      expect(result[2].proposalId).to.equal(5);

      // too large offset
      offset = 10;
      pageSize = 5;
      const result2 = await governorTemplate.getProposalInfoPage(offset, pageSize);
      expect(result2.length).to.equal(0);
      await expect(result2).to.be.an("array").that.is.empty;

      // size exceeds the latest index
      offset = 0;
      pageSize = 20;
      const result3 = await governorTemplate.getProposalInfoPage(offset, pageSize);
      expect(result3.length).to.equal(10);
      expect(result3[0].proposalId).to.equal(1);
      expect(result3[1].proposalId).to.equal(2);

      offset = 3;
      pageSize = 20;
      const result4 = await governorTemplate.getProposalInfoPage(offset, pageSize);
      expect(result4.length).to.equal(7);
      expect(result4[0].proposalId).to.equal(4);
      expect(result4[1].proposalId).to.equal(5);
    });
  });

  describe("Execute proposals", function () {
    beforeEach(async function () {
      Object.assign(this, await fixtureByDeployment());
      const { erc20VotePowerTemplate, owner } = this;
      await erc20VotePowerTemplate.connect(owner).delegate(owner.address);
    });

    const executeProposal = async (
      governorTemplate: BCOSGovernor,
      owner: any,
      contractAddress: string,
      calldata: any,
      value: bigint,
    ) => {
      await governorTemplate
        .connect(owner)
        .proposeWithTitle("New Proposal", [contractAddress], [value], [calldata], "# setMaintainer");
      const proposalId = await governorTemplate.proposalCount();
      const proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposer).to.equal(owner.address);

      await governorTemplate.connect(owner).approveProposal(proposalId);

      await governorTemplate.connect(owner).vote(proposalId, 1n, "");
      await governorTemplate.connect(owner).queueById(proposalId);
      const now = await time.latest();
      await time.setNextBlockTimestamp(now + 24 * 60 * 60);

      await mine(10);

      await governorTemplate.connect(owner).executeById(proposalId);
    };

    it("grantRole", async function () {
      const { governorTemplate, owner, newMaintainer } = this;
      const calldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData(
        "grantMaintainer",
        [newMaintainer.address],
      );
      await executeProposal(governorTemplate, owner, await governorTemplate.getAddress(), calldata, 0n);

      expect(await governorTemplate.hasRole(await governorTemplate.MAINTAINER_ROLE(), newMaintainer.address)).to.eq(
        true,
      );

      const calldata2 = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData(
        "revokeMaintainer",
        [newMaintainer.address],
      );
      await executeProposal(governorTemplate, owner, await governorTemplate.getAddress(), calldata2, 0n);
      expect(await governorTemplate.hasRole(await governorTemplate.MAINTAINER_ROLE(), newMaintainer.address)).to.eq(
        false,
      );

      const calldata3 = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData("grantRole", [
        await governorTemplate.MAINTAINER_ROLE(),
        newMaintainer.address,
      ]);

      await executeProposal(governorTemplate, owner, await governorTemplate.getAddress(), calldata3, 0n);
      expect(await governorTemplate.hasRole(await governorTemplate.MAINTAINER_ROLE(), newMaintainer.address)).to.eq(
        true,
      );

      const calldata4 = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData("revokeRole", [
        await governorTemplate.MAINTAINER_ROLE(),
        newMaintainer.address,
      ]);
      await executeProposal(governorTemplate, owner, await governorTemplate.getAddress(), calldata4, 0n);
      expect(await governorTemplate.hasRole(await governorTemplate.MAINTAINER_ROLE(), newMaintainer.address)).to.eq(
        false,
      );

      const calldata5 = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData("renounceRole", [
        await governorTemplate.MAINTAINER_ROLE(),
        newMaintainer.address,
      ]);
      await executeProposal(governorTemplate, owner, await governorTemplate.getAddress(), calldata5, 0n);
    });

    it("token mint and burn", async function () {
      const { governorTemplate, owner, erc20VotePowerTemplate } = this;
      const initialBalance = await erc20VotePowerTemplate.balanceOf(owner.address);

      const calldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData("mintToken", [
        owner.address,
        1000000n,
      ]);
      await executeProposal(governorTemplate, owner, await governorTemplate.getAddress(), calldata, 0n);
      const newBalance = await erc20VotePowerTemplate.balanceOf(owner.address);
      expect(newBalance).to.equal(initialBalance + 1000000n);

      const calldata2 = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData("burnToken", [
        owner.address,
        500000n,
      ]);

      await executeProposal(governorTemplate, owner, await governorTemplate.getAddress(), calldata2, 0n);
      const finalBalance = await erc20VotePowerTemplate.balanceOf(owner.address);
      expect(finalBalance).to.equal(initialBalance + 500000n);
    });

    it("token pause and unpause", async function () {
      const { governorTemplate, owner, erc20VotePowerTemplate, newMaintainer } = this;

      const pauseCalldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData(
        "pauseToken",
      );
      const unpauseCalldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData(
        "unpauseToken",
      );

      await executeProposal(governorTemplate, owner, await governorTemplate.getAddress(), pauseCalldata, 0n);
      expect(await erc20VotePowerTemplate.paused()).to.equal(true);

      await expect(
        erc20VotePowerTemplate.connect(owner).transfer(newMaintainer.address, 100n),
      ).to.be.revertedWithCustomError(erc20VotePowerTemplate, "EnforcedPause");

      await executeProposal(governorTemplate, owner, await governorTemplate.getAddress(), unpauseCalldata, 0n);
      expect(await erc20VotePowerTemplate.paused()).to.equal(false);

      await erc20VotePowerTemplate.connect(owner).transfer(newMaintainer.address, 100n);
      expect(await erc20VotePowerTemplate.balanceOf(newMaintainer.address)).to.equal(100n);
    });

    it("reset time unit", async function () {
      const { governorTemplate, erc20VotePowerTemplate, owner } = this;
      const newUnit = 10; // example new unit
      console.log(await governorTemplate.getCancelledProposals());
      console.log(await governorTemplate.getExecutedProposals());
      console.log(await governorTemplate.proposalCount());
      await governorTemplate.connect(owner).resetUint(newUnit);
      const now = await time.latest();
      expect(await erc20VotePowerTemplate.clock()).to.equal(Math.floor(now / newUnit));
    });

    it("set dao settings", async function () {
      const { governorTemplate, owner } = this;
      const calldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData(
        "setVoteSuccessThreshold",
        [100n],
      );
      await executeProposal(governorTemplate, owner, await governorTemplate.getAddress(), calldata, 0n);

      expect(await governorTemplate.voteSuccessThreshold()).to.equal(100n);

      const calldata2 = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData(
        "setApproveThreshold",
        [20000n],
      );

      await executeProposal(governorTemplate, owner, await governorTemplate.getAddress(), calldata2, 0n);

      expect(await governorTemplate.approveThreshold()).to.equal(20000n);
    });
  });
});
