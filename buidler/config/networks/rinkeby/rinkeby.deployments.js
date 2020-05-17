export const deployments = {
  // ========== Rinkeby ===========
  // ==== One-Off Actions ====
  // Gnosis
  ActionWithdrawBatchExchange: "0xE52D98E9ce5eaB002860D79cD837c5d7C1258fcC",
  ActionPlaceOrderBatchExchange: "0x97C2068714F7B5359da8cC3D05b6E6D8019b582c",
  // erc20
  ActionERC20Transfer: "0x0",
  ActionERC20TransferFrom: "0xF5A7803c32CC4ba874e8c8CF19a998057a2edc79",
  MockConditionDummy: "0x5803c4712f191fc565afA44eB7f8eb9e8Af057db",
  // kyber
  ActionKyberTradeRinkeby: "0x0",
  // kyber
  ActionUniswapTrade: "0xB61fD88169cF0734e5274a886BDB3E90466f1d28",
  // Portfolio Mgmt
  ActionRebalancePortfolioRinkeby: "0x0",

  // ==== Actions - Chained ====
  // erc20
  ActionChainedTimedERC20TransferFromRinkeby: "0x0",
  // Portfolio Mgmt
  ActionChainedRebalancePortfolioRinkeby: "0x0",
  // gnosis
  ActionPlaceOrderBatchExchangePayFee:
    "0xA66Dc4AacF4D23118ce148474d349b75a6A4E3C8",
  ActionWithdrawBatchExchangeChained:
    "0x407E41940DDcEB42F3cC73d3A446CF39012334Db",
  ActionPlaceOrderBatchExchangeChained:
    "0xF536876f81A8504609C13069615647F0A6CAe2F1",

  // ===== Gelato Core ====
  GelatoCore: "0xE7418743527a8e5F191bA4e9609b5914c9880a12",
  GelatoGasPriceOracle: "0x02C0d77f2dc8C9A4c6dD3898278bEe9FAdf5dbe9",

  // ===== Gnosis Safe Provider Module ====
  ProviderModuleGnosisSafeProxy: "0x0b03cE8fAb9a5a0D8fe2F641264ed61B7c6b1852",
  ProviderModuleDsProxy: "0x0",

  // ===== Gelato User Proxies ====
  ProviderModuleGelatoUserProxy: "0x544394229F2B98751fF56872D0294D7a816d60a9",
  GelatoUserProxyFactory: "0x1EC08134313c9e7E5EFcd7f2d7Fca2d21f40b8F4",

  // ==== Conditions ====
  // == Balances ==
  ConditionBalance: "0x29712a389E06eC7C91016932c23FcB085AF241Fb",
  ConditionBalanceStateful: "0x0A5Cb504e4684E8F730F582AB9b9AA671115e60C",
  // == Indices ==
  // fearAndGreed
  ConditionFearGreedIndex: "0x0",
  // == Price ==
  // Kyber
  ConditionKyberRate: "0x4F2935cd565E88832721ea5465D21593894274Cd",
  // == Time ==
  // Timestamps
  ConditionTimestampPassed: "0x0",
  ConditionTimeStateful: "0xd646C368e5967001f273b5D0528CD8980a14f9b9",
  // Gnosis
  ConditionBatchExchangeFundsWithdrawable:
    "0x66A11882E861B85685668fB3e72a7c6b74753352",

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
  FeeExtractor: "0x9b625d0aC057450E67B7e3B6e17633AcF01Fe2a9",
};
