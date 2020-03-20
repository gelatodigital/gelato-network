export const deployments = {
  // ========== Rinkeby ===========
  // ==== One-Off Actions ====
  // BzX
  ActionBzxPtokenBurnToToken: "0x0",
  ActionBzxPtokenMintWithToken: "0x0",
  // erc20
  ActionERC20Transfer: "0x0",
  ActionERC20TransferFrom: "0x0",
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
  GelatoCore: "0x0",

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

  // ==== Scripts ====
  // == GnosisSafe ==
  // Enable GelatoCore Module
  ScriptGnosisSafeEnableGelatoCore:
    "0x0",
  // Enable GelatoCore Module and Mint
  ScriptGnosisSafeEnableGelatoCoreAndMint:
    "0x0",
  // Enter the Rebalancing Chained Action
  ScriptEnterPortfolioRebalancingRinkeby:
    "0x0",
  ScriptExitRebalancePortfolioRinkeby:
    "0x0"
};
