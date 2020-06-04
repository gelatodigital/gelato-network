export const contracts = [
  // ==== Rinkeby ===
  // === Actions ===
  // = One-Off =
  // ERC20
  "ActionERC20Transfer",
  "ActionERC20TransferFrom",
  "ActionERC20TransferFromGlobal",
  // Kyber
  "ActionKyberTradeRinkeby",
  // Portfolio Mgmt
  "ActionRebalancePortfolioRinkeby",
  // Gnosis Batch Exchange
  "ActionWithdrawBatchExchange",
  "ActionWithdrawBatchExchange",
  "ActionPlaceOrderBatchExchange",
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
  "ConditionTimestampPassed",
  "ConditionTimeStateful",
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
  "GelatoMultiCall",
  "GlobalState",
  "ProviderFeeRelay",
  "ProviderFeeRelayFactory",
];
