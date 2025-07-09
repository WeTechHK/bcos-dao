import { ethers } from "hardhat";

async function main() {
  const contract = await ethers.getContractFactory("ERC20VotePower");
  const abi = contract.interface.fragments;

  abi.forEach(item => {
    if (item.type === "function") {
      // const selector = ethers.keccak256(ethers.toUtf8Bytes(item.format("sighash"))).substring(0, 10);
      // console.log(`Function: ${item.format("full")}, Selector: ${selector}`);
    } else if (item.type === "error") {
      const selector = ethers.keccak256(ethers.toUtf8Bytes(item.format("sighash"))).substring(0, 10);
      console.log(`Error: ${item.format("full")}, Selector: ${selector}`);
    }
  });
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
