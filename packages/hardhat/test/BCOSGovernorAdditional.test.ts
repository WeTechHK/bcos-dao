import { expect } from "chai";
import { deployments, ethers } from "hardhat";
import { mine, time } from "@nomicfoundation/hardhat-network-helpers";
import { ProposalState } from "./helpers/enums";
import { BCOSGovernor, BCOSGovernor__factory, ERC20VotePower__factory } from "../typechain-types";
import { TimelockControllerUpgradeable__factory } from "../typechain-types/factories/contracts/TimelockControllerUpgradeable__factory";

describe("BCOSGovernorAdditional", async function () {
  // Deploy the contracts before each test
  async function deployFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();
    await deployments.fixture(["BCOSGovernor", "ERC20VotePower", "CustomTimelockControllerUpgradeable", "TimeSetting"]);

    const e = await deployments.get("ERC20VotePower");
    const t = await deployments.get("CustomTimelockControllerUpgradeable");
    const g = await deployments.get("BCOSGovernor");

    const governorTemplate = BCOSGovernor__factory.connect(g.address, owner);
    const erc20VotePowerTemplate = ERC20VotePower__factory.connect(e.address, owner);
    const tcTemplate = TimelockControllerUpgradeable__factory.connect(t.address, owner);

    return {
      owner,
      user1,
      user2,
      user3,
      erc20VotePowerTemplate,
      governorTemplate,
      tcTemplate,
    };
  }

  // Helper function to execute a proposal through governance
  const executeProposal = async (
    governorTemplate: BCOSGovernor,
    owner: any,
    contractAddress: string,
    calldata: any,
    value: bigint,
  ) => {
    await governorTemplate
      .connect(owner)
      .proposeWithTitle("New Proposal", [contractAddress], [value], [calldata], "# Test Proposal");
    const proposalId = await governorTemplate.proposalCount();

    // Approve the proposal (changes state from Pending to Active)
    await governorTemplate.connect(owner).approveProposal(proposalId);

    // Vote on the proposal
    await governorTemplate.connect(owner).vote(proposalId, 1n, "");

    // Check if the proposal is in the Succeeded state before queueing
    const proposalHash = await governorTemplate.getProposalHashById(proposalId);
    const state = await governorTemplate.state(proposalHash);

    if (state === ProposalState.Succeeded) {
      // Queue the proposal if it's in the Succeeded state
      await governorTemplate.connect(owner).queueById(proposalId);

      // Advance time to allow execution
      const now = await time.latest();
      await time.setNextBlockTimestamp(now + 24 * 60 * 60);
      await mine(10);

      // Execute the proposal
      await governorTemplate.connect(owner).executeById(proposalId);
    }

    return proposalId;
  };

  // Helper function to create a proposal without executing it
  const createProposal = async (
    governorTemplate: BCOSGovernor,
    owner: any,
    contractAddress: string,
    calldata: any,
    value: bigint,
    title: string,
    description: string,
  ) => {
    await governorTemplate.connect(owner).proposeWithTitle(title, [contractAddress], [value], [calldata], description);
    const proposalId = await governorTemplate.proposalCount();

    // Approve the proposal (changes state from Pending to Active)
    await governorTemplate.connect(owner).approveProposal(proposalId);

    return proposalId;
  };

  describe("Multiple voters scenario", function () {
    beforeEach(async function () {
      const fixture = await deployFixture();
      Object.assign(this, fixture);

      // Check the owner's token balance and the proposal threshold
      const ownerBalance = await this.erc20VotePowerTemplate.balanceOf(this.owner.address);
      const proposalThreshold = await this.governorTemplate.proposalThreshold();
      console.log("Owner balance:", ownerBalance.toString());
      console.log("Proposal threshold:", proposalThreshold.toString());

      // Skip the test if the owner doesn't have enough tokens to create a proposal
      if (ownerBalance < proposalThreshold) {
        console.log("Owner doesn't have enough tokens to create a proposal. Skipping test.");
        this.skip();
        return;
      }

      // Mint some tokens to users for voting through governance
      const mintAmount = ethers.parseEther("1000");

      // Mint tokens to user1
      const mintUser1Calldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData(
        "mintToken",
        [this.user1.address, mintAmount],
      );
      await executeProposal(
        this.governorTemplate,
        this.owner,
        await this.governorTemplate.getAddress(),
        mintUser1Calldata,
        0n,
      );

      // Mint tokens to user2
      const mintUser2Calldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData(
        "mintToken",
        [this.user2.address, mintAmount],
      );
      await executeProposal(
        this.governorTemplate,
        this.owner,
        await this.governorTemplate.getAddress(),
        mintUser2Calldata,
        0n,
      );

      // Mint tokens to user3
      const mintUser3Calldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData(
        "mintToken",
        [this.user3.address, mintAmount],
      );
      await executeProposal(
        this.governorTemplate,
        this.owner,
        await this.governorTemplate.getAddress(),
        mintUser3Calldata,
        0n,
      );

      // Delegate voting power to users before creating the proposal
      await this.erc20VotePowerTemplate.connect(this.owner).delegate(this.owner.address);
      await this.erc20VotePowerTemplate.connect(this.user1).delegate(this.user1.address);
      await this.erc20VotePowerTemplate.connect(this.user2).delegate(this.user2.address);
      await this.erc20VotePowerTemplate.connect(this.user3).delegate(this.user3.address);

      // Mine a block to ensure the delegation is recorded
      await mine(1);

      // Create a proposal without executing it
      const calldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData(
        "setVoteSuccessThreshold",
        [60n], // Set vote success threshold to 60%
      );

      this.proposalId = await createProposal(
        this.governorTemplate,
        this.owner,
        await this.governorTemplate.getAddress(),
        calldata,
        0n,
        "Test Multiple Voters",
        "Multiple voters test",
      );
    });

    it("should correctly count votes from multiple voters", async function () {
      // User1 votes for
      await this.governorTemplate.connect(this.user1).vote(this.proposalId, 1, "I support this");

      // User2 votes against
      await this.governorTemplate.connect(this.user2).vote(this.proposalId, 0, "I oppose this");

      // User3 abstains
      await this.governorTemplate.connect(this.user3).vote(this.proposalId, 2, "I abstain");

      // Owner votes for
      await this.governorTemplate.connect(this.owner).vote(this.proposalId, 1, "I support as owner");

      // Check vote counts
      const [forVotes, againstVotes, abstainVotes] = await this.governorTemplate.proposalVotes(this.proposalId);

      // Get balances to verify vote weights
      const user1Balance = await this.erc20VotePowerTemplate.balanceOf(this.user1.address);
      const user2Balance = await this.erc20VotePowerTemplate.balanceOf(this.user2.address);
      const user3Balance = await this.erc20VotePowerTemplate.balanceOf(this.user3.address);
      const ownerBalance = await this.erc20VotePowerTemplate.balanceOf(this.owner.address);

      // Verify vote counts
      expect(forVotes).to.equal(user1Balance + ownerBalance);
      expect(againstVotes).to.equal(user2Balance);
      expect(abstainVotes).to.equal(user3Balance);

      // Verify voters list
      const voters = await this.governorTemplate.proposalVoters(this.proposalId);
      expect(voters.length).to.equal(4);
      expect(voters).to.include(this.user1.address);
      expect(voters).to.include(this.user2.address);
      expect(voters).to.include(this.user3.address);
      expect(voters).to.include(this.owner.address);

      // Verify individual voter info
      const [user1Weight, user1Type] = await this.governorTemplate.proposalVoterInfo(
        this.proposalId,
        this.user1.address,
      );
      expect(user1Weight).to.equal(user1Balance);
      expect(user1Type).to.equal(1); // For

      const [user2Weight, user2Type] = await this.governorTemplate.proposalVoterInfo(
        this.proposalId,
        this.user2.address,
      );
      expect(user2Weight).to.equal(user2Balance);
      expect(user2Type).to.equal(0); // Against

      const [user3Weight, user3Type] = await this.governorTemplate.proposalVoterInfo(
        this.proposalId,
        this.user3.address,
      );
      expect(user3Weight).to.equal(user3Balance);
      expect(user3Type).to.equal(2); // Abstain
    });

    it("should prevent double voting", async function () {
      // User1 votes
      await this.governorTemplate.connect(this.user1).vote(this.proposalId, 1, "First vote");

      // Try to vote again
      await expect(this.governorTemplate.connect(this.user1).vote(this.proposalId, 0, "Second vote"))
        .to.be.revertedWithCustomError(this.governorTemplate, "GovernorAlreadyCastVote")
        .withArgs(this.user1.address);
    });

    it("should handle proposal state transitions correctly", async function () {
      // Initially the proposal should be active
      expect(await this.governorTemplate.stateById(this.proposalId)).to.equal(ProposalState.Active);

      // User1 and Owner vote for (should be enough to pass with their voting power)
      await this.governorTemplate.connect(this.user1).vote(this.proposalId, 1, "I support this");
      await this.governorTemplate.connect(this.owner).vote(this.proposalId, 1, "I support as owner");

      // Check if proposal succeeded
      const proposalHash = await this.governorTemplate.getProposalHashById(this.proposalId);
      const state = await this.governorTemplate.state(proposalHash);
      expect(state).to.equal(ProposalState.Succeeded);

      // Queue the proposal
      await this.governorTemplate.connect(this.owner).queueById(this.proposalId);
      expect(await this.governorTemplate.stateById(this.proposalId)).to.equal(ProposalState.Queued);

      // Advance time to allow execution
      const now = await time.latest();
      await time.setNextBlockTimestamp(now + 24 * 60 * 60);

      // Execute the proposal
      await this.governorTemplate.connect(this.owner).executeById(this.proposalId);
      expect(await this.governorTemplate.stateById(this.proposalId)).to.equal(ProposalState.Executed);

      // Verify the proposal was executed correctly
      expect(await this.governorTemplate.voteSuccessThreshold()).to.equal(60n);
    });
  });

  describe("Edge cases", function () {
    beforeEach(async function () {
      const fixture = await deployFixture();
      Object.assign(this, fixture);
      await this.erc20VotePowerTemplate.connect(this.owner).delegate(this.owner.address);
    });

    it("should handle zero votes correctly", async function () {
      // Create a proposal
      const calldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData(
        "setVoteSuccessThreshold",
        [70n],
      );

      await this.governorTemplate
        .connect(this.owner)
        .proposeWithTitle(
          "Zero Votes Test",
          [await this.governorTemplate.getAddress()],
          [0n],
          [calldata],
          "Zero votes test",
        );

      const proposalId = await this.governorTemplate.proposalCount();
      await this.governorTemplate.connect(this.owner).approveProposal(proposalId);

      // Try to vote with user who has no tokens
      await expect(
        this.governorTemplate.connect(this.user1).vote(proposalId, 1, "I have no tokens"),
      ).to.be.revertedWithCustomError(this.governorTemplate, "GovernorInvalidVoteType");
    });

    it("should handle proposal with empty description", async function () {
      const calldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData(
        "setVoteSuccessThreshold",
        [70n],
      );

      // Create proposal with empty description
      await this.governorTemplate
        .connect(this.owner)
        .proposeWithTitle("Empty Description", [await this.governorTemplate.getAddress()], [0n], [calldata], "");

      const proposalId = await this.governorTemplate.proposalCount();
      const proposal = await this.governorTemplate.getProposalAllInfo(proposalId);

      expect(proposal.extra.description).to.equal("");
      expect(proposal.extra.title).to.equal("Empty Description");
    });

    it("should handle proposal with very long description", async function () {
      const calldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData(
        "setVoteSuccessThreshold",
        [70n],
      );

      // Create a very long description
      let longDescription = "This is a very long description. ";
      for (let i = 0; i < 20; i++) {
        longDescription += "Adding more text to make it longer. ";
      }

      await this.governorTemplate
        .connect(this.owner)
        .proposeWithTitle(
          "Long Description",
          [await this.governorTemplate.getAddress()],
          [0n],
          [calldata],
          longDescription,
        );

      const proposalId = await this.governorTemplate.proposalCount();
      const proposal = await this.governorTemplate.getProposalAllInfo(proposalId);

      expect(proposal.extra.description).to.equal(longDescription);
    });
  });

  describe("Token operations", function () {
    beforeEach(async function () {
      const fixture = await deployFixture();
      Object.assign(this, fixture);
      await this.erc20VotePowerTemplate.connect(this.owner).delegate(this.owner.address);
    });

    it("should update voting power after token transfers", async function () {
      // Initial setup - mint tokens through governance
      const initialAmount = ethers.parseEther("1000");

      // Mint tokens to user1 through governance
      const mintCalldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData("mintToken", [
        this.user1.address,
        initialAmount,
      ]);
      await executeProposal(
        this.governorTemplate,
        this.owner,
        await this.governorTemplate.getAddress(),
        mintCalldata,
        0n,
      );

      // Delegate voting power before creating the proposal
      await this.erc20VotePowerTemplate.connect(this.user1).delegate(this.user1.address);

      // Mine a block to ensure the delegation is recorded
      await mine(1);

      // Transfer tokens from user1 to user2
      const transferAmount = ethers.parseEther("500");
      await this.erc20VotePowerTemplate.connect(this.user1).transfer(this.user2.address, transferAmount);
      await this.erc20VotePowerTemplate.connect(this.user2).delegate(this.user2.address);

      // Mine a block to ensure the transfer and delegation are recorded
      await mine(1);

      // Create proposal
      const calldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData(
        "setVoteSuccessThreshold",
        [70n],
      );

      await this.governorTemplate
        .connect(this.owner)
        .proposeWithTitle(
          "Token Transfer Test",
          [await this.governorTemplate.getAddress()],
          [0n],
          [calldata],
          "Testing voting power after transfers",
        );

      const proposalId = await this.governorTemplate.proposalCount();
      await this.governorTemplate.connect(this.owner).approveProposal(proposalId);

      // User1 votes
      await this.governorTemplate.connect(this.user1).vote(proposalId, 1, "Voting with reduced balance");

      // User2 votes
      await this.governorTemplate.connect(this.user2).vote(proposalId, 0, "Voting with received tokens");

      // Check vote counts
      const [forVotes, againstVotes, abstainVotes] = await this.governorTemplate.proposalVotes(proposalId);

      // Verify vote weights reflect the transfer
      expect(forVotes).to.equal(initialAmount - transferAmount);
      expect(againstVotes).to.equal(transferAmount);
      expect(abstainVotes).to.equal(0);
    });
  });
});
