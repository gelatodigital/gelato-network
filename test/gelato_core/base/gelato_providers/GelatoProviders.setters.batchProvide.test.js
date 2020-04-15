/* // running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

import initialState from "./GelatoProviders.initialState";

describe("GelatoCore - GelatoProviders - Setters: BATCH (UN)PROVIDE", function () {
  // We define the ContractFactory and Address variables here and assign them in
  // a beforeEach hook.
  let GelatoCore;

  let ConditionFactory;
  let ActionFactory;
  let OtherActionFactory;

  let ProviderModuleFactory;
  let OtherProviderModuleFactory;

  let gelatoCore;

  let executor;
  let executorAddress;

  let condition;
  let action;
  let otherAction;
  let actionStruct;
  let otherActionStruct;

  let providerModule;
  let otherProviderModule;

  let provider;
  let providerAddress;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCore = await ethers.getContractFactory("GelatoCore");
    ConditionFactory = await ethers.getContractFactory("MockConditionDummy");
    ActionFactory = await ethers.getContractFactory("MockActionDummy");
    OtherActionFactory = await ethers.getContractFactory("MockActionDummy");
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
      // isModuleProvided
      expect(
        await gelatoCore.isModuleProvided(
          providerAddress,
          providerModule.address
        )
      ).to.be.false;

      // numOfProviderModules
      expect(
        await gelatoCore.numOfProviderModules(providerAddress)
      ).to.be.equal(initialState.numOfProviderModules);

      // providerModules
      expect(
        (await gelatoCore.providerModules(providerAddress)).length
      ).to.be.equal(initialState.providerModulesLength);

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

      // numOfProviderModules
      expect(
        await gelatoCore.numOfProviderModules(providerAddress)
      ).to.be.equal(initialState.numOfProviderModules + 1);

      // providerModules
      expect(
        (await gelatoCore.providerModules(providerAddress)).length
      ).to.be.equal(1);
      expect(
        (await gelatoCore.providerModules(providerAddress))[0]
      ).to.be.equal(providerModule.address);
    });

    it("Should allow anyone to addProviderModules", async function () {
      // addProviderModules()
      await expect(
        gelatoCore.addProviderModules([
          providerModule.address,
          otherProviderModule.address,
        ])
      )
        .to.emit(gelatoCore, "LogAddProviderModule")
        .withArgs(providerAddress, providerModule.address)
        .and.to.emit(gelatoCore, "LogAddProviderModule")
        .withArgs(providerAddress, otherProviderModule.address);

      // providerModule
      // isModuleProvided
      expect(
        await gelatoCore.isModuleProvided(
          providerAddress,
          providerModule.address
        )
      ).to.be.true;

      // otherProviderModule
      // isModuleProvided
      expect(
        await gelatoCore.isModuleProvided(
          providerAddress,
          otherProviderModule.address
        )
      ).to.be.true;

      // numOfProviderModules
      expect(
        await gelatoCore.numOfProviderModules(providerAddress)
      ).to.be.equal(initialState.numOfProviderModules + 2);

      // providerModules
      expect(
        (await gelatoCore.providerModules(providerAddress)).length
      ).to.be.equal(2);
      expect(
        (await gelatoCore.providerModules(providerAddress))[0]
      ).to.be.equal(providerModule.address);
      expect(
        (await gelatoCore.providerModules(providerAddress))[1]
      ).to.be.equal(otherProviderModule.address);
    });

    it("Should NOT allow to add same modules again", async function () {
      // addProviderModules()
      await gelatoCore.addProviderModules([providerModule.address]);

      // addProviderModules revert
      await expect(
        gelatoCore.addProviderModules([providerModule.address])
      ).to.be.revertedWith("GelatoProviders.addProviderModules: redundant");

      // addProviderModules revert
      await expect(
        gelatoCore.addProviderModules([
          otherProviderModule.address,
          providerModule.address,
        ])
      ).to.be.revertedWith("GelatoProviders.addProviderModules: redundant");
    });
  });

  // removeProviderModules
  describe("GelatoCore.GelatoProviders.removeProviderModules", function () {
    it("Should allow Providers to remove a single ProviderModule", async function () {
      // addProviderModules
      await gelatoCore.addProviderModules([
        providerModule.address,
        otherProviderModule.address,
      ]);

      // removeProviderModules
      await expect(gelatoCore.removeProviderModules([providerModule.address]))
        .to.emit(gelatoCore, "LogRemoveProviderModule")
        .withArgs(providerAddress, providerModule.address);

      // providerModule: isModuleProvided
      expect(
        await gelatoCore.isModuleProvided(
          providerAddress,
          providerModule.address
        )
      ).to.be.false;

      // otherProviderModule: isModuleProvided
      expect(
        await gelatoCore.isModuleProvided(
          providerAddress,
          otherProviderModule.address
        )
      ).to.be.true;

      // numOfProviderModules
      expect(
        await gelatoCore.numOfProviderModules(providerAddress)
      ).to.be.equal(initialState.numOfProviderModules + 1);

      // providerModules
      expect(
        (await gelatoCore.providerModules(providerAddress)).length
      ).to.be.equal(1);
      expect(
        (await gelatoCore.providerModules(providerAddress))[0]
      ).to.be.equal(otherProviderModule.address);
    });

    it("Should allow Providers to removeProviderModules", async function () {
      // addProviderModules
      await gelatoCore.addProviderModules([
        providerModule.address,
        otherProviderModule.address,
      ]);

      // removeProviderModules
      await expect(
        gelatoCore.removeProviderModules([
          providerModule.address,
          otherProviderModule.address,
        ])
      )
        .to.emit(gelatoCore, "LogRemoveProviderModule")
        .withArgs(providerAddress, providerModule.address)
        .and.to.emit(gelatoCore, "LogRemoveProviderModule")
        .withArgs(providerAddress, otherProviderModule.address);

      // providerModule: isModuleProvided
      expect(
        await gelatoCore.isModuleProvided(
          providerAddress,
          providerModule.address
        )
      ).to.be.false;

      // otherProviderModule: isModuleProvided
      expect(
        await gelatoCore.isModuleProvided(
          providerAddress,
          otherProviderModule.address
        )
      ).to.be.false;

      // numOfProviderModules
      expect(
        await gelatoCore.numOfProviderModules(providerAddress)
      ).to.be.equal(initialState.numOfProviderModules);

      // providerModules
      expect(
        (await gelatoCore.providerModules(providerAddress)).length
      ).to.be.equal(0);
    });

    it("Should NOT allow Providers to remove not-provided modules", async function () {
      await expect(
        gelatoCore.removeProviderModules([providerModule.address])
      ).to.be.revertedWith("GelatoProviders.removeProviderModules: redundant");

      await expect(
        gelatoCore.removeProviderModules([
          providerModule.address,
          otherProviderModule.address,
        ])
      ).to.be.revertedWith("GelatoProviders.removeProviderModules: redundant");

      // addProviderModules
      await gelatoCore.addProviderModules([providerModule.address]);

      await expect(
        gelatoCore.removeProviderModules([otherProviderModule.address])
      ).to.be.revertedWith("GelatoProviders.removeProviderModules: redundant");

      await expect(
        gelatoCore.removeProviderModules([
          providerModule.address,
          otherProviderModule.address,
        ])
      ).to.be.revertedWith("GelatoProviders.removeProviderModules: redundant");
    });
  });
});
 */