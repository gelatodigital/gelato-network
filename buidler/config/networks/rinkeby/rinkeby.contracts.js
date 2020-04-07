export const contracts = [
  // ==== Rinkeby ===
  // === Actions ===
  // = One-Off =
  // BzX
  "ActionBzxPtokenBurnToToken",
  "ActionBzxPtokenMintWithToken",
  // ERC20
  "ActionERC20Transfer",
  "ActionERC20TransferFrom",
  // Kyber
  "ActionKyberTradeRinkeby",
  // Multimint
  "ActionMultiMintForConditionTimestampPassed",
  // Portfolio Mgmt
  "ActionRebalancePortfolioRinkeby",
  // Gnosis Batch Exchange
  "ActionWithdrawBatchExchangeRinkeby",
  "ActionPlaceOrderBatchExchange",
  // = Chained =
  // ERC20
  "ActionChainedTimedERC20TransferFromRinkeby",
  // Portfolio Mgmt
  "ActionChainedRebalancePortfolioRinkeby",

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
  "ScriptGnosisSafeEnableGelatoCoreAndMint",
  // Action specific scripts
  "ScriptEnterPortfolioRebalancingRinkeby",
  "ScriptExitRebalancePortfolioRinkeby",
  // Gnosis BatchExchange
  "ScriptEnterStableSwap",
];
