// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

import initialState from "./GelatoProviders.initialState";

describe("GelatoCore - GelatoProviders - Setters: BATCH UNPROVIDE", function () {
  // We define the ContractFactory and Address variables here and assign them in
  // a beforeEach hook.
  let GelatoCore;

  let ConditionFactory;
  let ActionFactory;
  let OtherActionFactory;

  let ProviderModuleFactory;
  let OtherProviderModuleFactory;

  let gelatoCore;

  let condition;
  let action;
  let otherAction;
  let actionStruct;
  let otherActionStruct;
  const gasPriceCeil = utils.parseUnits("20", "gwei");

  let cam;
  let otherCAM;

  let providerModule;
  let otherProviderModule;

  let provider;
  let executor;
  let providerAddress;
  let executorAddress;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCore = await ethers.getContractFactory("GelatoCore");

    ConditionFactory = await ethers.getContractFactory("MockConditionDummy");
    ActionFactory = await ethers.getContractFactory("MockActionDummy");
    OtherActionFactory = await ethers.getContractFactory("MockActionDummy");

    ProviderModuleFactory = await ethers.getContractFactory(
      "ProviderModuleGelatoUserProxy"
    );
    OtherProviderModuleFactory = await ethers.getContractFactory(
      "ProviderModuleGnosisSafeProxy"
    );

    gelatoCore = await GelatoCore.deploy();

    condition = await ConditionFactory.deploy();
    action = await ActionFactory.deploy();
    otherAction = await OtherActionFactory.deploy();

    providerModule = await ProviderModuleFactory.deploy([constants.HashZero]); // hashes
    otherProviderModule = await OtherProviderModuleFactory.deploy(
      [constants.HashZero], // hashes
      [constants.AddressZero], // masterCopies
      gelatoCore.address
    );

    await gelatoCore.deployed();

    await condition.deployed();
    await action.deployed();
    await otherAction.deployed();

    await providerModule.deployed();
    await otherProviderModule.deployed();

    [provider, executor] = await ethers.getSigners();
    providerAddress = await provider.getAddress();
    executorAddress = await executor.getAddress();

    // Action
    actionStruct = new Action({
      inst: action.address,
      data: "0xdeadbeef",
      operation: Operation.Delegatecall,
      termsOkCheck: false,
    });
    otherActionStruct = new Action({
      inst: otherAction.address,
      data: "0xdeadbeef",
      operation: Operation.Delegatecall,
      termsOkCheck: true,
    });

    // Condition Action Mix
    cam = new CAM({
      condition: condition.address,
      actions: [actionStruct],
      gasPriceCeil,
    });

    otherCAM = new CAM({
      condition: condition.address,
      actions: [actionStruct, otherActionStruct],
      gasPriceCeil,
    });
  });

  // We test different functionality of the contract as normal Mocha tests.

  // removeProviderModules
  describe("GelatoCore.GelatoProviders.batchUnprovide", function () {
    it("Should allow Providers to batchUnprovide", async function () {
      // minProviderStake required for providerAssignsExecutor
      const minProviderStake = await gelatoCore.minProviderStake();

      // minExecutorStake needed for providerAssignsExecutor()
      const minExecutorStake = await gelatoCore.minExecutorStake();
      // stakeExecutor()
      await gelatoCore
        .connect(executor)
        .stakeExecutor({ value: minExecutorStake });

      // camHash
      const camHash = await gelatoCore.camHash(cam.condition, cam.actions);
      // otherCAMHash
      const otherCAMHash = await gelatoCore.camHash(
        otherCAM.condition,
        otherCAM.actions
      );

      // batchProvide()
      await gelatoCore.batchProvide(
        executorAddress,
        [cam, otherCAM],
        [providerModule.address, otherProviderModule.address],
        { value: minProviderStake }
      );

      expect(await gelatoCore.isExecutorAssigned(executorAddress)).to.be.true;

      // batchUnprovide revert: Must un-assign executor first
      await expect(
        gelatoCore.batchUnprovide(
          minProviderStake,
          [cam, otherCAM],
          [providerModule.address, otherProviderModule.address]
        )
      ).to.be.revertedWith(
        "GelatoProviders.unprovideFunds: Must un-assign executor first"
      );

      // unassign executor
      await gelatoCore.providerAssignsExecutor(constants.AddressZero);

      expect(await gelatoCore.isExecutorAssigned(executorAddress)).to.be.false;

      // batchUnprovide()
      await expect(
        gelatoCore.batchUnprovide(
          minProviderStake,
          [cam, otherCAM],
          [providerModule.address, otherProviderModule.address]
        )
      )
        // LogUnprovideFunds
        .to.emit(gelatoCore, "LogUnprovideFunds")
        .withArgs(providerAddress, minProviderStake, 0)
        // LogUnprovideCAM
        .and.to.emit(gelatoCore, "LogUnprovideCAM")
        .withArgs(providerAddress, camHash)
        .and.to.emit(gelatoCore, "LogUnprovideCAM")
        .withArgs(providerAddress, otherCAMHash)
        // LogRemoveProviderModule
        .and.to.emit(gelatoCore, "LogRemoveProviderModule")
        .withArgs(providerAddress, providerModule.address)
        .and.to.emit(gelatoCore, "LogRemoveProviderModule")
        .withArgs(providerAddress, otherProviderModule.address);

      // providerFunds
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
        initialState.providerFunds
      );
      // cam
      // camGPC
      expect(await gelatoCore.camGPC(providerAddress, camHash)).to.be.equal(
        initialState.camGPC
      );

      // isCAMProvided
      expect(
        await gelatoCore.isCAMProvided(providerAddress, condition.address, [
          actionStruct,
        ])
      ).to.be.equal("ConditionActionsMixNotProvided");

      // otherCAM
      // camGPC
      expect(
        await gelatoCore.camGPC(providerAddress, otherCAMHash)
      ).to.be.equal(initialState.camGPC);

      // isCAMProvided
      expect(
        await gelatoCore.isCAMProvided(providerAddress, condition.address, [
          actionStruct,
          otherActionStruct,
        ])
      ).to.be.equal("ConditionActionsMixNotProvided");

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
  });
});
