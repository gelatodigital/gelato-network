export const contracts = [
  // ==== Kovan ===
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

  // Action specific scripts
  "ScriptEnterPortfolioRebalancing",

  // === Conditions ===
  // Balances
  "ConditionBalance",
  // Indices
  "ConditionFearGreedIndex",
  // Prices
  "ConditionKyberRateKovan",
  // Time
  "ConditionTimestampPassed",

  // === GelatoCore ===
  "GelatoCore",
  // ProviderModules
  "ProviderGnosisSafeProxyModule",

  // === GelatoUserProxies ===
  // == GnosisSafe ==
  // Scripts
  "ScriptGnosisSafeEnableGelatoCore",
  "ScriptGnosisSafeEnableGelatoCoreAndMint"
];
