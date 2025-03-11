import * as dotenv from "dotenv";

dotenv.config();
import "../deploy/00_deploy_BCOSGovernor";
import { ethers } from "hardhat";

async function main() {
  console.log("Deploying BCOSGovernor...");
  const [owner, newMaintainer] = await ethers.getSigners();
  const BCOSGovernor = await ethers.getContractFactory("BCOSGovernor");
  const ERC20VotePower = await ethers.getContractFactory("ERC20VotePower");
  const TimelockController = await ethers.getContractFactory("TimelockController");
  const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
  const evp = await ERC20VotePower.deploy("ERC20Vote", "EVP");
  const tc = await TimelockController.deploy(100n, [owner], [owner], owner);
  const governor = await BCOSGovernor.deploy(evp, tc);
  const proxy = await ERC1967Proxy.deploy(governor, "0x");

  console.log("BCOSGovernor deployed to:", await governor.getAddress());
  console.log("ERC20VotePower deployed to:", await evp.getAddress());
  console.log("TimelockController deployed to:", await tc.getAddress());
  console.log("ERC1967Proxy deployed to:", await proxy.getAddress());

  // empty data
  await ERC1967Proxy.deploy(governor, "0x");
  await evp.mint(owner.address, 2000n);
  await evp.connect(owner).delegate(owner.address);
  const calldata = governor.interface.encodeFunctionData("grantMaintainer", [newMaintainer.address]);
  await governor.connect(owner).propose([governor], [0n], [calldata], "");

  console.log(await governor.proposalCount());

  const pId = await governor.latestProposalId();

  let state = await governor.stateById(pId);
  console.log(state);

  await governor.approveProposal(pId);


  console.log(await governor.proposalSnapshot(await governor.getProposalHashById(pId)));
  await evp.mint(owner.address, 2000n);

  console.log(await governor.getProposalAllInfo(pId));
  state = await governor.stateById(pId);

  console.log(state);
}

main().catch(console.error);
