import { utils } from "ethers";

const GELATO_GAS_PRICE_ORACLE = "0xA417221ef64b1549575C977764E651c9FAB50141";
const ORACLE_REQUEST_DATA = "0x50d25bcd"; // latestAnswer() selector
const GELATO_MAX_GAS = 7000000;
const INTERNAL_GAS_REQUIREMENT = 100000;
const MIN_EXECUTOR_STAKE = utils.parseEther("1");
const EXECUTOR_SUCCESS_SHARE = 50;
const SYS_ADMIN_SUCCESS_SHARE = 20;
const SYS_ADMIN_FUNDS = 0;

export default {
  gelatoGasPriceOracle: GELATO_GAS_PRICE_ORACLE,
  oracleRequestData: ORACLE_REQUEST_DATA,
  gelatoMaxGas: GELATO_MAX_GAS,
  internalGasRequirement: INTERNAL_GAS_REQUIREMENT,
  minExecutorStake: MIN_EXECUTOR_STAKE,
  executorSuccessShare: EXECUTOR_SUCCESS_SHARE,
  sysAdminSuccessShare: SYS_ADMIN_SUCCESS_SHARE,
  sysAdminFunds: SYS_ADMIN_FUNDS,
};
