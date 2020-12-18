export const deployments = {
  // ========== Rinkeby ===========
  // ==== Actions ====
  // Gnosis
  ActionWithdrawBatchExchange: "0xB2117E7F2eFE56636398dE9348c25F9E35b71010", // verified
  ActionPlaceOrderBatchExchangeWithSlippage:
    "0x37E503e9bBC6c21983973013B87152540ab8E3E8",
  ActionPlaceOrderBatchExchangeWithSlippage:
    "0x7fb6baBF2F215718e3A7CE7205BdA9ae5F8E45ca", // verified
  // Kyber
  ActionKyberTrade: "0x605e0d68996a110E516271884bdc93a574eBD89a", // verified
  // Transfer
  ActionTransfer: "0x3ab7F05324c03C32460646a3C8f649Cc2Ce7E3f8", // verified
  ActionERC20TransferFrom: "0xF0247709F13681015e743Ed19363F8Fffebb05C7", // verified
  // Uniswap
  ActionUniswapTrade: "",
  // Conditional Tokens
  ActionWithdrawLiquidity: "0x101F34DD8B3B831E1579D5Cb62221bbdA11186A2",
  // Uniswap V2
  ActionUniswapV2Trade: "0x772Dbc59821d60e149B51FD2dc91D19767D6690A", // verified
  ActionSubmitTask: "0x460aCeba30f25c5274Ca7A2E0dC00e8f296E14b3",

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
  ConditionTime: "0xC92Bc7c905d52B4bC4d60719a8Bce3B643d77daF", // verified
  ConditionTimeStateful: "0xcA560E4399399016d897983206aB591CAD19169C", // verified
  // Gnosis
  ConditionBatchExchangeWithdrawStateful:
    "0x104161052501a1C4691Bd956A896292C6CaF14Ad", // verified
  // uniswap v2
  ConditionUniswapV2Rate: "0x0ea40cDCc9Dc2CF4862fed28196e3eD0a9e3c5e9", // verified
  ConditionUniswapV2RateStateful: "0x0E9C01D0f7ddA51acEF03534490ec91a9975C4dB", // verified

  // ===== Gelato Core ====
  GelatoCore: "0x733aDEf4f8346FD96107d8d6605eA9ab5645d632", // verified

  // ==== Gelato Executors ====
  // === Modules ===
  PermissionedExecutors: "0xa5A98a6AD379C7B578bD85E35A3eC28AD72A336b", // verified

  // ===== Gelato Providers ====
  // == Execution ==
  GelatoActionPipeline: "0xbB193c525fdB29Cdea7261452568D83AD476ed5D", // verified

  // == Fees ==
  FeeHandlerFactory: "0x1932abE45473c9C610596124372D73a81E02AECD", // verified

  // == Modules ==
  // DS Proxy Provider Module
  ProviderModuleDsProxy: "0x4a084D6C97B72eae3cE7702f1B93a9D5DFF1B454", // verified

  // === GelatoHelpers ===
  GelatoAddressStorage: "0xaFc624CEb51BC7198C66E6e582d0cEe924Fa73Dd", // verified

  // GelatoUserProxy Module
  ProviderModuleGelatoUserProxy: "0x66a35534126B4B0845A2aa03825b95dFaaE88B0C", // verified

  // Gnosis Safe Provider Module
  ProviderModuleGnosisSafeProxy: "0x28ec977614E3cA9Ac4a5A48f44e8BDD9232ba21f", // verified

  // ===== Gelato User Proxies ====
  GelatoUserProxyFactory: "0x0309EC714C7E7c4C5B94bed97439940aED4F0624", // verified
};
