const { utils } = require("ethers");

module.exports = [
  {
    gelatoGasPriceOracle: "0xA417221ef64b1549575C977764E651c9FAB50141",
    oracleRequestData: "0x50d25bcd",
    gelatoMaxGas: 7000000,
    internalGasRequirement: 100000,
    minExecutorStake: utils.parseEther("1"),
    executorSuccessShare: 5,
    sysAdminSuccessShare: 5,
    totalSuccessShare: 10,
  },
];
