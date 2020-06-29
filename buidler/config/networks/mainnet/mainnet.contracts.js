export const contracts = [
  // ==== Mainnet
  // Actions
  "ActionTransfer",
  "ActionERC20TransferFrom",
  "ActionKyberTrade",
  "ActionUniswapTrade",
  // Gnosis
  "ActionWithdrawBatchExchange",
  "ActionPlaceOrderBatchExchangeWithSlippage",

  // === Core ======
  "GelatoCore",
  "GelatoActionPipeline",

  // === Gelato User Proxy ===
  "GelatoUserProxyFactory",

  // Provider Modules
  "ProviderModuleGnosisSafeProxy",
  "ProviderModuleGelatoUserProxy",

  // Conditions
  "ConditionBalance",
  "ConditionBalanceStateful",

  "ConditionKyberRate",
  "ConditionKyberRateStateful",

  "ConditionTime",
  "ConditionTimeStateful",

  "ConditionBatchExchangeWithdrawStateful",
  // Debugging
  "ConditionKyberRateError",
  // Helpers
  "FeeFinder",
  "FeeHandlerFactory",
  // Libraries
  "Multisend",
];
