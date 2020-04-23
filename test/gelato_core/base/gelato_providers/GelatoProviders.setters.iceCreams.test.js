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

  // ExecClaim for isTaskSpecProvided check
  let execClaim;
  let otherExecClaim;

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

    // Construct ExecClaim for unit test isTaskSpecProvided():
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

    // Task
    const task = new Task({
      provider: gelatoProvider,
      condition: conditionStruct,
      actions: [actionStruct],
      expiryDate: constants.Zero,
    });
    const otherTask = new Task({
      provider: gelatoProvider,
      condition: conditionStruct,
      actions: [actionStruct, otherActionStruct],
      expiryDate: constants.Zero,
    });

    // ExecClaim
    execClaim = new ExecClaim({
      id: constants.Zero,
      userProxy: constants.AddressZero,
      task: task,
    });
    otherExecClaim = new ExecClaim({
      id: 1,
      userProxy: constants.AddressZero,
      task: otherTask,
    });

    // Condition Action Mix
    taskSpec = new TaskSpec({
      condition: condition.address,
      actions: [actionStruct],
      gasPriceCeil,
    });

    otherTaskSpec = new TaskSpec({
      condition: condition.address,
      actions: [actionStruct, otherActionStruct],
      gasPriceCeil,
    });
  });

  // We test different functionality of the contract as normal Mocha tests.

  // provideTaskSpecs
  describe("GelatoCore.GelatoProviders.provideTaskSpecs", function () {
    it("Should allow anyone to provide a single TaskSpec", async function () {
      // taskSpecHash
      const taskSpecHash = await gelatoCore.taskSpecHash(
        taskSpec.condition,
        taskSpec.actions
      );

      // provideTaskSpecs
      await expect(gelatoCore.provideTaskSpecs([taskSpec]))
        .to.emit(gelatoCore, "LogProvideTaskSpec")
        .withArgs(providerAddress, taskSpecHash)
        .and.to.emit(gelatoCore, "LogSetTaskSpecGasPriceCeil")
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
          condition.address,
          [actionStruct]
        )
      ).to.be.equal("OK");

      // isExecClaimProvided
      expect(await gelatoCore.isExecClaimProvided(execClaim)).not.to.be.equal(
        "TaskSpecNotProvided"
      );

      // otherTaskSpec
      // isTaskSpecProvided
      expect(
        await gelatoCore.isTaskSpecProvided(
          providerAddress,
          condition.address,
          [actionStruct, otherActionStruct]
        )
      ).to.be.equal("TaskSpecNotProvided");

      // isExecClaimProvided
      expect(await gelatoCore.isExecClaimProvided(otherExecClaim)).to.be.equal(
        "TaskSpecNotProvided"
      );
    });

    it("Should allow anyone to provideTaskSpecs", async function () {
      // taskSpecHash
      const taskSpecHash = await gelatoCore.taskSpecHash(
        taskSpec.condition,
        taskSpec.actions
      );
      // otherTaskSpecHash
      const otherTaskSpecHash = await gelatoCore.taskSpecHash(
        otherTaskSpec.condition,
        otherTaskSpec.actions
      );

      // provideTaskSpecs
      await expect(gelatoCore.provideTaskSpecs([taskSpec, otherTaskSpec]))
        .to.emit(gelatoCore, "LogProvideTaskSpec")
        .withArgs(providerAddress, taskSpecHash)
        .and.to.emit(gelatoCore, "LogSetTaskSpecGasPriceCeil")
        .withArgs(
          providerAddress,
          taskSpecHash,
          initialState.taskSpecGasPriceCeil,
          gasPriceCeil
        )
        .and.to.emit(gelatoCore, "LogProvideTaskSpec")
        .withArgs(providerAddress, otherTaskSpecHash)
        .and.to.emit(gelatoCore, "LogSetTaskSpecGasPriceCeil")
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
          condition.address,
          [actionStruct]
        )
      ).to.be.equal("OK");

      // isExecClaimProvided
      expect(await gelatoCore.isExecClaimProvided(execClaim)).not.to.be.equal(
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
          condition.address,
          [actionStruct, otherActionStruct]
        )
      ).to.be.equal("OK");

      // isExecClaimProvided;
      expect(
        await gelatoCore.isExecClaimProvided(otherExecClaim)
      ).not.to.be.equal("TaskSpecNotProvided");
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
      const taskSpecHash = await gelatoCore.taskSpecHash(
        taskSpec.condition,
        taskSpec.actions
      );

      // setTaskSpecGasPriceCeil
      await expect(
        gelatoCore.setTaskSpecGasPriceCeil(taskSpecHash, gasPriceCeil)
      )
        .to.emit(gelatoCore, "LogSetTaskSpecGasPriceCeil")
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
          condition.address,
          [actionStruct]
        )
      ).to.be.equal("OK");

      // isExecClaimProvided
      expect(await gelatoCore.isExecClaimProvided(execClaim)).not.to.be.equal(
        "TaskSpecNotProvided"
      );

      // otherTaskSpec
      // isTaskSpecProvided
      expect(
        await gelatoCore.isTaskSpecProvided(
          providerAddress,
          condition.address,
          [actionStruct, otherActionStruct]
        )
      ).to.be.equal("TaskSpecNotProvided");

      // isExecClaimProvided
      expect(await gelatoCore.isExecClaimProvided(otherExecClaim)).to.be.equal(
        "TaskSpecNotProvided"
      );
    });

    it("Should NOT allow to redundantly setTaskSpecGasPriceCeil", async function () {
      // taskSpecHash
      const taskSpecHash = await gelatoCore.taskSpecHash(
        taskSpec.condition,
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
      const taskSpecHash = await gelatoCore.taskSpecHash(
        taskSpec.condition,
        taskSpec.actions
      );
      // otherTaskSpecHash
      const otherTaskSpecHash = await gelatoCore.taskSpecHash(
        otherTaskSpec.condition,
        otherTaskSpec.actions
      );

      // unprovideTaskSpecs
      await expect(gelatoCore.unprovideTaskSpecs([taskSpec]))
        .to.emit(gelatoCore, "LogUnprovideTaskSpec")
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
          condition.address,
          [actionStruct]
        )
      ).to.be.equal("TaskSpecNotProvided");

      // isExecClaimProvided
      expect(await gelatoCore.isExecClaimProvided(execClaim)).to.be.equal(
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
          condition.address,
          [actionStruct, otherActionStruct]
        )
      ).to.be.equal("OK");

      // isExecClaimProvided
      expect(
        await gelatoCore.isExecClaimProvided(otherExecClaim)
      ).not.to.be.equal("TaskSpecNotProvided");
    });

    it("Should allow Providers to unprovideTaskSpecs", async function () {
      // provideTaskSpecs
      await gelatoCore.provideTaskSpecs([taskSpec, otherTaskSpec]);

      // taskSpecHash
      const taskSpecHash = await gelatoCore.taskSpecHash(
        taskSpec.condition,
        taskSpec.actions
      );
      // otherTaskSpecHash
      const otherTaskSpecHash = await gelatoCore.taskSpecHash(
        otherTaskSpec.condition,
        otherTaskSpec.actions
      );

      // unprovideTaskSpecs
      await expect(gelatoCore.unprovideTaskSpecs([taskSpec, otherTaskSpec]))
        .to.emit(gelatoCore, "LogUnprovideTaskSpec")
        .withArgs(providerAddress, taskSpecHash)
        .and.to.emit(gelatoCore, "LogUnprovideTaskSpec")
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
          condition.address,
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
          condition.address,
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
