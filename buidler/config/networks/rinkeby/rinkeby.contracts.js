export const contracts = [
  // ==== Rinkeby ===
  // === Actions ===
  // = One-Off =
  // ERC20
  "ActionTransfer",
  "ActionERC20TransferFrom",
  // Gnosis Batch Exchange
  "ActionWithdrawBatchExchange",
  "ActionPlaceOrderBatchExchangeWithSlippage",
  // Kyber
  "ActionKyberTradeRinkeby",
  // Provider
  "ActionFeeHandler",
  // Uniswap
  "ActionUniswapTrade",

  // === GelatoCore ===
  "GelatoCore",
  "ProviderModuleGnosisSafeProxy",

  // === GelatoUserProxy ===
  "GelatoUserProxyFactory",
  "ProviderModuleGelatoUserProxy",

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

  // Helpers
  "GelatoActionPipeline",
  "FeeHandlerFactory",
  "GelatoMultiCall",
];
