import { constants } from "ethers";

export default {
  NO_CEIL: constants.MaxUint256,
  providerFunds: 0,
  executorStake: 0,
  executorByProvider: constants.AddressZero,
  executorProvidersCount: 0,
  iceCreamGasPriceCeil: 0,
  isModuleProvided: false,
  numOfProviderModules: 0,
  providerModulesLength: 0,
};
