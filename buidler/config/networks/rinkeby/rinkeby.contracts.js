export const contracts = [
  // ==== Rinkeby ===
  // === Actions ===
  // = One-Off =
  // ERC20
  "ActionERC20Transfer",
  "ActionERC20TransferFrom",
  // Kyber
  "ActionKyberTradeRinkeby",
  // Portfolio Mgmt
  "ActionRebalancePortfolioRinkeby",
  // Gnosis Batch Exchange
  "ActionWithdrawBatchExchange",
  "ActionWithdrawBatchExchange",
  "ActionPlaceOrderBatchExchange",
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
  // Time
  "ConditionTimestampPassed",
  // Gnosis
  "ConditionBatchExchangeFundsWithdrawable",
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
  "FeeExtractor",
];
