export const deployments = {
  // ========== Rinkeby ===========
  // ==== One-Off Actions ====
  // Gnosis
  ActionWithdrawBatchExchange: "0x7F1272976731DdaE91dc74490E8d0aD78731AA55",
  ActionPlaceOrderBatchExchange: "0x89f742D8c707a1AD1bF00F7EAD19D57533dD9bDa",
  // erc20
  ActionTransfer: "0x74d218AB6C5F743B476c6d3ac713e271D56aC19D",
  ActionERC20TransferFrom: "0x42c5d0aA55990a4f56b1BB3Df21B07D54B5c9fa5",
  MockConditionDummy: "0x5803c4712f191fc565afA44eB7f8eb9e8Af057db",
  // kyber
  ActionKyberTradeRinkeby: "0x0",
  // kyber
  ActionUniswapTrade: "0xBE9B42af62cb3a5971df3B71a6a77319189e2254",
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

  // ===== Gelato Core ====
  GelatoCore: "0xF4aA17A05598e85480AA913C7DF0bAaD893Ac038",
  GelatoGasPriceOracle: "0x02C0d77f2dc8C9A4c6dD3898278bEe9FAdf5dbe9",

  // ===== Gnosis Safe Provider Module ====
  ProviderModuleGnosisSafeProxy: "0x10A6e604e1Ae71CF84E79563c76FDF8b48C84a6D",

  // ===== DS Proxy Provider Module ====
  ProviderModuleDsProxy: "0x0",

  // ===== Gelato User Proxies ====
  ProviderModuleGelatoUserProxy: "0x6568F2e419991E3DCB065e75d4C1A2F58e50A819",
  GelatoUserProxyFactory: "0xecB15735289D1bc17b66A20857550644E86CF11d",

  // ==== Conditions ====
  // == Balances ==
  ConditionBalance: "0x29712a389E06eC7C91016932c23FcB085AF241Fb",
  ConditionBalanceStateful: "0x8aDd18be538DA9dEfB1dea7D6cb17426011119C6",
  // == Indices ==
  // fearAndGreed
  ConditionFearGreedIndex: "0x0",
  // == Price ==
  // Kyber
  ConditionKyberRate: "0x4F2935cd565E88832721ea5465D21593894274Cd",
  ConditionKyberRateStateful: "0x9E2963137B836dBe3e5b04cf38CC985bd3C1a0aC",
  // == Time ==
  // Timestamps
  ConditionTime: "0x26d72d7AE606B5FCbBD0417fa112E7b4aBF05aE2",
  ConditionTimeStateful: "0xAaB4fF152C1591017764BEaD313a5748E556A0f7",
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
  FeeHandlerFactory: "0xAAe0CD8e5Aa05fA49a87F98E9B52dC02c2Efc194",
  GelatoMultiCall: "0xaf0124440ce473705465208C2B687A8D009E2EaE",
  GlobalState: "0xA88e0F76601Fd628467ea283a212ce71907f7232",
  ProviderFeeRelay: "0x28A68e773511Fe3Ac7f1757b94aD2BD7254b1e89",
  ProviderFeeRelayFactory: "0xc324a108E0053EBCFB2bf9f9704F555c63a78455",
};
