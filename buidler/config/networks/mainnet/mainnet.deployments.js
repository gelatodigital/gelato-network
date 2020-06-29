export const deployments = {
  // ========== MAINNET ===========
  // === Actions ===
  // erc20
  ActionTransfer: "0xbbcc89979bf7ee4efa6cc40805ab4576630ce5a9",
  ActionERC20TransferFrom: "0xd8e883f5b513585c8286f616a74ab02b3789d183",

  // kyber
  ActionKyberTrade: "0xF829B506c378AaD11dB7Efe8d626cc7d0e015CBA",

  // Gnosis
  ActionPlaceOrderBatchExchangeWithSlippage:
    "0xaefe7493af32456c3725a370a2648056c577b3eb",
  ActionWithdrawBatchExchange: "0xce9e296c85a21f34ecb55146617899e0fafc0257",

  // Uniswap
  ActionUniswapTrade: "0xe2978a4018a9cca1e20136dc1c612633adaa1435",

  // ==== Gelato Core ===
  GelatoCore: "0x1d681d76ce96e4d70a88a00ebbcfc1e47808d0b8",
  GelatoActionPipeline: "0xd2540644c2b110a8f45bde903e111fa518d41b6c",

  // ==== Gelato User Proxy ===
  GelatoUserProxyFactory: "0xb0aa48f1ef1bf096140e1da1c76d25151501608b",

  // ==== Provider Modules === Instantiated 26.05.20
  ProviderModuleGnosisSafeProxy: "0x3a994cd3a464032b8d0eaa16f91c446a46c4febc",
  ProviderModuleGelatoUserProxy: "0x4372692c2d28a8e5e15bc2b91afb62f5f8812b93",

  // === Conditions ===
  // balance
  ConditionBalance: "0x60621bf3F7132838b27972084eaa56E87395D44B",
  ConditionBalanceStateful: "0x11c60c661cdc828c549372c9776faaf3ef407079",

  // kyber
  ConditionKyberRate: "0x1a6074a167c346949a6839a20F8211b1480444a2",
  ConditionKyberRateStateful: "0x84c102ee7112f65406479ad0efe53c327c9fb632",

  // time
  ConditionTime: "0x10A46c633adfe5a6719f3DBd2c162676779fE70B",
  ConditionTimeStateful: "0xe5c7fb0877c88923c7457a8e82713540db5470e9",

  // BatchExchange
  ConditionBatchExchangeWithdrawStateful:
    "0xe8ef057fa543bd9260d2c7504b7275b7035d67d6",

  // === Debugging ===
  // Conditions
  ConditionKyberRateError: "0xe0EFd26650D020cc03489D4E7FB5106E119683c8",

  // === Helpers ===
  FeeHandlerFactory: "0xc5ca2b0bb9e088cae6a3d37920a37fde29046f2b",
  // === Libraries ===
  Multisend: "0x4e2ca0093028c8401c93aacccaf59288ca6fb728",
};
