export const contracts = [
  // ==== Rinkeby ===
  // === Actions ===
  // ERC20
  "ActionTransfer",
  "ActionERC20TransferFrom",
  // Gnosis Batch Exchange
  "ActionWithdrawBatchExchange",
  "ActionPlaceOrderBatchExchangeWithSlippage",
  // Kyber
  "ActionKyberTrade",
  // Provider
  "ActionFeeHandler",
  // Uniswap
  "ActionUniswapTrade",

  // === Conditions ===
  // Balances
  "ConditionBalance",
  "ConditionBalanceStateful",
  // Prices
  "ConditionKyberRate",
  "ConditionKyberRateStateful",
  // Time
  "ConditionTime",
  "ConditionTimeStateful",
  // Gnosis
  "ConditionBatchExchangeWithdrawStateful",
  // Mock
  "MockConditionDummy",

  // === GelatoCore ===
  "GelatoCore",

  // === GelatoProviders ===
  "GelatoActionPipeline",
  "FeeHandlerFactory",
  "ProviderModuleGelatoUserProxy",
  "ProviderModuleGnosisSafeProxy",

  // === GelatoExecutors ===
  "GelatoMultiCall",
  "PermissionedExecutors",

  // === GelatoUserProxy ===
  "GelatoUserProxyFactory",
];
