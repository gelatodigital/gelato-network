export const contracts = [
  // === Actions ===
  // === Actions ===
  // = One-Off =
  // ERC20
  "ActionERC20Transfer",
  "ActionERC20TransferFrom",
  // Kyber
  "ActionKyberTradeKovan",
  // Portfolio Mgmt
  "ActionRebalancePortfolio",
  // Gnosis
  "ActionWithdrawBatchExchange",
  "ActionWithdrawBatchExchange",

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
  "ConditionTime",

  // === GelatoCore ===
  "GelatoCore",
  // ProviderModules
  "ProviderModuleGelatoUserProxy",
  // GelatoGasPriceOracle
  "GelatoGasPriceOracle",

  // === GelatoUserProxies ===
  // = GelatoUserProxy =
  // Factory
  "GelatoUserProxyFactory",

  // = GnosisSafeProxy =
  // Scripts
  "ScriptGnosisSafeEnableGelatoCore",
  "ScriptGnosisSafeEnableGelatoCoreAndSubmit",

  // === Mocks ====
  // Conditions
  "MockConditionDummy",
  // = Actions =
  // One-Off
  "MockActionDummy",
  "MockBatchExchange",
  // Chained
  "MockActionChainedDummy",
  // ERC-20
  "MockERC20",

  // === Debugging ===
  // Action
  "ActionKyberTradePayloadDecoding",
  // Conditions
  "ConditionKyberRatePayloadDecoding",
  // ReverStringDecoding
  "Action",
  "Core",
  "UserProxy",
];
