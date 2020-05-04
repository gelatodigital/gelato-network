export const deployments = {
  // ========== Rinkeby ===========
  // ==== One-Off Actions ====
  // Gnosis
  ActionWithdrawBatchExchange: "0x69AE3dA599dC5E0Bfd8b7831c4d8f4f459F90890",
  ActionPlaceOrderBatchExchange: "0x97C2068714F7B5359da8cC3D05b6E6D8019b582c",
  // erc20
  ActionERC20Transfer: "0x0",
  ActionERC20TransferFrom: "0x38a020C3392C28658F19dC0DBC9aD9D2Bb32b71f",
  MockConditionDummy: "0x5803c4712f191fc565afA44eB7f8eb9e8Af057db",
  // kyber
  ActionKyberTradeRinkeby: "0x0",
  // Portfolio Mgmt
  ActionRebalancePortfolioRinkeby: "0x0",

  // ==== Actions - Chained ====
  // erc20
  ActionChainedTimedERC20TransferFromRinkeby: "0x0",
  // Portfolio Mgmt
  ActionChainedRebalancePortfolioRinkeby: "0x0",
  // gnosis
  ActionPlaceOrderBatchExchangeWithWithdraw:
    "0xd6a4f5CDfA6B38404D1747fC53f85C957910E576",
  ActionWithdrawBatchExchangeChained:
    "0x407E41940DDcEB42F3cC73d3A446CF39012334Db",
  ActionPlaceOrderBatchExchangeChained:
    "0xF536876f81A8504609C13069615647F0A6CAe2F1",

  // ===== Gelato Core ====
  GelatoCore: "0xE91Fc90FF3522d9d876aF497E02549Dc139D9b71",
  GelatoGasPriceOracle: "0x8f2bf9C69742e51d7131aC3496E97023f519Cfec",
  ProviderModuleGelatoUserProxy: "0x0",
  ProviderModuleGnosisSafeProxy: "0xf02A5498dfdc970Fd0f7F0B1d48CAC6Bee2E5fe0",

  // ==== Conditions ====
  // == Balances ==
  ConditionBalance: "0x29712a389E06eC7C91016932c23FcB085AF241Fb",
  ConditionBalanceStateful: "0x0A5Cb504e4684E8F730F582AB9b9AA671115e60C",
  // == Indices ==
  // fearAndGreed
  ConditionFearGreedIndex: "0x0",
  // == Price ==
  // Kyber
  ConditionKyberRate: "0x4F2935cd565E88832721ea5465D21593894274Cd",
  // == Time ==
  // Timestamps
  ConditionTimestampPassed: "0x0",
  // Gnosis
  ConditionBatchExchangeFundsWithdrawable:
    "0x66A11882E861B85685668fB3e72a7c6b74753352",

  // ==== Scripts ====
  // == GnosisSafe ==
  // Enable GelatoCore Module
  ScriptGnosisSafeEnableGelatoCore:
    "0x5EF44De4b98F2bcE0E29c344E7B2Fb8f0282A0Cf",
  // Enable GelatoCore Module and Submit Task
  ScriptGnosisSafeEnableGelatoCoreAndSubmit: "0x0",
  // Enter the Rebalancing Chained Action
  ScriptEnterPortfolioRebalancingRinkeby: "0x0",
  ScriptExitRebalancePortfolioRinkeby: "0x0",
  ScriptEnterStableSwap: "0xE3fA17CE2021118fb09a169732F18E5d4B4D9127",

  // Maker
  Medianizer2: "0x642CC986A17A3e508fddb21fF4485D1A6A8B1DA4",

  // Helpers
  FeeFinder: "0x220D8543325364D004661F73E0253C7CC6a4ACc1",
  FeeExtractor: "0x9b625d0aC057450E67B7e3B6e17633AcF01Fe2a9",
};
