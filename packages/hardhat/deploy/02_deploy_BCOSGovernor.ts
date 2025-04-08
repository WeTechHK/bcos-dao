import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys a contract named "BCOSGovernor" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployBCOSGovernor: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // On localhost, the deployer account is the one that comes with Hardhat, which is already funded.
  //
  // When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
  // should have sufficient balance to pay for the gas fees for contract creation.
  //
  // You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
  // with a random private key in the .env file (then used on hardhat.config.ts)
  // You can run the `yarn account` command to check your balance in every network.

  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;
  const erc20VotePower = await get("ERC20VotePower");
  const tcProxy = await get("CustomTimelockControllerUpgradeable");
  const timer = await get("TimeSetting");
  const quorumNumerator = 30n;
  const votingDelay = 0n; // no delay
  const votingPeriod = 7n * 24n * 60n * 60n; // 7 days
  const proposalThreshold: bigint = 10000000000000000n; // 10e16
  const minDelay = 24n * 60n * 60n; // 1 day
  const initTokenPool: bigint = 1000000000000000000n; // 10e18
  const unit: bigint = process.env.TIMER_UNIT ? BigInt(process.env.TIMER_UNIT) : 1n;

  // print all args
  console.log("deployer", deployer);
  console.log("quorumNumerator", quorumNumerator);
  console.log("votingDelay", votingDelay);
  console.log("votingPeriod", votingPeriod);
  console.log("proposalThreshold", proposalThreshold);
  console.log("minDelay", minDelay);
  console.log("initTokenPool", initTokenPool);
  console.log("unit", unit);

  const governor = await deploy("BCOSGovernor", {
    from: deployer,
    log: true,
    autoMine: true,
    args: [],
    proxy: {
      owner: deployer,
      proxyContract: "UUPS",
      execute: {
        methodName: "initialize",
        args: [
          erc20VotePower.address,
          tcProxy.address,
          quorumNumerator,
          votingDelay,
          votingPeriod,
          proposalThreshold,
          minDelay,
          initTokenPool,
          timer.address,
          unit,
        ],
      },
    },
  });
  console.log("BCOSGovernor", governor.address);
};

export default deployBCOSGovernor;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags Vote
deployBCOSGovernor.tags = ["BCOSGovernor"];
deployBCOSGovernor.dependencies = ["CustomTimelockControllerUpgradeable", "ERC20VotePower", "TimeSetting"];
