// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

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

  let provider;
  let providerAddress;

  const userProxyAddress = constants.AddressZero;

  const gasPriceCeil = utils.parseUnits("20", "gwei");
  const NO_CEIL = 0;
  const NO_CEIL_STORED = constants.MaxUint256;

  // Condition - Actions => TaskSpec
  let taskSpec;
  let otherTaskSpec;

  let task;
  let otherTask;

  let taskSpecHash;
  let otherTaskSpecHash;

  let gelatoProvider;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCoreFactory = await ethers.getContractFactory("GelatoCore");
    ConditionFactory = await ethers.getContractFactory("MockConditionDummy");
    ActionFactory = await ethers.getContractFactory("MockActionDummy");
    OtherActionFactory = await ethers.getContractFactory("MockActionDummy");

    gelatoCore = await GelatoCoreFactory.deploy(gelatoSysAdminInitialState);
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
    gelatoProvider = new GelatoProvider({
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

    // Task Spec
    taskSpec = new TaskSpec({
      conditions: [condition.address],
      actions: [actionStruct],
      gasPriceCeil,
    });

    otherTaskSpec = new TaskSpec({
      conditions: [condition.address],
      actions: [actionStruct, otherActionStruct],
      gasPriceCeil: NO_CEIL,
    });

    // Task Spec Hash
    taskSpecHash = await gelatoCore.hashTaskSpec(taskSpec);
    otherTaskSpecHash = await gelatoCore.hashTaskSpec(otherTaskSpec);

    // Task
    task = new Task({
      conditions: [conditionStruct],
      actions: [actionStruct],
      expiryDate: constants.Zero,
    });
    otherTask = new Task({
      conditions: [conditionStruct],
      actions: [actionStruct, otherActionStruct],
      expiryDate: constants.Zero,
    });
  });

  // We test different functionality of the contract as normal Mocha tests.

  // provideTaskSpecs
  describe("GelatoCore.GelatoProviders.provideTaskSpecs", function () {
    it("Should allow anyone to provide a single TaskSpec", async function () {
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
        await gelatoCore.isTaskSpecProvided(providerAddress, taskSpec)
      ).to.be.equal("OK");

      // isTaskProvided
      expect(
        await gelatoCore.isTaskProvided(
          1, // taskReceiptId,
          userProxyAddress,
          gelatoProvider,
          task
        )
      ).not.to.be.equal("TaskSpecNotProvided");

      // otherTaskSpec
      // isTaskSpecProvided
      expect(
        await gelatoCore.isTaskSpecProvided(providerAddress, otherTaskSpec)
      ).to.be.equal("TaskSpecNotProvided");

      // isTaskProvided
      expect(
        await gelatoCore.isTaskProvided(
          1, // taskReceiptId,
          userProxyAddress,
          gelatoProvider,
          otherTask
        )
      ).to.be.equal("TaskSpecNotProvided");
    });

    it("Should allow anyone to provideTaskSpecs", async function () {
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
          NO_CEIL_STORED
        );

      // taskSpec
      // taskSpecGasPriceCeil
      expect(
        await gelatoCore.taskSpecGasPriceCeil(providerAddress, taskSpecHash)
      ).to.be.equal(taskSpec.gasPriceCeil);

      // isTaskSpecProvided
      expect(
        await gelatoCore.isTaskSpecProvided(providerAddress, taskSpec)
      ).to.be.equal("OK");

      // isTaskProvided
      expect(
        await gelatoCore.isTaskProvided(
          1, // taskReceiptId,
          userProxyAddress,
          gelatoProvider,
          task
        )
      ).not.to.be.equal("TaskSpecNotProvided");

      // otherTaskSpec
      // taskSpecGasPriceCeil
      expect(
        await gelatoCore.taskSpecGasPriceCeil(
          providerAddress,
          otherTaskSpecHash
        )
      ).to.be.equal(NO_CEIL_STORED);

      // isTaskSpecProvided
      expect(
        await gelatoCore.isTaskSpecProvided(providerAddress, otherTaskSpec)
      ).to.be.equal("OK");

      // isTaskProvided;
      expect(
        await gelatoCore.isTaskProvided(
          1, // taskReceiptId,
          userProxyAddress,
          gelatoProvider,
          otherTask
        )
      ).not.to.be.equal("TaskSpecNotProvided");
    });

    it("Should NOT allow to provide same TaskSpecs again", async function () {
      await gelatoCore.provideTaskSpecs([taskSpec]);

      await expect(gelatoCore.provideTaskSpecs([taskSpec])).to.be.revertedWith(
        "GelatoProviders.setTaskSpecGasPriceCeil: Already whitelisted with gasPriceCeil"
      );

      await expect(
        gelatoCore.provideTaskSpecs([otherTaskSpec, taskSpec])
      ).to.be.revertedWith(
        "GelatoProviders.setTaskSpecGasPriceCeil: Already whitelisted with gasPriceCeil"
      );
    });

    it("Should allow Provider to setTaskSpecGasPriceCeil", async function () {
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
        await gelatoCore.isTaskSpecProvided(providerAddress, taskSpec)
      ).to.be.equal("OK");

      // isTaskProvided
      expect(
        await gelatoCore.isTaskProvided(
          1, // taskReceiptId,
          userProxyAddress,
          gelatoProvider,
          task
        )
      ).not.to.be.equal("TaskSpecNotProvided");

      // setTaskSpecGasPriceCeil
      await expect(gelatoCore.setTaskSpecGasPriceCeil(taskSpecHash, 42069))
        .to.emit(gelatoCore, "LogTaskSpecGasPriceCeilSet")
        .withArgs(providerAddress, taskSpecHash, gasPriceCeil, 42069);

      // taskSpec
      // taskSpecGasPriceCeil
      expect(
        await gelatoCore.taskSpecGasPriceCeil(providerAddress, taskSpecHash)
      ).to.be.equal(42069);

      // isTaskSpecProvided
      expect(
        await gelatoCore.isTaskSpecProvided(providerAddress, taskSpec)
      ).to.be.equal("OK");

      // isTaskProvided
      expect(
        await gelatoCore.isTaskProvided(
          1, // taskReceiptId,
          userProxyAddress,
          gelatoProvider,
          task
        )
      ).not.to.be.equal("TaskSpecNotProvided");

      // otherTaskSpec
      // isTaskSpecProvided
      expect(
        await gelatoCore.isTaskSpecProvided(providerAddress, otherTaskSpec)
      ).to.be.equal("TaskSpecNotProvided");

      // isTaskProvided
      expect(
        await gelatoCore.isTaskProvided(
          1, // taskReceiptId,
          userProxyAddress,
          gelatoProvider,
          otherTask
        )
      ).to.be.equal("TaskSpecNotProvided");
    });

    it("Should NOT allow to set the same gasPriceCeil for already listed TaskSpecs", async function () {
      // setTaskSpecGasPriceCeil
      await gelatoCore.setTaskSpecGasPriceCeil(taskSpecHash, gasPriceCeil);

      await expect(
        gelatoCore.setTaskSpecGasPriceCeil(taskSpecHash, gasPriceCeil)
      ).to.be.revertedWith(
        "GelatoProviders.setTaskSpecGasPriceCeil: Already whitelisted with gasPriceCeil"
      );
    });
  });

  // unprovideTaskSpecs
  describe("GelatoCore.GelatoProviders.unprovideTaskSpecs", function () {
    it("Should allow Providers to unprovide a single TaskSpec", async function () {
      // provideTaskSpecs
      await gelatoCore.provideTaskSpecs([taskSpec, otherTaskSpec]);

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
        await gelatoCore.isTaskSpecProvided(providerAddress, taskSpec)
      ).to.be.equal("TaskSpecNotProvided");

      // isTaskProvided
      expect(
        await gelatoCore.isTaskProvided(
          1, // taskReceiptId,
          userProxyAddress,
          gelatoProvider,
          task
        )
      ).to.be.equal("TaskSpecNotProvided");

      // otherTaskSpec
      // taskSpecGasPriceCeil
      expect(
        await gelatoCore.taskSpecGasPriceCeil(
          providerAddress,
          otherTaskSpecHash
        )
      ).to.be.equal(NO_CEIL_STORED);

      // isTaskSpecProvided
      expect(
        await gelatoCore.isTaskSpecProvided(providerAddress, otherTaskSpec)
      ).to.be.equal("OK");

      // isTaskProvided
      expect(
        await gelatoCore.isTaskProvided(
          1, // taskReceiptId,
          userProxyAddress,
          gelatoProvider,
          otherTask
        )
      ).not.to.be.equal("TaskSpecNotProvided");
    });

    it("Should allow Providers to unprovideTaskSpecs", async function () {
      // provideTaskSpecs
      await gelatoCore.provideTaskSpecs([taskSpec, otherTaskSpec]);

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
        await gelatoCore.isTaskSpecProvided(providerAddress, taskSpec)
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
        await gelatoCore.isTaskSpecProvided(providerAddress, otherTaskSpec)
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
