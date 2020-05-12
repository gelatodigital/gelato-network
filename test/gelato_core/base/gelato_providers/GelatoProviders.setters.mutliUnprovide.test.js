// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

import initialState from "./GelatoProviders.initialState";

describe("GelatoCore - GelatoProviders - Setters: MULTI UNPROVIDE", function () {
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

    gelatoCore = await GelatoCore.deploy(gelatoSysAdminInitialState);

    condition = await ConditionFactory.deploy();
    action = await ActionFactory.deploy();
    otherAction = await OtherActionFactory.deploy();

    gelatoUserProxyFactory = await GelatoUserProxyFactoryFactory.deploy(
      gelatoCore.address
    );

    const Multisend = await ethers.getContractFactory("Multisend");

    const multisend = await Multisend.deploy();

    providerModule = await ProviderModuleFactory.deploy(
      gelatoUserProxyFactory.address
    ); // hashes
    otherProviderModule = await OtherProviderModuleFactory.deploy(
      [constants.HashZero], // hashes
      [constants.AddressZero], // masterCopies
      gelatoCore.address,
      multisend.address
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
      const taskSpecHash = await gelatoCore.hashTaskSpec(taskSpec);
      // otherTaskSpecHash
      const otherTaskSpecHash = await gelatoCore.hashTaskSpec(otherTaskSpec);

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
        // LogFundsUnprovided
        .to.emit(gelatoCore, "LogFundsUnprovided")
        .withArgs(providerAddress, providedFunds, 0)
        // LogTaskSpecUnprovided
        .and.to.emit(gelatoCore, "LogTaskSpecUnprovided")
        .withArgs(providerAddress, taskSpecHash)
        .and.to.emit(gelatoCore, "LogTaskSpecUnprovided")
        .withArgs(providerAddress, otherTaskSpecHash)
        // LogProviderModuleRemoved
        .and.to.emit(gelatoCore, "LogProviderModuleRemoved")
        .withArgs(providerAddress, providerModule.address)
        .and.to.emit(gelatoCore, "LogProviderModuleRemoved")
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
