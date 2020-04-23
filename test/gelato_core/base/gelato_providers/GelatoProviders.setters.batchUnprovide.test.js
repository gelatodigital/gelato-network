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

  let GelatoUserProxyFactoryFactory;

  let ProviderModuleFactory;
  let OtherProviderModuleFactory;

  let gelatoCore;

  let condition;
  let action;
  let otherAction;
  let actionStruct;
  let otherActionStruct;
  const gasPriceCeil = utils.parseUnits("20", "gwei");

  let taskSpec;
  let otherTaskSpec;

  let gelatoUserProxyFactory;

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

    GelatoUserProxyFactoryFactory = await ethers.getContractFactory(
      "GelatoUserProxyFactory"
    );

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

    gelatoUserProxyFactory = await GelatoUserProxyFactoryFactory.deploy(
      gelatoCore.address
    );

    providerModule = await ProviderModuleFactory.deploy(
      gelatoUserProxyFactory.address
    ); // hashes
    otherProviderModule = await OtherProviderModuleFactory.deploy(
      [constants.HashZero], // hashes
      [constants.AddressZero], // masterCopies
      gelatoCore.address
    );

    await gelatoCore.deployed();

    await condition.deployed();
    await action.deployed();
    await otherAction.deployed();

    await gelatoUserProxyFactory.deployed();

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

  // removeProviderModules
  describe("GelatoCore.GelatoProviders.multiUnprovide", function () {
    it("Should allow Providers to multiUnprovide", async function () {
      // minExecutorStake needed for providerAssignsExecutor()
      const minExecutorStake = await gelatoCore.minExecutorStake();
      // stakeExecutor()
      await gelatoCore
        .connect(executor)
        .stakeExecutor({ value: minExecutorStake });

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

      // multiProvide()
      const providedFunds = utils.bigNumberify(42069);
      await gelatoCore.multiProvide(
        executorAddress,
        [taskSpec, otherTaskSpec],
        [providerModule.address, otherProviderModule.address],
        { value: providedFunds }
      );

      expect(await gelatoCore.isExecutorAssigned(executorAddress)).to.be.true;

      // multiUnprovide()
      await expect(
        gelatoCore.multiUnprovide(
          providedFunds,
          [taskSpec, otherTaskSpec],
          [providerModule.address, otherProviderModule.address]
        )
      )
        // LogUnprovideFunds
        .to.emit(gelatoCore, "LogUnprovideFunds")
        .withArgs(providerAddress, providedFunds, 0)
        // LogUnprovideTaskSpec
        .and.to.emit(gelatoCore, "LogUnprovideTaskSpec")
        .withArgs(providerAddress, taskSpecHash)
        .and.to.emit(gelatoCore, "LogUnprovideTaskSpec")
        .withArgs(providerAddress, otherTaskSpecHash)
        // LogRemoveProviderModule
        .and.to.emit(gelatoCore, "LogRemoveProviderModule")
        .withArgs(providerAddress, providerModule.address)
        .and.to.emit(gelatoCore, "LogRemoveProviderModule")
        .withArgs(providerAddress, otherProviderModule.address);

      // providerFunds
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
        initialState.providerFunds
      );
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

      // providerModules
      expect(
        (await gelatoCore.providerModules(providerAddress)).length
      ).to.be.equal(0);
    });
  });
});
