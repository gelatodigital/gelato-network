// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

import initialState from "./GelatoProviders.initialState";

describe("GelatoCore - GelatoProviders - Setters: BATCH PROVIDE", function () {
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

  // batchProvide
  describe("GelatoCore.GelatoProviders.batchProvide", function () {
    it("Should allow anyone to batchProvide", async function () {
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

      // batchProvide()
      await expect(
        gelatoCore.batchProvide(
          executorAddress,
          [taskSpec, otherTaskSpec],
          [providerModule.address, otherProviderModule.address],
          { value: 42069 }
        )
      )
        // LogProvideFunds
        .to.emit(gelatoCore, "LogProvideFunds")
        .withArgs(providerAddress, 42069, 42069)
        // LogProviderAssignsExecutor
        .and.to.emit(gelatoCore, "LogProviderAssignsExecutor")
        .withArgs(
          providerAddress,
          initialState.executorByProvider,
          executorAddress
        )
        // LogProvideTaskSpec & LogSetTaskSpecGasPriceCeil
        .and.to.emit(gelatoCore, "LogProvideTaskSpec")
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
        )
        // LogAddProviderModule
        .and.to.emit(gelatoCore, "LogAddProviderModule")
        .withArgs(providerAddress, providerModule.address)
        .and.to.emit(gelatoCore, "LogAddProviderModule")
        .withArgs(providerAddress, otherProviderModule.address);

      // providerFunds
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
        42069
      );

      // executorProvidersCount(prevExecutor)
      expect(
        await gelatoCore.executorProvidersCount(initialState.executorByProvider)
      ).to.be.equal(initialState.executorProvidersCount);
      // executorByProvider(provider)
      expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
        executorAddress
      );
      // executorProvidersCount(newExecutor)
      expect(
        await gelatoCore.executorProvidersCount(executorAddress)
      ).to.be.equal(initialState.executorProvidersCount + 1);

      // isExecutorAssigned
      expect(await gelatoCore.isExecutorAssigned(executorAddress)).to.be.true;

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

      // providerModule: isModuleProvided
      expect(
        await gelatoCore.isModuleProvided(
          providerAddress,
          providerModule.address
        )
      ).to.be.true;

      // otherProviderModule: isModuleProvided
      expect(
        await gelatoCore.isModuleProvided(
          providerAddress,
          otherProviderModule.address
        )
      ).to.be.true;

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
  });
});
