export const contracts = [
  // === Actions ===
  // ERC20
  "ActionTransfer",
  "ActionERC20TransferFrom",
  // Kyber
  "ActionKyberTrade",
  // Gnosis
  "ActionWithdrawBatchExchange",
  "ActionWithdrawBatchExchange",

  // === Conditions ===
  // Balances
  "ConditionBalance",
  // Prices
  "ConditionKyberRate",
  // Time
  "ConditionTime",

  // === GelatoCore ===
  "GelatoCore",
  // ProviderModules
  "ProviderModuleGelatoUserProxy",
  // GelatoGasPriceOracle
  "GelatoGasPriceOracle",

  // === GelatoExecutors ===
  "PermissionedExecutors",

  // === GelatoUserProxies ===
  // = GelatoUserProxy =
  // Factory
  "GelatoUserProxyFactory",

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
