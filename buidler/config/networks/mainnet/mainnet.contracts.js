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
  "ActionSubmitTask",
  // Omen
  "ActionWithdrawLiquidity",
  // Gelato:
  "ActionGelatoV1",

  // Conditions
  "ConditionBalance",
  "ConditionBalanceStateful",
  "ConditionKyberRate",
  "ConditionKyberRateStateful",
  "ConditionTime",
  "ConditionTimeStateful",
  "ConditionBatchExchangeWithdrawStateful",
  "ConditionUniswapV2RateStateful",
  "ConditionCompareCompoundAaveLending",

  // === GelatoCore ======
  "GelatoCore",

  // === GelatoProviders ===
  "GelatoActionPipeline",
  "FeeHandlerFactory",
  "ProviderModuleGnosisSafeProxy",
  "ProviderModuleGelatoUserProxy",
  "ProviderModuleDSProxy",
  "ProviderModuleDSA",

  // === GelatoExecutors ===
  "GelatoMultiCall",
  "PermissionedExecutors",

  // === Gelato User Proxy ===
  "GelatoUserProxyFactory",

  // === Gelato Helpers ===
  "GelatoAddressStorage",
];
