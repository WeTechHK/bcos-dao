import { expect } from "chai";
import { ethers } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { ProposalState } from "./helpers/enums";
import {
  BCOSGovernor__factory,
  ERC20VotePower__factory,
  TimelockControllerUpgradeable__factory,
} from "../typechain-types";

describe("Multiple Voters Test", function () {
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

    it("more voters agree", async function () {
      const { proposalId, governorTemplate, owner, newMaintainer, voters } = this;

      await governorTemplate.connect(owner).approveProposal(proposalId);
      await mine(1);
      let proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalState).to.equal(ProposalState.Active);

      // Owner votes for
      const tx = await governorTemplate.connect(owner).vote(proposalId, 1n, "");
      const receipt = await tx.wait();

      // Voter 1-3 vote for
      await governorTemplate.connect(voters[0]).vote(proposalId, 1n, "");
      await governorTemplate.connect(voters[1]).vote(proposalId, 1n, "");
      await governorTemplate.connect(voters[2]).vote(proposalId, 1n, "");

      // Voter 4 votes against
      await governorTemplate.connect(voters[3]).vote(proposalId, 0n, "");

      // Voter 5 abstains
      await governorTemplate.connect(voters[4]).vote(proposalId, 2n, "");

      await mine(10);
      proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalVote.forVotes).to.equal(8000n); // Owner + Voter1-3 = 2000 * 4 = 8000
      expect(proposal.proposalVote.againstVotes).to.equal(2000n); // Voter4 = 2000
      expect(proposal.proposalVote.abstainVotes).to.equal(2000n); // Voter5 = 2000
      console.log(proposal.proposalState, "proposal.proposalState");
      expect(proposal.proposalState).to.equal(ProposalState.Succeeded);

      // 添加队列操作
      await governorTemplate.connect(owner).queueById(proposalId);
      proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalState).to.equal(ProposalState.Queued);

      // 等待时间锁延迟
      await time.increase(31);
      await mine(1);

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

      expect(await governorTemplate.proposalVoterWeight(proposalId, owner.address)).to.eq(2000n);
      expect(await governorTemplate.proposalVoterWeight(proposalId, voters[0].address)).to.eq(2000n);
      expect(await governorTemplate.proposalVoterWeight(proposalId, voters[1].address)).to.eq(2000n);
      expect(await governorTemplate.proposalVoterWeight(proposalId, voters[2].address)).to.eq(2000n);
      expect(await governorTemplate.proposalVoterWeight(proposalId, voters[3].address)).to.eq(2000n);
      expect(await governorTemplate.proposalVoterWeight(proposalId, voters[4].address)).to.eq(2000n);

      expect(proposal.proposalState).to.equal(ProposalState.Queued);

      expect(await governorTemplate.proposalVoterBlock(proposalId, owner.address)).to.equal(receipt.blockNumber);
    });
    it("more voters against", async function () {
      const { proposalId, governorTemplate, owner, voters } = this;

      await governorTemplate.connect(owner).approveProposal(proposalId);
      await mine(1);
      let proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalState).to.equal(ProposalState.Active);

      // Owner votes for
      const tx = await governorTemplate.connect(owner).vote(proposalId, 1n, "");
      await tx.wait();

      // Voter 1 votes for
      await governorTemplate.connect(voters[0]).vote(proposalId, 1n, "");

      // Voter 2 votes against
      await governorTemplate.connect(voters[1]).vote(proposalId, 0n, "");

      // Voter 3 against
      await governorTemplate.connect(voters[2]).vote(proposalId, 0n, "");

      // Voter 4 votes against
      await governorTemplate.connect(voters[3]).vote(proposalId, 0n, "");

      // Voter 5 votes against
      await governorTemplate.connect(voters[4]).vote(proposalId, 0n, "");

      // Voter 6 against
      await governorTemplate.connect(voters[5]).vote(proposalId, 0n, "");

      // Voter 7 votes for
      await governorTemplate.connect(voters[6]).vote(proposalId, 1n, "");

      await mine(10);
      proposal = await governorTemplate.getProposalAllInfo(proposalId);
      expect(proposal.proposalVote.forVotes).to.equal(6000n); // Owner(2000) + Voter1(2000) + Voter7(2000) = 6000
      expect(proposal.proposalVote.againstVotes).to.equal(10000n); // Voter2-6(5 * 2000) = 10000
      expect(proposal.proposalVote.abstainVotes).to.equal(0n);
      expect(proposal.proposalState).to.equal(ProposalState.Defeated);

      expect(await governorTemplate.hasVoted(proposalId, owner.address)).to.eq(true);
      expect(await governorTemplate.hasVoted(proposalId, voters[0].address)).to.eq(true);
      expect(await governorTemplate.hasVoted(proposalId, voters[1].address)).to.eq(true);
      expect(await governorTemplate.hasVoted(proposalId, voters[2].address)).to.eq(true);
      expect(await governorTemplate.hasVoted(proposalId, voters[3].address)).to.eq(true);
      expect(await governorTemplate.hasVoted(proposalId, voters[4].address)).to.eq(true);
      expect(await governorTemplate.hasVoted(proposalId, voters[5].address)).to.eq(true);
      expect(await governorTemplate.hasVoted(proposalId, voters[6].address)).to.eq(true);

      const votersList = await governorTemplate.proposalVoters(proposalId);
      expect(votersList.length).to.eq(8); // Owner + 7 voters
      expect(votersList).to.include(owner.address);
      expect(votersList).to.include(voters[0].address);
      expect(votersList).to.include(voters[1].address);
      expect(votersList).to.include(voters[2].address);
      expect(votersList).to.include(voters[3].address);
      expect(votersList).to.include(voters[4].address);
      expect(votersList).to.include(voters[5].address);
      expect(votersList).to.include(voters[6].address);

      expect(await governorTemplate.proposalVoterWeight(proposalId, owner.address)).to.eq(2000n);
      expect(await governorTemplate.proposalVoterWeight(proposalId, voters[0].address)).to.eq(2000n);
      expect(await governorTemplate.proposalVoterWeight(proposalId, voters[1].address)).to.eq(2000n);
      expect(await governorTemplate.proposalVoterWeight(proposalId, voters[2].address)).to.eq(2000n);
      expect(await governorTemplate.proposalVoterWeight(proposalId, voters[3].address)).to.eq(2000n);
      expect(await governorTemplate.proposalVoterWeight(proposalId, voters[4].address)).to.eq(2000n);
      expect(await governorTemplate.proposalVoterWeight(proposalId, voters[5].address)).to.eq(2000n);
      expect(await governorTemplate.proposalVoterWeight(proposalId, voters[6].address)).to.eq(2000n);
    });
  });
});
