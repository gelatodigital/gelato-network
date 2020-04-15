// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

describe("GelatoCore - GelatoProviders - Setters: PROVIDER MODULES", function () {
  // We define the ContractFactory and Address variables here and assign them in
  // a beforeEach hook.
  let GelatoCore;
  let ProviderModule;
  let OtherProviderModule;

  let gelatoCore;
  let providerModule;
  let otherProviderModule;

  let provider;
  let providerAddress;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCore = await ethers.getContractFactory("GelatoCore");
    ProviderModule = await ethers.getContractFactory(
      "ProviderModuleGelatoUserProxy"
    );
    OtherProviderModule = await ethers.getContractFactory(
      "ProviderModuleGnosisSafeProxy"
    );

    gelatoCore = await GelatoCore.deploy();
    providerModule = await ProviderModule.deploy([constants.HashZero]); // hashes
    otherProviderModule = await OtherProviderModule.deploy(
      [constants.HashZero], // hashes
      [constants.AddressZero], // masterCopies
      gelatoCore.address
    );

    await gelatoCore.deployed();
    await providerModule.deployed();
    await otherProviderModule.deployed();

    [provider] = await ethers.getSigners();
    providerAddress = await provider.getAddress();
  });

  // We test different functionality of the contract as normal Mocha tests.

  // addProviderModules
  describe("GelatoCore.GelatoProviders.addProviderModules", function () {
    it("Should allow anyone to add a single provider module", async function () {
      // addProviderModules()
      await expect(gelatoCore.addProviderModules([providerModule.address]))
        .to.emit(gelatoCore, "LogAddProviderModule")
        .withArgs(providerAddress, providerModule.address);

      // isModuleProvided
      expect(
        await gelatoCore.isModuleProvided(
          providerAddress,
          providerModule.address
        )
      ).to.be.true;
    });

    // it("Should allow anyone to addProviderModules", async function () {
    //   await expect(
    //     gelatoCore.addProviderModules([providerModule.address, otherConditionAddress])
    //   )
    //     .to.emit(gelatoCore, "LogAddProviderModule")
    //     .withArgs(providerAddress, providerModule.address)
    //     .and.to.emit(gelatoCore, "LogAddProviderModule")
    //     .withArgs(providerAddress, otherConditionAddress);
    //   expect(
    //     await gelatoCore.isModuleProvided(providerAddress, providerModule.address)
    //   ).to.be.true;
    //   expect(
    //     await gelatoCore.isModuleProvided(
    //       providerAddress,
    //       otherConditionAddress
    //     )
    //   ).to.be.true;
    // });

    // it("Should NOT allow to provide same conditions again", async function () {
    //   await gelatoCore.addProviderModules([providerModule.address]);

    //   await expect(
    //     gelatoCore.addProviderModules([providerModule.address])
    //   ).to.be.revertedWith("GelatProviders.addProviderModules: redundant");

    //   await expect(
    //     gelatoCore.addProviderModules([otherConditionAddress, providerModule.address])
    //   ).to.be.revertedWith("GelatProviders.addProviderModules: redundant");
    // });
  });

  /*   // unprovideConditions
  describe("GelatoCore.GelatoProviders.unprovideConditions", function () {
    it("Should allow Providers to unprovide a single ProviderModule", async function () {
      // provideCondition
      await gelatoCore.addProviderModules([
        providerModule.address,
        otherConditionAddress,
      ]);

      // unprovideConditions
      await expect(gelatoCore.unprovideConditions([providerModule.address]))
        .to.emit(gelatoCore, "LogUnprovideCondition")
        .withArgs(providerAddress, providerModule.address);
      expect(
        await gelatoCore.isModuleProvided(providerAddress, providerModule.address)
      ).to.be.false;
      expect(
        await gelatoCore.isModuleProvided(
          providerAddress,
          otherConditionAddress
        )
      ).to.be.true;
    });

    it("Should allow Providers to unprovideConditions", async function () {
      // addProviderModules
      await gelatoCore.addProviderModules([
        providerModule.address,
        otherConditionAddress,
      ]);

      // unprovideConditions
      await expect(
        gelatoCore.unprovideConditions([
          providerModule.address,
          otherConditionAddress,
        ])
      )
        .to.emit(gelatoCore, "LogUnprovideCondition")
        .withArgs(providerAddress, providerModule.address)
        .and.to.emit(gelatoCore, "LogUnprovideCondition")
        .withArgs(providerAddress, otherConditionAddress);
      expect(
        await gelatoCore.isModuleProvided(providerAddress, providerModule.address)
      ).to.be.false;
      expect(
        await gelatoCore.isModuleProvided(
          providerAddress,
          otherConditionAddress
        )
      ).to.be.false;
    });

    it("Should NOT allow Providers to unprovide not-provided Conditions", async function () {
      await expect(
        gelatoCore.unprovideConditions([providerModule.address])
      ).to.be.revertedWith("GelatProviders.unprovideConditions: redundant");

      await expect(
        gelatoCore.unprovideConditions([
          providerModule.address,
          otherConditionAddress,
        ])
      ).to.be.revertedWith("GelatProviders.unprovideConditions: redundant");

      // addProviderModules
      await gelatoCore.addProviderModules([providerModule.address]);

      await expect(
        gelatoCore.unprovideConditions([otherConditionAddress])
      ).to.be.revertedWith("GelatProviders.unprovideConditions: redundant");

      await expect(
        gelatoCore.unprovideConditions([
          providerModule.address,
          otherConditionAddress,
        ])
      ).to.be.revertedWith("GelatProviders.unprovideConditions: redundant");
    });
  }); */
});
