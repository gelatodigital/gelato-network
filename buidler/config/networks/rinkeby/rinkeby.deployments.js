export const deployments = {
  // ========== Rinkeby ===========
  // ==== One-Off Actions ====
  // Gnosis
  ActionWithdrawBatchExchangeRinkeby: "0x677fd52A56D48a401EF72f5E7127C3D4CBb87074",
  ActionPlaceOrderBatchExchange: "0xDBF368e549604CC78684e83955C73346860D6EA2",
  // BzX
  ActionBzxPtokenBurnToToken: "0x0",
  ActionBzxPtokenMintWithToken: "0x0",
  // erc20
  ActionERC20Transfer: "0x0",
  ActionERC20TransferFrom: "0xAE2681CA4E898bEc0bFAa850D1E9bC3f9bA06fE0",
  // kyber
  ActionKyberTradeRinkeby: "0x0",
  // Portfolio Mgmt
  ActionRebalancePortfolioRinkeby: "0x0",

  // ==== Actions - Chained ====
  // erc20
  ActionChainedTimedERC20TransferFromRinkeby:
    "0x0",
  // Portfolio Mgmt
  ActionChainedRebalancePortfolioRinkeby:
    "0x0",

  // ===== Gelato Core ====
  GelatoCore: "0xff54516a7bC1c1ea952A688E72d5B93a80620074",

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
  ConditionBatchExchangeFundsWithdrawable: "0x7FbbAE131b7855EDbbd8F3b74a4c5c6a2D24a3Db",

  // ==== Scripts ====
  // == GnosisSafe ==
  // Enable GelatoCore Module
  ScriptGnosisSafeEnableGelatoCore:
    "0x5EF44De4b98F2bcE0E29c344E7B2Fb8f0282A0Cf",
  // Enable GelatoCore Module and Mint
  ScriptGnosisSafeEnableGelatoCoreAndMint:
    "0x0",
  // Enter the Rebalancing Chained Action
  ScriptEnterPortfolioRebalancingRinkeby:
    "0x0",
  ScriptExitRebalancePortfolioRinkeby:
    "0x0",
  ScriptEnterStableSwap: "0xAD31E3C538152aD304F82EC4791cAC3977A98F64"
};
