export const deployments = {
  // ========== Rinkeby ===========
  // ==== Actions ====
  // Gnosis
  ActionWithdrawBatchExchange: "0xB2117E7F2eFE56636398dE9348c25F9E35b71010", // verified
  ActionPlaceOrderBatchExchangeWithSlippage:
    "0x37E503e9bBC6c21983973013B87152540ab8E3E8",
  // Kyber
  ActionKyberTrade: "",
  // Transfer
  ActionTransfer: "0x3ab7F05324c03C32460646a3C8f649Cc2Ce7E3f8", // verified
  ActionERC20TransferFrom: "0xF0247709F13681015e743Ed19363F8Fffebb05C7", // verified
  // Uniswap
  ActionUniswapTrade: "",

  // ==== Conditions ====
  // == Balances ==
  ConditionBalance: "",
  ConditionBalanceStateful: "0x7c53A119BeDB06b02cd3F409F269EfC52c7834Fd", // verified
  // == Price ==
  // Kyber
  ConditionKyberRate: "",
  ConditionKyberRateStateful: "0x0c25567D85c889F060448fC8B7830E8F677F351A", // verified
  // == Time ==
  // Timestamps
  ConditionTime: "",
  ConditionTimeStateful: "0xcA560E4399399016d897983206aB591CAD19169C", // verified
  // Gnosis
  ConditionBatchExchangeWithdrawStateful:
    "0x104161052501a1C4691Bd956A896292C6CaF14Ad", // verified

  // ===== Gelato Core ====
  GelatoCore: "0x733aDEf4f8346FD96107d8d6605eA9ab5645d632", // verified

  // ==== Gelato Executors ====
  // === Modules ===
  PermissionedExecutors: "0xa5A98a6AD379C7B578bD85E35A3eC28AD72A336b", // verified

  // ===== Gelato Providers ====
  // == Execution ==
  GelatoActionPipeline: "0xbB193c525fdB29Cdea7261452568D83AD476ed5D", // verified
  // == Fees ==
  FeeHandlerFactory: "0xA66Ac354507F8ED28829363B6c0c0DE380c98BAB",
  // == Modules ==
  // DS Proxy Provider Module
  ProviderModuleDsProxy: "",
  // GelatoUserProxy Module
  ProviderModuleGelatoUserProxy: "0x66a35534126B4B0845A2aa03825b95dFaaE88B0C", // verified
  // Gnosis Safe Provider Module
  ProviderModuleGnosisSafeProxy: "0x2661B579243c49988D9eDAf114Bfac5c5E249287", // verified

  // ===== Gelato User Proxies ====
  GelatoUserProxyFactory: "0x0309EC714C7E7c4C5B94bed97439940aED4F0624", // verified
};
