export const deployments = {
  // ========== KOVAN ===========
  // ==== One-Off Actions ====
  // BzX
  ActionBzxPtokenBurnToToken: "0x43dFFE6f0C2029e397Fa47DD27587Ef6297660C3",
  ActionBzxPtokenMintWithToken: "0x080d3059b30D3B7EDffa1B0B9AE981f0Ce94168E",
  // erc20
  ActionERC20Transfer: "0x213719cD7c69DCA764E336bEb8D735DA01FD6c83",
  ActionERC20TransferFrom: "0xC46095e97F1C0756b852EaE04f4D5De301351113",
  // kyber
  ActionKyberTradeKovan: "0xF829B506c378AaD11dB7Efe8d626cc7d0e015CBA",
  // Portfolio Mgmt
  ActionRebalancePortfolioKovan: "0xCb6Ff084d8efA2A1Fd987566E60d454CF2473E4B",

  // ==== Actions - Chained ====
  // erc20
  ActionChainedTimedERC20TransferFromKovan:
    "0x9Ba17D7D573f79e7663C8758d484A1D2D35Cf762",
  // Portfolio Mgmt
  ActionChainedRebalancePortfolioKovan:
    "0xA4B6e3cAeD6280015925889092D802E556786385",

  // ===== Gelato Core ====
  GelatoCore: "0x40134bf777a126B0E6208e8BdD6C567F2Ce648d2",

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
    "0x99D081a6c07043e9E78A231Ae2c41fa811AD856C",
  // Enable GelatoCore Module and Mint
  ScriptGnosisSafeEnableGelatoCoreAndMint:
    "0x5993ff30b943dE4c3fDA59d88D87d1661412D101",
  // Enter the Rebalancing Chained Action
  ScriptEnterPortfolioRebalancingKovan:
    "0x57de907e200B214A6A6EfA6C723891069999D2Cc",
  ScriptExitRebalancePortfolioKovan:
    "0x1b3f567c4a6f064FE770498F734C4C25F4C0239e"
};
