export const deployments = {
  // ========== Rinkeby ===========
  // ==== One-Off Actions ====
  // Gnosis
  ActionWithdrawBatchExchange: "0x7a0986883e84DB63A18b1AA96F8B4EC25fD904a6",
  ActionPlaceOrderBatchExchange: "0xDBF368e549604CC78684e83955C73346860D6EA2",
  // BzX
  ActionBzxPtokenBurnToToken: "0x0",
  ActionBzxPtokenMintWithToken: "0x0",
  // erc20
  ActionERC20Transfer: "0x0",
  ActionERC20TransferFrom: "0x9A4D96b09AA3DdBb55981B511302686046AD4398",
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
  GelatoCore: "0xBe3E9777ba67e4CEb7d6Ede2001FB9F5101F68e4",
  GelatoGasPriceOracle: "0xb26d6905C5F34bB2F8BB14970ea1cd95a3B4b5BE",
  ProviderModuleGelatoUserProxy: "0x0",
  ProviderModuleGnosisSafeProxy: "0x4ffC2ada3E95C7De36Ee12a0514BFED2b0fDd995",

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
  // Enable GelatoCore Module and Mint
  ScriptGnosisSafeEnableGelatoCoreAndMint: "0x0",
  // Enter the Rebalancing Chained Action
  ScriptEnterPortfolioRebalancingRinkeby: "0x0",
  ScriptExitRebalancePortfolioRinkeby: "0x0",
  ScriptEnterStableSwap: "0x39D86A5b7248F06dEe7081e3F7F76B7F0d8fA1ee",
};
