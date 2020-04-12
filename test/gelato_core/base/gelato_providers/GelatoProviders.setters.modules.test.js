// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

describe("GelatoCore - GelatoProviders - Setters: CONDITIONS", function () {
  // We define the ContractFactory and Address variables here and assign them in
  // a beforeEach hook.
  let GelatoCore;
  let ProviderModule;
  let OtherProviderModule;
  let gelatoCore;
  let provider;
  let providerAddress;
  let module;
  let conditionAddress;
  let otherCondition;
  let otherConditionAddress;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCore = await ethers.getContractFactory("GelatoCore");
    ProviderModule = await ethers.getContractFactory("ConditionTimestampPassed");
    OtherProviderModule = await ethers.getContractFactory("MockConditionDummy");
    gelatoCore = await GelatoCore.deploy();
    condition = await ProviderModule.deploy();
    otherCondition = await OtherProviderModule.deploy();
    await gelatoCore.deployed();
    await condition.deployed();
    await otherCondition.deployed();
    conditionAddress = condition.address;
    otherConditionAddress = otherCondition.address;

    [provider] = await ethers.getSigners();
    providerAddress = await provider.getAddress();
  });

  // We test different functionality of the contract as normal Mocha tests.

  // provideConditions
  describe("GelatoCore.GelatoProviders.provideConditions", function () {
    it("Should allow anyone to provide a single condition", async function () {
      await expect(gelatoCore.provideConditions([conditionAddress]))
        .to.emit(gelatoCore, "LogProvideCondition")
        .withArgs(providerAddress, conditionAddress);
      expect(
        await gelatoCore.isConditionProvided(providerAddress, conditionAddress)
      ).to.be.true;
    });

    it("Should allow anyone to provideConditions", async function () {
      await expect(
        gelatoCore.provideConditions([conditionAddress, otherConditionAddress])
      )
        .to.emit(gelatoCore, "LogProvideCondition")
        .withArgs(providerAddress, conditionAddress)
        .and.to.emit(gelatoCore, "LogProvideCondition")
        .withArgs(providerAddress, otherConditionAddress);
      expect(
        await gelatoCore.isConditionProvided(providerAddress, conditionAddress)
      ).to.be.true;
      expect(
        await gelatoCore.isConditionProvided(
          providerAddress,
          otherConditionAddress
        )
      ).to.be.true;
    });

    it("Should NOT allow to provide same conditions again", async function () {
      await gelatoCore.provideConditions([conditionAddress]);

      await expect(
        gelatoCore.provideConditions([conditionAddress])
      ).to.be.revertedWith("GelatProviders.provideConditions: redundant");

      await expect(
        gelatoCore.provideConditions([otherConditionAddress, conditionAddress])
      ).to.be.revertedWith("GelatProviders.provideConditions: redundant");
    });
  });

  // unprovideConditions
  describe("GelatoCore.GelatoProviders.unprovideConditions", function () {
    it("Should allow Providers to unprovide a single ProviderModule", async function () {
      // provideCondition
      await gelatoCore.provideConditions([
        conditionAddress,
        otherConditionAddress,
      ]);

      // unprovideConditions
      await expect(gelatoCore.unprovideConditions([conditionAddress]))
        .to.emit(gelatoCore, "LogUnprovideCondition")
        .withArgs(providerAddress, conditionAddress);
      expect(
        await gelatoCore.isConditionProvided(providerAddress, conditionAddress)
      ).to.be.false;
      expect(
        await gelatoCore.isConditionProvided(
          providerAddress,
          otherConditionAddress
        )
      ).to.be.true;
    });

    it("Should allow Providers to unprovideConditions", async function () {
      // provideConditions
      await gelatoCore.provideConditions([
        conditionAddress,
        otherConditionAddress,
      ]);

      // unprovideConditions
      await expect(
        gelatoCore.unprovideConditions([
          conditionAddress,
          otherConditionAddress,
        ])
      )
        .to.emit(gelatoCore, "LogUnprovideCondition")
        .withArgs(providerAddress, conditionAddress)
        .and.to.emit(gelatoCore, "LogUnprovideCondition")
        .withArgs(providerAddress, otherConditionAddress);
      expect(
        await gelatoCore.isConditionProvided(providerAddress, conditionAddress)
      ).to.be.false;
      expect(
        await gelatoCore.isConditionProvided(
          providerAddress,
          otherConditionAddress
        )
      ).to.be.false;
    });

    it("Should NOT allow Providers to unprovide not-provided Conditions", async function () {
      await expect(
        gelatoCore.unprovideConditions([conditionAddress])
      ).to.be.revertedWith("GelatProviders.unprovideConditions: redundant");

      await expect(
        gelatoCore.unprovideConditions([
          conditionAddress,
          otherConditionAddress,
        ])
      ).to.be.revertedWith("GelatProviders.unprovideConditions: redundant");

      // provideConditions
      await gelatoCore.provideConditions([conditionAddress]);

      await expect(
        gelatoCore.unprovideConditions([otherConditionAddress])
      ).to.be.revertedWith("GelatProviders.unprovideConditions: redundant");

      await expect(
        gelatoCore.unprovideConditions([
          conditionAddress,
          otherConditionAddress,
        ])
      ).to.be.revertedWith("GelatProviders.unprovideConditions: redundant");
    });
  });
});
