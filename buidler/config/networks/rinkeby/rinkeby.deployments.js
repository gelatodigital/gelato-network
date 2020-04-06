export const deployments = {
  // ========== Rinkeby ===========
  // ==== One-Off Actions ====
  // Gnosis
  ActionWithdrawBatchExchangeRinkeby:
    "0xe6c832514218d3F3f505c0D9e6b6c78e693b07Ba",
  ActionPlaceOrderBatchExchange: "0xDBF368e549604CC78684e83955C73346860D6EA2",
  // BzX
  ActionBzxPtokenBurnToToken: "0x0",
  ActionBzxPtokenMintWithToken: "0x0",
  // erc20
  ActionERC20Transfer: "0x0",
  ActionERC20TransferFrom: "0x62f9c5AE100C165Adb8cb6Befe634Eb63d02Cf18",
  MockConditionDummy: "0x2462a52261f2AbB229aDD6d8014c8B566411f109",
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
  GelatoCore: "0x7792AB86a89D653fb45fA64708fe5172eEbDB5C1",
  GelatoGasPriceOracle: "0x05946Da8c378043b38BfCC41c3EC02bCEA58D651",
  ProviderModuleGelatoUserProxy: "0x0",
  ProviderModuleGnosisSafeProxy: "0xcce5314Acb7335c90Cf5ECFeACABF830edd01cFa",

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
  ScriptEnterStableSwap: "0xAD31E3C538152aD304F82EC4791cAC3977A98F64",
};
