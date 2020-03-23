export const deployments = {
  // ========== KOVAN ===========
  // ==== One-Off Actions ====
  // Gnosis
  ActionWithdrawBatchExchangeRinkeby: "0x0",
  // BzX
  ActionBzxPtokenBurnToToken: "0x43dFFE6f0C2029e397Fa47DD27587Ef6297660C3",
  ActionBzxPtokenMintWithToken: "0x080d3059b30D3B7EDffa1B0B9AE981f0Ce94168E",
  // erc20
  ActionERC20Transfer: "0x213719cD7c69DCA764E336bEb8D735DA01FD6c83",
  ActionERC20TransferFrom: "0xC46095e97F1C0756b852EaE04f4D5De301351113",
  // kyber
  ActionKyberTradeKovan: "0xF829B506c378AaD11dB7Efe8d626cc7d0e015CBA",
  // Portfolio Mgmt
  ActionRebalancePortfolioKovan: "0x66ba11147695bf8d502c56a84ff0Bc132D362C75",

  // ==== Actions - Chained ====
  // erc20
  ActionChainedTimedERC20TransferFromKovan:
    "0x9Ba17D7D573f79e7663C8758d484A1D2D35Cf762",
  // Portfolio Mgmt
  ActionChainedRebalancePortfolioKovan:
    "0x6199B69Fa71BDA8865CF0226ab464cE596ee10c0",

  // ===== Gelato Core ====
  GelatoCore: "0x4e4f3d95CC4920f1D6e8fb433a9Feed3C8f3CC31",

  // ==== Conditions ====
  // == Balances ==
  ConditionBalance: "0xE600cA727070EE624894da9A0bc6dFA0b22A39b8",
  // == Indices ==
  // fearAndGreed
  ConditionFearGreedIndex: "0xf5aF30e4022698314e07514CE649fa7f45Cc8F87",
  // == Price ==
  // Kyber
  ConditionKyberRateKovan: "0x7830FC46fB5Bc4E2036bE841a735308AbFfCa1DF",
  // == Time ==
  // Timestamps
  ConditionTimestampPassed: "0xbd2938223d6c26BC592b82FbdD62DF19a3FE79DF",

  // ==== Scripts ====
  // == GnosisSafe ==
  // Enable GelatoCore Module
  ScriptGnosisSafeEnableGelatoCore:
    "0x08954d0d87D2169CA4051AA612537eEDf6E6DCb4",
  // Enable GelatoCore Module and Mint
  ScriptGnosisSafeEnableGelatoCoreAndMint:
    "0x5993ff30b943dE4c3fDA59d88D87d1661412D101",
  // Enter the Rebalancing Chained Action
  ScriptEnterPortfolioRebalancingKovan:
    "0x882E8963F45B7bC1E817B6Dca43916ca343b92F9",
  ScriptExitRebalancePortfolioKovan:
    "0xc5006243ac1AbF38f0536272408B1F6E3f96933d"
};
