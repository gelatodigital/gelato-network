// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

// GelatoProviders creation time variable values
import initialStateGelatoGasPriceOracle from "../gelato_gas_price_oracle/GelatoGasPriceOracle.initialState";

describe("GelatoCore - GelatoProviders - Getters: LIQUIDITY", function () {
  // We define the ContractFactory and Address variables here and assign them in
  // a beforeEach hook.
  let GelatoCore;
  let GelatoGasPriceOracleFactory;

  let gelatoCore;
  let gelatoGasPriceOracle;

  let provider;
  let providerAddress;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCore = await ethers.getContractFactory("GelatoCore");
    GelatoGasPriceOracleFactory = await ethers.getContractFactory(
      "GelatoGasPriceOracle"
    );

    gelatoCore = await GelatoCore.deploy();
    gelatoGasPriceOracle = await GelatoGasPriceOracleFactory.deploy(
      gelatoCore.address,
      initialStateGelatoGasPriceOracle.gasPrice
    );

    await gelatoCore.deployed();
    await gelatoGasPriceOracle.deployed();

    await gelatoCore.setGelatoGasPriceOracle(gelatoGasPriceOracle.address);

    [provider] = await ethers.getSigners();
    providerAddress = await provider.getAddress();
  });

  // We test different functionality of the contract as normal Mocha tests.

  // executorAssignsExecutor
  describe("GelatoCore.GelatoProviders.executorAssignsExecutor", function () {
    it("Should reflect Providier Illiquidity after gelatoGasPrice increase", async function () {
      // minExecPoviderFunds
      const gelatoMaxGas = await gelatoCore.gelatoMaxGas();
      const gelatoGasPrice = initialStateGelatoGasPriceOracle.gasPrice;
      const minExecPoviderFunds = await gelatoCore.minExecProviderFunds(
        gelatoMaxGas,
        gelatoGasPrice
      );

      // isProviderLiquid
      expect(
        await gelatoCore.isProviderLiquid(
          providerAddress,
          gelatoMaxGas,
          gelatoGasPrice
        )
      ).to.be.false;

      // provideFunds()
      await gelatoCore.provideFunds(providerAddress, {
        value: minExecPoviderFunds,
      });

      // isProviderLiquid
      expect(
        await gelatoCore.isProviderLiquid(
          providerAddress,
          gelatoMaxGas,
          gelatoGasPrice
        )
      ).to.be.true;

      // increase gelatoGasPrice (connected executor is Owner and OracleAdmin)
      await gelatoGasPriceOracle.setGasPrice(gelatoGasPrice.add(1));
      // isProviderLiquid: after gasPrice increase
      expect(
        await gelatoCore.isProviderLiquid(
          providerAddress,
          gelatoMaxGas,
          gelatoGasPrice.add(1)
        )
      ).to.be.false;

      // Set gasPrice back and expect Provider to be liquid again
      await gelatoGasPriceOracle.setGasPrice(gelatoGasPrice);
      expect(
        await gelatoCore.isProviderLiquid(
          providerAddress,
          gelatoMaxGas,
          gelatoGasPrice
        )
      ).to.be.true;
    });

    it("Should reflect Providier Illiquidity after gelatoMaxGas increase", async function () {
      // minExecPoviderFunds
      const gelatoMaxGas = await gelatoCore.gelatoMaxGas();
      const gelatoGasPrice = initialStateGelatoGasPriceOracle.gasPrice;
      const minExecPoviderFunds = await gelatoCore.minExecProviderFunds(
        gelatoMaxGas,
        gelatoGasPrice
      );

      // isProviderLiquid
      expect(
        await gelatoCore.isProviderLiquid(
          providerAddress,
          gelatoMaxGas,
          gelatoGasPrice
        )
      ).to.be.false;

      // provideFunds()
      await gelatoCore.provideFunds(providerAddress, {
        value: minExecPoviderFunds,
      });

      // isProviderLiquid
      expect(
        await gelatoCore.isProviderLiquid(
          providerAddress,
          gelatoMaxGas,
          gelatoGasPrice
        )
      ).to.be.true;

      // increase gelatoGasPrice (connected executor is Owner)
      await gelatoCore.setGelatoMaxGas(gelatoMaxGas.add(1));
      // isProviderLiquid: after gasPrice increase
      expect(
        await gelatoCore.isProviderLiquid(
          providerAddress,
          gelatoMaxGas.add(1),
          gelatoGasPrice
        )
      ).to.be.false;

      // Set gasPrice back and expect Provider to be liquid again
      await gelatoCore.setGelatoMaxGas(gelatoMaxGas);
      expect(
        await gelatoCore.isProviderLiquid(
          providerAddress,
          gelatoMaxGas,
          gelatoGasPrice
        )
      ).to.be.true;
    });

    it("Should reflect Providier Illiquidity after executorSuccessShare increase", async function () {
      // minExecPoviderFunds
      const gelatoMaxGas = await gelatoCore.gelatoMaxGas();
      const gelatoGasPrice = initialStateGelatoGasPriceOracle.gasPrice;
      const minExecPoviderFunds = await gelatoCore.minExecProviderFunds(
        gelatoMaxGas,
        gelatoGasPrice
      );

      // isProviderLiquid
      expect(
        await gelatoCore.isProviderLiquid(
          providerAddress,
          gelatoMaxGas,
          gelatoGasPrice
        )
      ).to.be.false;

      // provideFunds()
      await gelatoCore.provideFunds(providerAddress, {
        value: minExecPoviderFunds,
      });

      // isProviderLiquid
      expect(
        await gelatoCore.isProviderLiquid(
          providerAddress,
          gelatoMaxGas,
          gelatoGasPrice
        )
      ).to.be.true;

      // increase executorSuccessShare (connected executor is Owner)
      const executorSuccessShare = await gelatoCore.executorSuccessShare();
      await gelatoCore.setExecutorSuccessShare(executorSuccessShare.add(1));

      // isProviderLiquid: after executorSuccessShare increase
      expect(
        await gelatoCore.isProviderLiquid(
          providerAddress,
          gelatoMaxGas,
          gelatoGasPrice
        )
      ).to.be.false;

      // Set executorSuccessShare back and expect Provider to be liquid again
      await gelatoCore.setExecutorSuccessShare(executorSuccessShare);
      expect(
        await gelatoCore.isProviderLiquid(
          providerAddress,
          gelatoMaxGas,
          gelatoGasPrice
        )
      ).to.be.true;
    });

    it("Should reflect Providier Illiquidity after sysAdminSuccessShare increase", async function () {
      // minExecPoviderFunds
      const gelatoMaxGas = await gelatoCore.gelatoMaxGas();
      const gelatoGasPrice = initialStateGelatoGasPriceOracle.gasPrice;
      const minExecPoviderFunds = await gelatoCore.minExecProviderFunds(
        gelatoMaxGas,
        gelatoGasPrice
      );

      // isProviderLiquid
      expect(
        await gelatoCore.isProviderLiquid(
          providerAddress,
          gelatoMaxGas,
          gelatoGasPrice
        )
      ).to.be.false;

      // provideFunds()
      await gelatoCore.provideFunds(providerAddress, {
        value: minExecPoviderFunds,
      });

      // isProviderLiquid
      expect(
        await gelatoCore.isProviderLiquid(
          providerAddress,
          gelatoMaxGas,
          gelatoGasPrice
        )
      ).to.be.true;

      // increase sysAdminSuccessShare (connected executor is Owner)
      const sysAdminSuccessShare = await gelatoCore.sysAdminSuccessShare();
      await gelatoCore.setSysAdminSuccessShare(sysAdminSuccessShare.add(1));

      // isProviderLiquid: after sysAdminSuccessShare increase
      expect(
        await gelatoCore.isProviderLiquid(
          providerAddress,
          gelatoMaxGas,
          gelatoGasPrice
        )
      ).to.be.false;

      // Set sysAdminSuccessShare back and expect Provider to be liquid again
      await gelatoCore.setSysAdminSuccessShare(sysAdminSuccessShare);
      expect(
        await gelatoCore.isProviderLiquid(
          providerAddress,
          gelatoMaxGas,
          gelatoGasPrice
        )
      ).to.be.true;
    });
  });
});
