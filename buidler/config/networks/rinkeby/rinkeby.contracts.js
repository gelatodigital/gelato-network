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
  // Conditional Tokens
  "ActionWithdrawLiquidity",
  // Uniswap v2
  "ActionUniswapV2Trade",
  // GelatoCore Actions
  "ActionSubmitTask",

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
  // Uniswap v2
  "ConditionUniswapV2Rate",
  "ConditionUniswapV2RateStateful",

  // === GelatoCore ===
  "GelatoCore",

  // === GelatoProviders ===
  "GelatoActionPipeline",
  "FeeHandlerFactory",
  "ProviderModuleGelatoUserProxy",
  "ProviderModuleGnosisSafeProxy",
  "ProviderModuleDSProxy",

  // === GelatoHelpers ===
  "GelatoAddressStorage",

  // === GelatoExecutors ===
  "GelatoMultiCall",
  "PermissionedExecutors",

  // === GelatoUserProxy ===
  "GelatoUserProxyFactory",
  "GelatoUserProxy",
];
