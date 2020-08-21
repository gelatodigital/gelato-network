export const contracts = [
  // ==== Mainnet
  // Actions
  "ActionTransfer",
  "ActionERC20TransferFrom",
  "ActionFeeHandler",
  "ActionKyberTrade",
  "ActionUniswapTrade",
  // Gnosis
  "ActionWithdrawBatchExchange",
  "ActionPlaceOrderBatchExchangeWithSlippage",
  "ActionUniswapV2Trade",

  // Conditions
  "ConditionBalance",
  "ConditionBalanceStateful",
  "ConditionKyberRate",
  "ConditionKyberRateStateful",
  "ConditionTime",
  "ConditionTimeStateful",
  "ConditionBatchExchangeWithdrawStateful",
  "ConditionUniswapV2RateStateful",

  // === GelatoCore ======
  "GelatoCore",

  // === GelatoProviders ===
  "GelatoActionPipeline",
  "FeeHandlerFactory",
  "ProviderModuleGnosisSafeProxy",
  "ProviderModuleGelatoUserProxy",

  // === GelatoExecutors ===
  "GelatoMultiCall",
  "PermissionedExecutors",

  // === Gelato User Proxy ===
  "GelatoUserProxyFactory",
];
