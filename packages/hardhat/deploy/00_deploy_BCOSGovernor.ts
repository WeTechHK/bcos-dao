import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys a contract named "BCOSGovernor" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployBCOSGovernor: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
          On localhost, the deployer account is the one that comes with Hardhat, which is already funded.
      
          When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
          should have sufficient balance to pay for the gas fees for contract creation.
      
          You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
          with a random private key in the .env file (then used on hardhat.config.ts)
          You can run the `yarn account` command to check your balance in every network.
        */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const vote = await deploy("ERC20VotePower", {
    from: deployer,
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
    args: ["ERC20Vote", "EVP"],
  });
  const tc = await deploy("TimelockController", {
    from: deployer,
    log: true,
    autoMine: true,
    args: [100n, [deployer], [deployer], deployer],
  });
  const bg = await deploy("BCOSGovernor", {
    from: deployer,
    log: true,
    autoMine: true,
    args: [vote.address, tc.address],
  });
  await deploy("ERC1967Proxy", {
    from: deployer,
    log: true,
    autoMine: true,
    args: [bg.address, "0x"],
  });
};

export default deployBCOSGovernor;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags Vote
deployBCOSGovernor.tags = ["BCOSGovernor"];
