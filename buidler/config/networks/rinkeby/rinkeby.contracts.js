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
  "ActionPlaceOrderBatchExchangeWithWithdraw",

  // === GelatoCore ===
  "GelatoCore",
  "GelatoGasPriceOracle",
  "ProviderModuleGelatoUserProxy",
  "ProviderModuleGnosisSafeProxy",

  // === Conditions ===
  // Balances
  "ConditionBalance",
  // Indices
  "ConditionFearGreedIndex",
  // Prices
  "ConditionKyberRateRinkeby",
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
