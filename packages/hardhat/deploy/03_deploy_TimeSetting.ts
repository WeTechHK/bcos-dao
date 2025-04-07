import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys a contract named "TimeSetting.sol" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployTimeSetting: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // On localhost, the deployer account is the one that comes with Hardhat, which is already funded.
  //
  // When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
  // should have sufficient balance to pay for the gas fees for contract creation.
  //
  // You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
  // with a random private key in the .env file (then used on hardhat.config.ts)
  // You can run the `yarn account` command to check your balance in every network.

  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const time = await deploy("TimeSetting", {
    from: deployer,
    log: true,
    autoMine: true,
    args: [],
  });
  console.log("TimeSetting", time.address);
};

export default deployTimeSetting;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags Vote
deployTimeSetting.tags = ["TimeSetting"];
