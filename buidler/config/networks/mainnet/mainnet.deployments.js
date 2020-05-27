export const deployments = {
  // ========== MAINNET ===========
  // === Actions ===
  // erc20
  ActionERC20Transfer: "0x213719cD7c69DCA764E336bEb8D735DA01FD6c83",
  ActionERC20TransferFrom: "0x24b7b219E903d11489227c5Bed0718D90C03eBc2",

  // kyber
  ActionKyberTrade: "0xF829B506c378AaD11dB7Efe8d626cc7d0e015CBA",

  // Gnosis
  ActionPlaceOrderBatchExchange: "0x0",
  ActionWithdrawBatchExchange: "0x0",

  // ==== Gelato Core ===
  GelatoCore: "0x35bc4acd1c3dceb6e35d5d5290b83633cee09865",

  // ==== Provider Modules === Instantiated 26.05.20
  ProviderModuleGnosisSafeProxy: "0xd105f797ede92594ffc1617eb3bad7d182aedc25",

  // === Conditions ===
  // balance
  ConditionBalance: "0x60621bf3F7132838b27972084eaa56E87395D44B",
  ConditionBalanceStateful: "0x0",

  // kyber
  ConditionKyberRate: "0x1a6074a167c346949a6839a20F8211b1480444a2",
  ConditionKyberRateStateful: "0x0",

  // time
  ConditionTimestampPassed: "0x10A46c633adfe5a6719f3DBd2c162676779fE70B",
  ConditionTimeStateful: "0x0",

  // === Debugging ===
  // Conditions
  ConditionKyberRateError: "0xe0EFd26650D020cc03489D4E7FB5106E119683c8",

  // === Helpers ===
  FeeFinder: "0xa569FdBe176DA5706148b8563Cf4214F937C1Dc5",
  // === Libraries ===
  Multisend: "0x4e2ca0093028c8401c93aacccaf59288ca6fb728",
};
