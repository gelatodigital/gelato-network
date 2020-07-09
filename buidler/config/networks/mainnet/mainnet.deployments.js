export const deployments = {
  // ========== MAINNET ===========
  // ==== Actions ====
  // Gnosis
  ActionPlaceOrderBatchExchangeWithSlippage:
    "0xaEFe7493AF32456C3725A370A2648056c577B3EB",
  ActionWithdrawBatchExchange: "0xCe9e296c85A21f34EcB55146617899E0FAFc0257",
  // Kyber
  ActionKyberTrade: "0x0",
  // Provider
  // 0.5% gelato provider => do not use for yourself
  ActionFeeHandler: "",
  // Transfer
  ActionTransfer: "0xbbcC89979Bf7ee4EfA6cc40805Ab4576630ce5A9",
  ActionERC20TransferFrom: "0xd8e883F5B513585c8286f616A74aB02B3789D183",
  // Uniswap
  ActionUniswapTrade: "0xE2978A4018a9cca1e20136dc1c612633AdAa1435",

  // ==== Conditions ====
  // == Balances ==
  ConditionBalance: "",
  ConditionBalanceStateful: "0x11c60C661cdC828c549372C9776fAAF3Ef407079",
  // == Price ==
  // Kyber
  ConditionKyberRate: "",
  ConditionKyberRateStateful: "0x84c102ee7112F65406479ad0eFE53C327c9Fb632",
  // == Time ==
  // Timestamps
  ConditionTime: "",
  ConditionTimeStateful: "0xe5c7FB0877C88923C7457a8E82713540DB5470e9",
  // Gnosis
  ConditionBatchExchangeWithdrawStateful:
    "0xe8EF057fA543BD9260d2c7504B7275B7035d67D6",

  // ===== Gelato Core ====
  GelatoCore: "0x1d681d76ce96E4d70a88A00EBbcfc1E47808d0b8",

  // ==== Gelato Executors ====
  // === Modules ===
  PermissionedExecutors: "",
  // Helpers
  GelatoMultiCall: "0xb9bd403254b3eb365c4ea1dbbb3fe6fe6ab6007c",

  // ===== Gelato Providers ====
  // == Execution ==
  GelatoActionPipeline: "0xD2540644c2B110A8f45BDE903E111fA518d41B6c",
  // == Fees ==
  FeeHandlerFactory: "0xC5ca2B0Bb9E088CAe6a3D37920a37Fde29046f2b",
  // == Modules ==
  // DS Proxy Provider Module
  ProviderModuleDsProxy: "",
  // GelatoUserProxy Module
  ProviderModuleGelatoUserProxy: "0x4372692C2D28A8e5E15BC2B91aFb62f5f8812b93",
  // Gnosis Safe Provider Module
  ProviderModuleGnosisSafeProxy: "0x3a994Cd3a464032B8d0eAa16F91C446A46c4fEbC",

  // ===== Gelato User Proxies ====
  GelatoUserProxyFactory: "0xb0aa48f1eF1bF096140E1dA1c76D25151501608b",
};
