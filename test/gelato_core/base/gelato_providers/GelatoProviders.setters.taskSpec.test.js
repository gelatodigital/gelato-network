// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

import { utils } from "ethers";

// GelatoProviders creation time variable values
import initialState from "./GelatoProviders.initialState";

describe("GelatoCore - GelatoProviders - Setters: TaskSpecs", function () {
  // We define the ContractFactory and Address variables here and assign them in
  // a beforeEach hook.
  let GelatoCoreFactory;
  let ConditionFactory;
  let ActionFactory;
  let OtherActionFactory;

  let gelatoCore;

  let condition;
  let action;
  let otherAction;
  let actionStruct;
  let otherActionStruct;

  const gasPriceCeil = utils.parseUnits("20", "gwei");

  // Condition - Actions - Mix
  let taskSpec;
  let otherTaskSpec;

  // TaskReceipt for isTaskSpecProvided check
  let taskReceipt;
  let otherTaskReceipt;

  let provider;
  let providerAddress;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCoreFactory = await ethers.getContractFactory("GelatoCore");
    ConditionFactory = await ethers.getContractFactory("MockConditionDummy");
    ActionFactory = await ethers.getContractFactory("MockActionDummy");
    OtherActionFactory = await ethers.getContractFactory("MockActionDummy");

    gelatoCore = await GelatoCoreFactory.deploy();
    condition = await ConditionFactory.deploy();
    action = await ActionFactory.deploy();
    otherAction = await OtherActionFactory.deploy();

    await gelatoCore.deployed();
    await condition.deployed();
    await action.deployed();
    await otherAction.deployed();

    // Provider
    [provider] = await ethers.getSigners();
    providerAddress = await provider.getAddress();

    // Construct TaskReceipt for unit test isTaskSpecProvided():
    // GelatoProvider
    const gelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: constants.AddressZero,
    });

    // Condition
    const conditionStruct = new Condition({
      inst: condition.address,
      data: constants.HashZero,
    });

    // Action
    actionStruct = new Action({
      addr: action.address,
      data: "0xdeadbeef",
      operation: Operation.Delegatecall,
      termsOkCheck: false,
    });
    otherActionStruct = new Action({
      addr: otherAction.address,
      data: "0xdeadbeef",
      operation: Operation.Delegatecall,
      termsOkCheck: true,
    });

    // Task
    const task = new Task({
      provider: gelatoProvider,
      conditions: [conditionStruct],
      actions: [actionStruct],
      expiryDate: constants.Zero,
    });
    const otherTask = new Task({
      provider: gelatoProvider,
      conditions: [conditionStruct],
      actions: [actionStruct, otherActionStruct],
      expiryDate: constants.Zero,
    });

    // TaskReceipt
    taskReceipt = new TaskReceipt({
      id: constants.Zero,
      userProxy: constants.AddressZero,
      task: task,
    });
    otherTaskReceipt = new TaskReceipt({
      id: 1,
      userProxy: constants.AddressZero,
      task: otherTask,
    });

    // Task Spec
    taskSpec = new TaskSpec({
      conditions: [condition.address],
      actions: [actionStruct],
      gasPriceCeil,
    });

    otherTaskSpec = new TaskSpec({
      conditions: [condition.address],
      actions: [actionStruct, otherActionStruct],
      gasPriceCeil,
    });
  });

  // We test different functionality of the contract as normal Mocha tests.

  // provideTaskSpecs
  describe("GelatoCore.GelatoProviders.provideTaskSpecs", function () {
    it("Should allow anyone to provide a single TaskSpec", async function () {
      // taskSpecHash
      const taskSpecHash = await gelatoCore.hashTaskSpec(
        taskSpec.conditions,
        taskSpec.actions
      );

      // provideTaskSpecs
      await expect(gelatoCore.provideTaskSpecs([taskSpec]))
        .to.emit(gelatoCore, "LogTaskSpecProvided")
        .withArgs(providerAddress, taskSpecHash)
        .and.to.emit(gelatoCore, "LogTaskSpecGasPriceCeilSet")
        .withArgs(
          providerAddress,
          taskSpecHash,
          initialState.taskSpecGasPriceCeil,
          gasPriceCeil
        );

      // taskSpec
      // taskSpecGasPriceCeil
      expect(
        await gelatoCore.taskSpecGasPriceCeil(providerAddress, taskSpecHash)
      ).to.be.equal(taskSpec.gasPriceCeil);

      // isTaskSpecProvided
      expect(
        await gelatoCore.isTaskSpecProvided(
          providerAddress,
          [condition.address],
          [actionStruct]
        )
      ).to.be.equal("OK");

      // isTaskProvided
      expect(await gelatoCore.isTaskProvided(taskReceipt)).not.to.be.equal(
        "TaskSpecNotProvided"
      );

      // otherTaskSpec
      // isTaskSpecProvided
      expect(
        await gelatoCore.isTaskSpecProvided(
          providerAddress,
          [condition.address],
          [actionStruct, otherActionStruct]
        )
      ).to.be.equal("TaskSpecNotProvided");

      // isTaskProvided
      expect(await gelatoCore.isTaskProvided(otherTaskReceipt)).to.be.equal(
        "TaskSpecNotProvided"
      );
    });

    it("Should allow anyone to provideTaskSpecs", async function () {
      // taskSpecHash
      const taskSpecHash = await gelatoCore.hashTaskSpec(
        taskSpec.conditions,
        taskSpec.actions
      );
      // otherTaskSpecHash
      const otherTaskSpecHash = await gelatoCore.hashTaskSpec(
        otherTaskSpec.conditions,
        otherTaskSpec.actions
      );

      // provideTaskSpecs
      await expect(gelatoCore.provideTaskSpecs([taskSpec, otherTaskSpec]))
        .to.emit(gelatoCore, "LogTaskSpecProvided")
        .withArgs(providerAddress, taskSpecHash)
        .and.to.emit(gelatoCore, "LogTaskSpecGasPriceCeilSet")
        .withArgs(
          providerAddress,
          taskSpecHash,
          initialState.taskSpecGasPriceCeil,
          gasPriceCeil
        )
        .and.to.emit(gelatoCore, "LogTaskSpecProvided")
        .withArgs(providerAddress, otherTaskSpecHash)
        .and.to.emit(gelatoCore, "LogTaskSpecGasPriceCeilSet")
        .withArgs(
          providerAddress,
          otherTaskSpecHash,
          initialState.taskSpecGasPriceCeil,
          gasPriceCeil
        );

      // taskSpec
      // taskSpecGasPriceCeil
      expect(
        await gelatoCore.taskSpecGasPriceCeil(providerAddress, taskSpecHash)
      ).to.be.equal(taskSpec.gasPriceCeil);

      // isTaskSpecProvided
      expect(
        await gelatoCore.isTaskSpecProvided(
          providerAddress,
          [condition.address],
          [actionStruct]
        )
      ).to.be.equal("OK");

      // isTaskProvided
      expect(await gelatoCore.isTaskProvided(taskReceipt)).not.to.be.equal(
        "TaskSpecNotProvided"
      );

      // otherTaskSpec
      // taskSpecGasPriceCeil
      expect(
        await gelatoCore.taskSpecGasPriceCeil(
          providerAddress,
          otherTaskSpecHash
        )
      ).to.be.equal(otherTaskSpec.gasPriceCeil);

      // isTaskSpecProvided
      expect(
        await gelatoCore.isTaskSpecProvided(
          providerAddress,
          [condition.address],
          [actionStruct, otherActionStruct]
        )
      ).to.be.equal("OK");

      // isTaskProvided;
      expect(await gelatoCore.isTaskProvided(otherTaskReceipt)).not.to.be.equal(
        "TaskSpecNotProvided"
      );
    });

    it("Should NOT allow to provide same TaskSpecs again", async function () {
      await gelatoCore.provideTaskSpecs([taskSpec]);

      await expect(gelatoCore.provideTaskSpecs([taskSpec])).to.be.revertedWith(
        "GelatoProviders.setTaskSpecGasPriceCeil: redundant"
      );

      await expect(
        gelatoCore.provideTaskSpecs([otherTaskSpec, taskSpec])
      ).to.be.revertedWith(
        "GelatoProviders.setTaskSpecGasPriceCeil: redundant"
      );
    });

    it("Should allow anyone to setTaskSpecGasPriceCeil", async function () {
      // taskSpecHash
      const taskSpecHash = await gelatoCore.hashTaskSpec(
        taskSpec.conditions,
        taskSpec.actions
      );

      // setTaskSpecGasPriceCeil
      await expect(
        gelatoCore.setTaskSpecGasPriceCeil(taskSpecHash, gasPriceCeil)
      )
        .to.emit(gelatoCore, "LogTaskSpecGasPriceCeilSet")
        .withArgs(
          providerAddress,
          taskSpecHash,
          initialState.taskSpecGasPriceCeil,
          gasPriceCeil
        );

      // taskSpec
      // taskSpecGasPriceCeil
      expect(
        await gelatoCore.taskSpecGasPriceCeil(providerAddress, taskSpecHash)
      ).to.be.equal(gasPriceCeil);

      // isTaskSpecProvided
      expect(
        await gelatoCore.isTaskSpecProvided(
          providerAddress,
          [condition.address],
          [actionStruct]
        )
      ).to.be.equal("OK");

      // isTaskProvided
      expect(await gelatoCore.isTaskProvided(taskReceipt)).not.to.be.equal(
        "TaskSpecNotProvided"
      );

      // otherTaskSpec
      // isTaskSpecProvided
      expect(
        await gelatoCore.isTaskSpecProvided(
          providerAddress,
          [condition.address],
          [actionStruct, otherActionStruct]
        )
      ).to.be.equal("TaskSpecNotProvided");

      // isTaskProvided
      expect(await gelatoCore.isTaskProvided(otherTaskReceipt)).to.be.equal(
        "TaskSpecNotProvided"
      );
    });

    it("Should NOT allow to redundantly setTaskSpecGasPriceCeil", async function () {
      // taskSpecHash
      const taskSpecHash = await gelatoCore.hashTaskSpec(
        taskSpec.conditions,
        taskSpec.actions
      );

      // setTaskSpecGasPriceCeil
      await gelatoCore.setTaskSpecGasPriceCeil(taskSpecHash, gasPriceCeil);

      await expect(
        gelatoCore.setTaskSpecGasPriceCeil(taskSpecHash, gasPriceCeil)
      ).to.be.revertedWith(
        "GelatoProviders.setTaskSpecGasPriceCeil: redundant"
      );
    });
  });

  // unprovideTaskSpecs
  describe("GelatoCore.GelatoProviders.unprovideTaskSpecs", function () {
    it("Should allow Providers to unprovide a single TaskSpec", async function () {
      // provideTaskSpecs
      await gelatoCore.provideTaskSpecs([taskSpec, otherTaskSpec]);

      // taskSpecHash
      const taskSpecHash = await gelatoCore.hashTaskSpec(
        taskSpec.conditions,
        taskSpec.actions
      );
      // otherTaskSpecHash
      const otherTaskSpecHash = await gelatoCore.hashTaskSpec(
        otherTaskSpec.conditions,
        otherTaskSpec.actions
      );

      // unprovideTaskSpecs
      await expect(gelatoCore.unprovideTaskSpecs([taskSpec]))
        .to.emit(gelatoCore, "LogTaskSpecUnprovided")
        .withArgs(providerAddress, taskSpecHash);

      // taskSpec
      // taskSpecGasPriceCeil
      expect(
        await gelatoCore.taskSpecGasPriceCeil(providerAddress, taskSpecHash)
      ).to.be.equal(initialState.taskSpecGasPriceCeil);

      // isTaskSpecProvided
      expect(
        await gelatoCore.isTaskSpecProvided(
          providerAddress,
          [condition.address],
          [actionStruct]
        )
      ).to.be.equal("TaskSpecNotProvided");

      // isTaskProvided
      expect(await gelatoCore.isTaskProvided(taskReceipt)).to.be.equal(
        "TaskSpecNotProvided"
      );

      // otherTaskSpec
      // taskSpecGasPriceCeil
      expect(
        await gelatoCore.taskSpecGasPriceCeil(
          providerAddress,
          otherTaskSpecHash
        )
      ).to.be.equal(otherTaskSpec.gasPriceCeil);

      // isTaskSpecProvided
      expect(
        await gelatoCore.isTaskSpecProvided(
          providerAddress,
          [condition.address],
          [actionStruct, otherActionStruct]
        )
      ).to.be.equal("OK");

      // isTaskProvided
      expect(await gelatoCore.isTaskProvided(otherTaskReceipt)).not.to.be.equal(
        "TaskSpecNotProvided"
      );
    });

    it("Should allow Providers to unprovideTaskSpecs", async function () {
      // provideTaskSpecs
      await gelatoCore.provideTaskSpecs([taskSpec, otherTaskSpec]);

      // taskSpecHash
      const taskSpecHash = await gelatoCore.hashTaskSpec(
        taskSpec.conditions,
        taskSpec.actions
      );
      // otherTaskSpecHash
      const otherTaskSpecHash = await gelatoCore.hashTaskSpec(
        otherTaskSpec.conditions,
        otherTaskSpec.actions
      );

      // unprovideTaskSpecs
      await expect(gelatoCore.unprovideTaskSpecs([taskSpec, otherTaskSpec]))
        .to.emit(gelatoCore, "LogTaskSpecUnprovided")
        .withArgs(providerAddress, taskSpecHash)
        .and.to.emit(gelatoCore, "LogTaskSpecUnprovided")
        .withArgs(providerAddress, otherTaskSpecHash);

      // taskSpec
      // taskSpecGasPriceCeil
      expect(
        await gelatoCore.taskSpecGasPriceCeil(providerAddress, taskSpecHash)
      ).to.be.equal(initialState.taskSpecGasPriceCeil);

      // isTaskSpecProvided
      expect(
        await gelatoCore.isTaskSpecProvided(
          providerAddress,
          [condition.address],
          [actionStruct]
        )
      ).to.be.equal("TaskSpecNotProvided");

      // otherTaskSpec
      // taskSpecGasPriceCeil
      expect(
        await gelatoCore.taskSpecGasPriceCeil(
          providerAddress,
          otherTaskSpecHash
        )
      ).to.be.equal(initialState.taskSpecGasPriceCeil);

      // isTaskSpecProvided
      expect(
        await gelatoCore.isTaskSpecProvided(
          providerAddress,
          [condition.address],
          [actionStruct, otherActionStruct]
        )
      ).to.be.equal("TaskSpecNotProvided");
    });

    it("Should NOT allow Providers to unprovide not-provided TaskSpecs", async function () {
      // unprovideTaskSpecs revert
      await expect(
        gelatoCore.unprovideTaskSpecs([taskSpec])
      ).to.be.revertedWith("GelatoProviders.unprovideTaskSpecs: redundant");

      // unprovideTaskSpecs revert
      await expect(
        gelatoCore.unprovideTaskSpecs([taskSpec, otherTaskSpec])
      ).to.be.revertedWith("GelatoProviders.unprovideTaskSpecs: redundant");

      // provideTaskSpecs
      await gelatoCore.provideTaskSpecs([taskSpec]);

      // unprovideTaskSpecs revert
      await expect(
        gelatoCore.unprovideTaskSpecs([otherTaskSpec])
      ).to.be.revertedWith("GelatoProviders.unprovideTaskSpecs: redundant");

      // unprovideTaskSpecs revert
      await expect(
        gelatoCore.unprovideTaskSpecs([taskSpec, otherTaskSpec])
      ).to.be.revertedWith("GelatoProviders.unprovideTaskSpecs: redundant");
    });
  });
});
