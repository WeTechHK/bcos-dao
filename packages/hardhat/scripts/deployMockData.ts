import * as dotenv from "dotenv";

dotenv.config();
import "../deploy/02_deploy_BCOSGovernor";
import { deployments, ethers, getNamedAccounts } from "hardhat";
import {
  BCOSGovernor__factory,
  ERC20VotePower__factory,
  TimelockControllerUpgradeable__factory,
} from "../typechain-types";

async function main() {
  const { deployer } = await getNamedAccounts();
  const [owner] = await ethers.getSigners();
  const tc = await deployments.get("TimelockControllerUpgradeable");
  const erc20 = await deployments.get("ERC20VotePower");
  const governor = await deployments.get("BCOSGovernor");
  console.log("deployer: ", deployer);
  console.log("tc.address: ", tc.address);
  console.log("erc20.address: ", erc20.address);
  console.log("governor.address: ", governor.address);

  const governorTemplate = BCOSGovernor__factory.connect(governor.address, owner);
  const erc20VotePowerTemplate = ERC20VotePower__factory.connect(erc20.address, owner);
  TimelockControllerUpgradeable__factory.connect(tc.address, owner);

  await erc20VotePowerTemplate.connect(owner).mint(owner.address, 2000n);
  await erc20VotePowerTemplate.connect(owner).delegate(owner.address);

  const calldata = (await ethers.getContractFactory("BCOSGovernor")).interface.encodeFunctionData("grantMaintainer", [
    deployer,
  ]);

  await governorTemplate
    .connect(owner)
    [
      "propose(string,address[],uint256[],bytes[],string)"
    ]("New Title", [await governorTemplate.getAddress()], [0n], [calldata], "# setNewMaintainer");
  const proposalId = await governorTemplate.latestProposalId();

  await governorTemplate.connect(owner).approveProposal(proposalId);
  const proposal = await governorTemplate.getProposalAllInfo(proposalId);

  console.log("proposal: ", proposal);
}

main().catch(console.error);
