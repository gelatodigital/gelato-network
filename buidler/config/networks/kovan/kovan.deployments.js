export const deployments = {
  // ========== KOVAN ===========
  // ==== One-Off Actions ====
  // BzX
  ActionBzxPtokenBurnToToken: "0x43dFFE6f0C2029e397Fa47DD27587Ef6297660C3",
  ActionBzxPtokenMintWithToken: "0x080d3059b30D3B7EDffa1B0B9AE981f0Ce94168E",
  // erc20
  ActionERC20Transfer: "0x213719cD7c69DCA764E336bEb8D735DA01FD6c83",
  ActionERC20TransferFrom: "0x0bd3305f42DFd1F367aADefeC12a15548bB53329",
  // kyber
  ActionKyberTradeKovan: "0xF829B506c378AaD11dB7Efe8d626cc7d0e015CBA",
  // Portfolio Mgmt
  ActionRebalancePortfolio: "0x5903825931C39d2F01C749A692E138cA8cF8d2ae",

  // ==== Actions - Chained ====
  // erc20
  ActionChainedTimedERC20TransferFrom:
    "0xb36ecc4AFe578883251c0e2D8D66416C498F3b07",
  // Portfolio Mgmt
  ActionChainedRebalancePortfolio: "0xbe19A1007A787E80852e5a914D1d559D564E5A98",

  // ===== Gelato Core ====
  GelatoCore: "0xf7aA4Fc8E6B62cB97783f4d1d232ebbA77f417E0",

  // ==== Conditions ====
  // == Balances ==
  ConditionBalance: "0xE600cA727070EE624894da9A0bc6dFA0b22A39b8",
  // == Indices ==
  // fearAndGreed
  ConditionFearGreedIndex: "0x7ce0ffd7986Ec98AD5b978CFf94e3928e89c5594",
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
    "0x5993ff30b943dE4c3fDA59d88D87d1661412D101"
};
