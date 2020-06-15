export const deployments = {
  // ========== Rinkeby ===========
  // ==== One-Off Actions ====
  // Gnosis
  ActionWithdrawBatchExchange: "0xC722550615810f5433923fbdE99486A2b3BA2f69",
  ActionPlaceOrderBatchExchangeWithSlippage:
    "0x37E503e9bBC6c21983973013B87152540ab8E3E8",
  // erc20
  ActionTransfer: "0x783bD05d52B02811dECC8960aBF38A56c9Fb5F9B",
  ActionERC20TransferFrom: "0x8044580cBF68dA1b131dfA5627Bc296fb6562005",
  MockConditionDummy: "0x5803c4712f191fc565afA44eB7f8eb9e8Af057db",
  // kyber
  ActionKyberTradeRinkeby: "0x0",
  // kyber
  ActionUniswapTrade: "0xd05376F6C8FBc7AC3c987ada42f42f99187808f9",
  // Portfolio Mgmt
  ActionRebalancePortfolioRinkeby: "0x0",

  // ==== Actions - Chained ====
  // erc20
  ActionChainedTimedERC20TransferFromRinkeby: "0x0",
  // Portfolio Mgmt
  ActionChainedRebalancePortfolioRinkeby: "0x0",
  // gnosis

  // ===== Gelato Core ====
  GelatoCore: "0x733aDEf4f8346FD96107d8d6605eA9ab5645d632",
  GelatoGasPriceOracle: "0x02C0d77f2dc8C9A4c6dD3898278bEe9FAdf5dbe9",

  // ===== Gnosis Safe Provider Module ====
  ProviderModuleGnosisSafeProxy: "0x2661B579243c49988D9eDAf114Bfac5c5E249287",

  // ===== DS Proxy Provider Module ====
  ProviderModuleDsProxy: "0x0",

  // ===== Gelato User Proxies ====
  ProviderModuleGelatoUserProxy: "0x66a35534126B4B0845A2aa03825b95dFaaE88B0C",
  GelatoUserProxyFactory: "0x0309EC714C7E7c4C5B94bed97439940aED4F0624",

  // ==== Conditions ====
  // == Balances ==
  ConditionBalance: "0x29712a389E06eC7C91016932c23FcB085AF241Fb",
  ConditionBalanceStateful: "0x7c53A119BeDB06b02cd3F409F269EfC52c7834Fd",
  // == Indices ==
  // fearAndGreed
  ConditionFearGreedIndex: "0x0",
  // == Price ==
  // Kyber
  ConditionKyberRate: "0x4F2935cd565E88832721ea5465D21593894274Cd",
  ConditionKyberRateStateful: "0x0c25567D85c889F060448fC8B7830E8F677F351A",
  // == Time ==
  // Timestamps
  ConditionTime: "0x26d72d7AE606B5FCbBD0417fa112E7b4aBF05aE2",
  ConditionTimeStateful: "0xcA560E4399399016d897983206aB591CAD19169C",
  // Gnosis
  ConditionBatchExchangeWithdrawStateful:
    "0x104161052501a1C4691Bd956A896292C6CaF14Ad",

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
  FeeHandlerFactory: "0xA66Ac354507F8ED28829363B6c0c0DE380c98BAB",
  // 0.5% gelato provider => do not use for yourself
  ActionFeeHandler: "0x2394bA0b938B27B8C4DD6F84133e0DbB111C44a3",
  GelatoMultiCall: "0xE9B38c8E41DBBA738b252CD234A6c38cD5086699",
  GelatoActionPipeline: "0xD4667bd2E0478BDa3b9379e03D0ba69D86403486",
  GlobalState: "0xA88e0F76601Fd628467ea283a212ce71907f7232",
};
