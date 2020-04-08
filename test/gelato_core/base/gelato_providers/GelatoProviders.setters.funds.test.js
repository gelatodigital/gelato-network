// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

// GelatoProviders creation time variable values
import initialState from "./GelatoProviders.initialState";

describe("GelatoCore - GelatoProviders - Setters: FUNDS", function () {
  // We define the ContractFactory and Address variables here and assign them in
  // a beforeEach hook.
  let GelatoCore;
  let gelatoCore;
  let provider;
  let providerAddress;
  let otherProvider;
  let otherProviderAddress;
  let executor;
  let executorAddress;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCore = await ethers.getContractFactory("GelatoCore");
    gelatoCore = await GelatoCore.deploy();
    await gelatoCore.deployed();
    [provider, otherProvider, executor] = await ethers.getSigners();
    providerAddress = await provider.getAddress();
    otherProviderAddress = await otherProvider.getAddress();
    executorAddress = await executor.getAddress();
  });

  // We test different functionality of the contract as normal Mocha tests.

  // provideFunds
  describe("GelatoCore.GelatoProviders.provideFunds", function () {
    it("Should allow anyone to provideFunds to their own provider", async function () {
      await expect(gelatoCore.provideFunds(providerAddress, { value: 69420 }))
        .to.emit(gelatoCore, "LogProvideFunds")
        .withArgs(providerAddress, 69420, 69420);
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
        69420
      );

      await expect(
        gelatoCore
          .connect(otherProvider)
          .provideFunds(otherProviderAddress, { value: 42069 })
      )
        .to.emit(gelatoCore, "LogProvideFunds")
        .withArgs(otherProviderAddress, 42069, 42069);
      expect(await gelatoCore.providerFunds(otherProviderAddress)).to.be.equal(
        42069
      );
    });

    it("Shouldn't allow provideFunds(value: 0)", async function () {
      await expect(
        gelatoCore.provideFunds(providerAddress, { value: "0" })
      ).to.be.revertedWith("GelatoProviders.provideFunds: zero value");
    });
  });

  // unprovideFunds
  describe("GelatoCore.GelatoProviders.unprovideFunds", function () {
    it("Should allow providers to unprovide their funds", async function () {
      // provideFunds
      await expect(gelatoCore.provideFunds(providerAddress, { value: 69420 }))
        .to.emit(gelatoCore, "LogProvideFunds")
        .withArgs(providerAddress, 69420, 69420);
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
        69420
      );

      // unprovideFunds
      await expect(gelatoCore.unprovideFunds(69420))
        .to.emit(gelatoCore, "LogUnprovideFunds")
        .withArgs(providerAddress, 69420, 0);
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(0);

      // otherProvider: provideFunds
      await expect(
        gelatoCore
          .connect(otherProvider)
          .provideFunds(otherProviderAddress, { value: 42069 })
      )
        .to.emit(gelatoCore, "LogProvideFunds")
        .withArgs(otherProviderAddress, 42069, 42069);
      expect(await gelatoCore.providerFunds(otherProviderAddress)).to.be.equal(
        42069
      );

      // otherProvider: unprovideFunds
      await expect(gelatoCore.connect(otherProvider).unprovideFunds(69))
        .to.emit(gelatoCore, "LogUnprovideFunds")
        .withArgs(otherProviderAddress, 69, 42000);
      expect(await gelatoCore.providerFunds(otherProviderAddress)).to.be.equal(
        42000
      );
    });

    it("Should automatically unprovideFunds(all) if surplus withdrawamount", async function () {
      // provideFunds
      await expect(gelatoCore.provideFunds(providerAddress, { value: 69420 }))
        .to.emit(gelatoCore, "LogProvideFunds")
        .withArgs(providerAddress, 69420, 69420);
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
        69420
      );

      // unprovideFunds
      await expect(gelatoCore.unprovideFunds(999999999999))
        .to.emit(gelatoCore, "LogUnprovideFunds")
        .withArgs(providerAddress, 69420, 0);
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(0);
    });
  });
});
