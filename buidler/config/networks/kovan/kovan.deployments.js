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
  ActionRebalancePortfolio: "0xB4Fa9846811309347C0B86805D96F4E171C2EFbF",

  // ==== Actions - Chained ====
  // erc20
  ActionChainedTimedERC20TransferFromKovan:
    "0xBeB2257A57Ad97a51841eBd05CB3f17a1141b2b8",
  // Portfolio Mgmt
  ActionChainedRebalancePortfolio: "0xBcB7492164066E5B5DD5D74c9Ae3c5DfbACcde69",

  // ===== Gelato Core ====
  GelatoCore: "0xeEa7e91EbDFF03432101590f976d3906b5352ef8",
  ProviderModuleGelatoUserProxy: "0xA6D02eFA927639EDAFB34A0AeC2Ebe1152a50713",

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

  // === UserProxies ===
  // == GelatoUserProxy ==
  GelatoUserProxyFactory: "0x564ca0eBa8d0717f3E5beCEB9303888C16C8AC81",

  // == GnosisSafe ==
  // Scripts
  ScriptGnosisSafeEnableGelatoCore:
    "0x99D081a6c07043e9E78A231Ae2c41fa811AD856C",
  ScriptGnosisSafeEnableGelatoCoreAndMint:
    "0x5993ff30b943dE4c3fDA59d88D87d1661412D101",
  ScriptEnterPortfolioRebalancing: "0x57de907e200B214A6A6EfA6C723891069999D2Cc",

  // === Mocks ====
  // Conditions
  MockConditionDummy: "0x16A6292aC4c568B8e70006C39ACf86fcee542Ef2",
  // = Actions =
  // One-Off
  MockActionDummy: "0xd9dC553CDCf4ff237B5D6a7025c85f7F096705B4",
  // Chained
  MockActionChainedDummy: ""
};
