export const deployments = {
  // ========== MAINNET ===========
  // ==== Actions ====
  // Gnosis
  ActionPlaceOrderBatchExchangeWithSlippage:
    "0xaEFe7493AF32456C3725A370A2648056c577B3EB", // verified
  ActionWithdrawBatchExchange: "0xCe9e296c85A21f34EcB55146617899E0FAFc0257", // verified
  // Kyber
  ActionKyberTrade: "",
  // Transfer
  ActionTransfer: "0xbbcC89979Bf7ee4EfA6cc40805Ab4576630ce5A9", // verified
  ActionERC20TransferFrom: "0xd8e883F5B513585c8286f616A74aB02B3789D183", // verified
  // Uniswap
  ActionUniswapTrade: "0xE2978A4018a9cca1e20136dc1c612633AdAa1435", // verified
  ActionUniswapV2Trade: "0x926Ef4Fe67B8d88d2cC2E109B6b7fae4A92cB1c1", // verified

  // ==== Conditions ====
  // == Balances ==
  ConditionBalance: "",
  ConditionBalanceStateful: "0x11c60C661cdC828c549372C9776fAAF3Ef407079", // verified
  // == Price ==
  // Kyber
  ConditionKyberRateStateful: "0x84c102ee7112F65406479ad0eFE53C327c9Fb632",
  // == Time ==
  // Timestamps
  ConditionTime: "0x63129681c487d231aa9148e1e21837165f38deaf", // verified
  ConditionTimeStateful: "0xe5c7FB0877C88923C7457a8E82713540DB5470e9", // verified
  // Gnosis
  ConditionBatchExchangeWithdrawStateful:
    "0xe8EF057fA543BD9260d2c7504B7275B7035d67D6", // verified
  // Uniswap
  ConditionUniswapV2RateStateful: "0xc4a7760dacbca3eafbafefe24d6d97cbd10e61d6", // verified

  // ===== Gelato Core ====
  GelatoCore: "0x1d681d76ce96E4d70a88A00EBbcfc1E47808d0b8", // verified

  // ==== Gelato Executors ====
  // === Modules ===
  PermissionedExecutors: "0xd70D5fb9582cC3b5B79BBFAECbb7310fd0e3B582", // verified

  // ===== Gelato Providers ====
  // == Execution ==
  GelatoActionPipeline: "0xD2540644c2B110A8f45BDE903E111fA518d41B6c", // verified
  // == Fees ==
  FeeHandlerFactory: "0xC5ca2B0Bb9E088CAe6a3D37920a37Fde29046f2b", // verified
  // == Modules ==
  // GelatoUserProxy Module
  ProviderModuleGelatoUserProxy: "0x4372692C2D28A8e5E15BC2B91aFb62f5f8812b93", // verified
  // Gnosis Safe Provider Module
  ProviderModuleGnosisSafeProxy: "0x3a994Cd3a464032B8d0eAa16F91C446A46c4fEbC", // verified
  // DS Proxy Provider Module
  ProviderModuleDSProxy: "0xc79e441740BCFB0F0187C661CE50C73d361f1C59", // verified
  // Instadapp DSA Proxy Provider Module
  ProviderModuleDSA: "0x0C25452d20cdFeEd2983fa9b9b9Cf4E81D6f2fE2", // verified

  // ===== Gelato User Proxies ====
  GelatoUserProxyFactory: "0xb0aa48f1eF1bF096140E1dA1c76D25151501608b", // verified
};
