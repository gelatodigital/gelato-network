export const deployments = {
  // ========== Rinkeby ===========
  // ==== One-Off Actions ====
  // Gnosis
  ActionWithdrawBatchExchange: "0x42D9F0f681B6eb79fA9e198De106c3aFabA58244",
  ActionPlaceOrderBatchExchange: "0x65a12D50C31834a27d686F827C4bF51e6319F629",
  // erc20
  ActionERC20Transfer: "0x0",
  ActionERC20TransferFrom: "0xF5A7803c32CC4ba874e8c8CF19a998057a2edc79",
  ActionERC20TransferFromGlobal: "0xA67F96aF54D683748A633A2f94e6725002C2c957",
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

  // ===== Gelato Core ====
  GelatoCore: "0x0c6403798c5D198CB80A0bDEd7610fC32278F4D0",
  GelatoGasPriceOracle: "0x02C0d77f2dc8C9A4c6dD3898278bEe9FAdf5dbe9",

  // ===== Gnosis Safe Provider Module ====
  ProviderModuleGnosisSafeProxy: "0x7EB9918cDA7B1767EC87fFE57c4d1e10559f8451",

  // ===== DS Proxy Provider Module ====
  ProviderModuleDsProxy: "0x0",

  // ===== Gelato User Proxies ====
  ProviderModuleGelatoUserProxy: "0xF799aBB08878983c70b1AF1e1c9cA3eC7b81a440",
  GelatoUserProxyFactory: "0x68D88B044F83Aa0B4EF6AFB24C556Cf35Ea24521",

  // ==== Conditions ====
  // == Balances ==
  ConditionBalance: "0x29712a389E06eC7C91016932c23FcB085AF241Fb",
  ConditionBalanceStateful: "0x5aeA21Bcd80529727D009e094BEeBD6A186E6585",
  // == Indices ==
  // fearAndGreed
  ConditionFearGreedIndex: "0x0",
  // == Price ==
  // Kyber
  ConditionKyberRate: "0x4F2935cd565E88832721ea5465D21593894274Cd",
  ConditionKyberRateStateful: "0x6e9A985027ffa649d4AC4A54555DFf19DDA1b257",
  // == Time ==
  // Timestamps
  ConditionTimestampPassed: "0x26d72d7AE606B5FCbBD0417fa112E7b4aBF05aE2",
  ConditionTimeStateful: "0x156CEd6aa95b88aC146cafc1fF538717C8853D73",
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
  GelatoMultiCall: "0xaf0124440ce473705465208C2B687A8D009E2EaE",
  GlobalState: "0xA88e0F76601Fd628467ea283a212ce71907f7232",
  ProviderFeeRelay: "0x28A68e773511Fe3Ac7f1757b94aD2BD7254b1e89",
  ProviderFeeRelayFactory: "0xc324a108E0053EBCFB2bf9f9704F555c63a78455",
};
