export const deployments = {
  // ========== Rinkeby ===========
  // ==== One-Off Actions ====
  // Gnosis
  ActionWithdrawBatchExchange: "0x1b3f567c4a6f064FE770498F734C4C25F4C0239e",
  ActionPlaceOrderBatchExchange: "0xA5C2Fe84D9E8f90024f5D573FC17Fb176226b25b",
  ActionPlaceOrderBatchExchangeWithWithdraw:
    "0xA36F8de45b1B1A348cBe26d9ED1a5Cf26eC2da9F",
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

  // ===== Gelato Core ====
  GelatoCore: "0x310D17c1B5023f2CfCF37eFb54EA6a1532000ACc",
  GelatoGasPriceOracle: "0xA48751C5C5C8Ed452e19E650AB9FF7Df0b6Ba762",
  ProviderModuleGelatoUserProxy: "0x0",
  ProviderModuleGnosisSafeProxy: "0xa5DCeC8D4A11BDEA5E888Ca2978e88CFd083C037",

  // ==== Conditions ====
  // == Balances ==
  ConditionBalance: "0x0",
  // == Indices ==
  // fearAndGreed
  ConditionFearGreedIndex: "0x0",
  // == Price ==
  // Kyber
  ConditionKyberRateRinkeby: "0x0",
  // == Time ==
  // Timestamps
  ConditionTimestampPassed: "0x0",
  // Gnosis
  ConditionBatchExchangeFundsWithdrawable:
    "0x7FbbAE131b7855EDbbd8F3b74a4c5c6a2D24a3Db",

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
  FeeExtractor: "0x58c26C4D995e800D40a19cC45d4FACE05b7477Df",
};
