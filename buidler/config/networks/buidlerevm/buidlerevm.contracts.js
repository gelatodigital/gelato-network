export const contracts = [
  // === Actions ===
  // = One-Off =
  // BzX
  "ActionBzxPtokenBurnToToken",
  "ActionBzxPtokenMintWithToken",
  // ERC20
  "ActionERC20Transfer",
  "ActionERC20TransferFrom",
  // Kyber
  "ActionKyberTradeKovan",
  // Multimint
  "ActionMultiMintForConditionTimestampPassed",
  // Portfolio Mgmt
  "ActionRebalancePortfolio",

  // = Chained =
  // ERC20
  "ActionChainedTimedERC20TransferFromKovan",
  // Portfolio Mgmt
  "ActionChainedRebalancePortfolio",

  // === GelatoCore ===
  "GelatoCore",
  // ProviderModules
  "ProviderGnosisSafeProxyModule",

  // === Conditions ===
  // Balances
  "ConditionBalance",
  // Indices
  "ConditionFearGreedIndex",
  // Prices
  "ConditionKyberRateKovan",
  // Time
  "ConditionTimestampPassed",

  // === Scripts ===
  // GnosisSafe
  "ScriptGnosisSafeEnableGelatoCore",
  "ScriptGnosisSafeEnableGelatoCoreAndMint",
  // Action specific scripts
  "ScriptEnterPortfolioRebalancing",

  // === Debugging ===
  // Action
  "ActionKyberTradePayloadDecoding",
  // Conditions
  "ConditionKyberRatePayloadDecoding",
  // ReverStringDecoding
  "Action",
  "Core",
  "UserProxy"
];
