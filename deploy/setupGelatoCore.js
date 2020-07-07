import { ethers } from "@nomiclabs/buidler";

// GelatoGasPriceOracle Setup Vars
const STARTING_GAS_PRICE = ethers.utils.parseUnits("5", "gwei");

// Gelato Core Setup Vars
const GELATO_GAS_PRICE_ORACLE = ethers.constants.AddressZero; // Dummy value
const ORACLE_REQUEST_DATA = "0x50d25bcd"; // latestAnswer() selector
const GELATO_MAX_GAS = 7000000;
const INTERNAL_GAS_REQUIREMENT = 100000;
const MIN_EXECUTOR_STAKE = ethers.utils.parseEther("1");
const EXECUTOR_SUCCESS_SHARE = 5;
const SYS_ADMIN_SUCCESS_SHARE = 5;

const GELATO_CORE_CONSTRUCT_PARAMS = {
  gelatoGasPriceOracle: GELATO_GAS_PRICE_ORACLE,
  oracleRequestData: ORACLE_REQUEST_DATA,
  gelatoMaxGas: GELATO_MAX_GAS,
  internalGasRequirement: INTERNAL_GAS_REQUIREMENT,
  minExecutorStake: MIN_EXECUTOR_STAKE,
  executorSuccessShare: EXECUTOR_SUCCESS_SHARE,
  sysAdminSuccessShare: SYS_ADMIN_SUCCESS_SHARE,
  totalSuccessShare: EXECUTOR_SUCCESS_SHARE + SYS_ADMIN_SUCCESS_SHARE,
};

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { sysAdmin, executor, gasPriceOracle } = await getNamedAccounts();
  const executorSigner = ethers.provider.getSigner(executor);
  const { deploy, log } = deployments;

  // 1. Deploy Gelato Gas Price Oracle with gasPriceOracle => Chainlink on Mainnet
  // @dev Acctoung "gasPriceOracle" can change gas prices for testing purposes
  const GelatoGasPriceOracle = await deploy("GelatoGasPriceOracle", {
    from: gasPriceOracle,
    gas: 4000000,
    args: [STARTING_GAS_PRICE],
  });

  // Update GelatoGasPriceOracle address
  GELATO_CORE_CONSTRUCT_PARAMS.gelatoGasPriceOracle =
    GelatoGasPriceOracle.address;

  // 2. Deploy Gelato Core with SysAdmin
  const GelatoCore = await deploy("GelatoCore", {
    from: sysAdmin,
    gas: 4000000,
    args: [GELATO_CORE_CONSTRUCT_PARAMS],
  });

  const gelatoCore = await ethers.getContractAt(
    GelatoCore.abi,
    GelatoCore.address
  );

  // 3. Stake Executor
  await gelatoCore.connect(executorSigner).stakeExecutor({
    value: MIN_EXECUTOR_STAKE,
  });

  if (GelatoGasPriceOracle.newlyDeployed && GelatoCore.newlyDeployed) {
    log(
      `// ==== GelatoGasPriceOracle deployed => ${GelatoGasPriceOracle.address} ====`
    );
    log(`// ==== GelatoCore deployed => ${GelatoCore.address} ====`);
  }
};

module.exports.tags = ["GelatoCore", "GelatoGasPriceOracle"];
