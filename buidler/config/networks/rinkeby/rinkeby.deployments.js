export const deployments = {
  // ========== Rinkeby ===========
  // ==== One-Off Actions ====
  // Gnosis
  ActionWithdrawBatchExchange: "0xf9A9F03EB2246957308E544e2994582e19950f7c",
  ActionPlaceOrderBatchExchange: "0xDBF368e549604CC78684e83955C73346860D6EA2",
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
  GelatoCore: "0x9587bA2A2AdE6512F960F59eD9c7E9021D081A07",
  GelatoGasPriceOracle: "0xeb7AA218faD35cE401114203722ee1b6506cD5b1",
  ProviderModuleGelatoUserProxy: "0x0",
  ProviderModuleGnosisSafeProxy: "0x8187B4cb7B82132363DCE0BC9e16E47a04f175F6",

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
};
