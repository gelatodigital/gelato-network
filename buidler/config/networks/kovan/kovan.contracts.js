export const contracts = [
  // ==== Kovan ===
  // === Actions ===
  // = One-Off =
  // ERC20
  "ActionERC20Transfer",
  "ActionERC20TransferFrom",
  // Kyber
  "ActionKyberTradeKovan",
  // Portfolio Mgmt
  "ActionRebalancePortfolioKovan",

  // = Chained =
  // ERC20
  "ActionChainedTimedERC20TransferFromKovan",
  // Portfolio Mgmt
  "ActionChainedRebalancePortfolioKovan",

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
  "ConditionTime",

  // === GelatoCore ===
  "GelatoCore",
  // ProviderModules
  "ProviderModuleGelatoUserProxy",
  "ProviderModuleGnosisSafeProxy",

  // === UserProxies ===
  // == GelatoUserProxy ==
  "GelatoUserProxyFactory",

  // == GnosisSafe ==
  // Scripts
  "ScriptGnosisSafeEnableGelatoCore",
  "ScriptGnosisSafeEnableGelatoCoreAndSubmit",
  // Action specific scripts
  "ScriptEnterPortfolioRebalancingKovan",
  "ScriptExitRebalancePortfolioKovan",

  // === Mocks ====
  // Conditions
  "MockConditionDummy",
  // = Actions =
  // One-Off
  "MockActionDummy",
  // Chained
  "MockActionChainedDummy"
];
