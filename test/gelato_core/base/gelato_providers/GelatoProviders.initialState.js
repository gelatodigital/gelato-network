import { constants } from "ethers";

export default {
  NO_CEIL: constants.MaxUint256,
  providerFunds: 0,
  executorStake: 0,
  executorByProvider: constants.AddressZero,
  executorProvidersCount: 0,
  taskSpecGasPriceCeil: 0,
  isModuleProvided: false,
  providerModulesLength: 0,
};
