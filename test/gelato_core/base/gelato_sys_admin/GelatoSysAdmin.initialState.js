import { constants, utils } from "ethers";

const GELATO_GAS_PRICE_ORACLE = constants.AddressZero;
const GELATO_MAX_GAS = 7000000;
const INTERNAL_GAS_REQUIREMENT = 100000;
const MIN_EXECUTOR_STAKE = utils.parseEther("0.02");
const EXEC_CLAIM_TENANCY = 30 * 24 * 60 * 60; // 30 days
const EXEC_CLAIM_RENT = utils.parseUnits("1", "finney");
const EXECUTOR_SUCCESS_SHARE = 50;
const SYS_ADMIN_SUCCESS_SHARE = 20;
const SYS_ADMIN_FUNDS = 0;

export default {
  gelatoGasPriceOracle: GELATO_GAS_PRICE_ORACLE,
  gelatoMaxGas: GELATO_MAX_GAS,
  internalGasRequirement: INTERNAL_GAS_REQUIREMENT,
  minExecutorStake: MIN_EXECUTOR_STAKE,
  execClaimTenancy: EXEC_CLAIM_TENANCY,
  execClaimRent: EXEC_CLAIM_RENT,
  executorSuccessShare: EXECUTOR_SUCCESS_SHARE,
  sysAdminSuccessShare: SYS_ADMIN_SUCCESS_SHARE,
  sysAdminFunds: SYS_ADMIN_FUNDS,
};
