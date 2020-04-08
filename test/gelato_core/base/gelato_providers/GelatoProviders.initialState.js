import { constants } from "ethers";

export default {
  NO_CEIL: constants.MaxUint256,
  providerFunds: constants.Zero,
  executorStake: constants.Zero,
  executorByProvider: constants.AddressZero,
  executorProvidersCount: constants.Zero,
  isConditionProvided: false,
  actionGasPriceCeil: constants.Zero,
};
