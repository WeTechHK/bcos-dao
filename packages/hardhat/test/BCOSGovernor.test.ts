import { expect } from "chai";
import { ethers } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { ProposalState } from "./helpers/enums";
import { proposalStatesToBitMap } from "./helpers/governance";
import {
  BCOSGovernor__factory,
  ERC20VotePower__factory,
  TimelockControllerUpgradeable__factory,
} from "../typechain-types";

describe("BCOSGovernor", function () {
  async function deployGovernor() {
    const [owner, newMaintainer] = await ethers.getSigners();
    const BCOSGovernor = await ethers.getContractFactory("BCOSGovernor");
    const ERC20VotePower = await ethers.getContractFactory("ERC20VotePower");
    const TimelockController = await ethers.getContractFactory("TimelockControllerUpgradeable");
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
      expect(await this.proxyGovernor.implementation()).to.equal(this.governor);
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
      const { erc20VotePowerTemplate, governorTemplate, owner, newMaintainer } = this;
      const calldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData(
        "grantMaintainer",
        [newMaintainer.address],
      );

      await erc20VotePowerTemplate.connect(owner).mint(owner.address, 2000n);
      await erc20VotePowerTemplate.connect(owner).delegate(owner.address);

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
      await mine(1);
      let proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalState).to.equal(ProposalState.Active);

      const tx = await governorTemplate.connect(owner).vote(proposalId, 1n, "");
      const receipt = await tx.wait();
      await mine(10);
      proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalVote.forVotes).to.equal(2000n);
      expect(proposal.proposalState).to.equal(ProposalState.Succeeded);
      await governorTemplate.connect(owner).queueById(proposalId);
      proposal = await governorTemplate.getProposalAllInfo(proposalId);

      expect(await governorTemplate.hasVoted(proposalId, owner.address)).to.eq(true);
      const voters = await governorTemplate.proposalVoters(proposalId);
      expect(voters.length).to.eq(1);
      expect(voters[0]).to.eq(owner.address);
      console.log(proposal);
      expect(await governorTemplate.proposalVoterWeight(proposalId, owner.address)).to.eq(2000n);
      expect(proposal.proposalVote.forVotes).to.equal(2000n);
      expect(proposal.proposalState).to.equal(ProposalState.Queued);

      expect(await governorTemplate.proposalVoterBlock(proposalId, owner.address)).to.equal(receipt.blockNumber);
      await mine(30);
      await governorTemplate.connect(owner).executeById(proposalId);

      expect(await governorTemplate.hasRole(await governorTemplate.MAINTAINER_ROLE(), newMaintainer)).to.eq(true);

      expect(await governorTemplate.stateById(proposalId)).to.equal(ProposalState.Executed);
    });
  });

  describe("cancel flow", function () {
    beforeEach(async function () {
      Object.assign(this, await fixture());
      const { erc20VotePowerTemplate, governorTemplate, owner, newMaintainer } = this;

      const calldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData("grantRole", [
        await governorTemplate.MAINTAINER_ROLE(),
        newMaintainer.address,
      ]);

      await erc20VotePowerTemplate.connect(owner).mint(owner.address, 2000n);
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
