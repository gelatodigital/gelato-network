export const contracts = [
  // ==== Rinkeby ===
  // === Actions ===
  // = One-Off =
  // ERC20
  "ActionTransfer",
  "ActionERC20TransferFrom",
  // Kyber
  "ActionKyberTradeRinkeby",
  // Portfolio Mgmt
  "ActionRebalancePortfolioRinkeby",
  // Gnosis Batch Exchange
  "ActionWithdrawBatchExchange",
  "ActionWithdrawBatchExchange",
  "ActionPlaceOrderBatchExchangeWithSlippage",
  // Uniswap
  "ActionUniswapTrade",
  // = Chained =
  // ERC20
  "ActionChainedTimedERC20TransferFromRinkeby",
  // Portfolio Mgmt
  "ActionChainedRebalancePortfolioRinkeby",
  // Gnosis
  "ActionPlaceOrderBatchExchangePayFee",
  "ActionWithdrawBatchExchangeChained",
  "ActionPlaceOrderBatchExchangeChained",

  // === GelatoCore ===
  "GelatoCore",
  "GelatoGasPriceOracle",
  "ProviderModuleGnosisSafeProxy",

  // === GelatoUserProxy ===
  "GelatoUserProxyFactory",
  "ProviderModuleGelatoUserProxy",

  // === Conditions ===
  // Balances
  "ConditionBalance",
  "ConditionBalanceStateful",
  // Indices
  "ConditionFearGreedIndex",
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

  // === Scripts ===
  // GnosisSafe
  "ScriptGnosisSafeEnableGelatoCore",
  "ScriptGnosisSafeEnableGelatoCoreAndSubmit",
  // Action specific scripts
  "ScriptEnterPortfolioRebalancingRinkeby",
  "ScriptExitRebalancePortfolioRinkeby",
  // Gnosis BatchExchange
  "ScriptEnterStableSwap",
  "Medianizer2",

  // Helpers
  "GelatoActionPipeline",
  "ActionFeeHandler",
  "FeeHandlerFactory",
  "GelatoMultiCall",
];
