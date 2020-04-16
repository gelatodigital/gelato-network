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
      operation: "delegatecall",
      termsOkCheck: false,
    });
    otherActionStruct = new Action({
      inst: otherAction.address,
      data: "0xdeadbeef",
      operation: "delegatecall",
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

  // batchProvide
  describe("GelatoCore.GelatoProviders.batchProvide", function () {
    it("Should allow anyone to batchProvide", async function () {
      // minProviderFunds required for providerAssignsExecutor
      const minProviderFunds = await gelatoCore.minProviderFunds();

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
      await expect(
        gelatoCore.batchProvide(
          executorAddress,
          [cam, otherCAM],
          [providerModule.address, otherProviderModule.address],
          { value: minProviderFunds }
        )
      )
        // LogProvideFunds
        .to.emit(gelatoCore, "LogProvideFunds")
        .withArgs(providerAddress, minProviderFunds, minProviderFunds)
        // LogProviderAssignsExecutor
        .and.to.emit(gelatoCore, "LogProviderAssignsExecutor")
        .withArgs(
          providerAddress,
          initialState.executorByProvider,
          executorAddress
        )
        // LogProvideCAM & LogSetCAMGPC
        .and.to.emit(gelatoCore, "LogProvideCAM")
        .withArgs(providerAddress, camHash)
        .and.to.emit(gelatoCore, "LogSetCAMGPC")
        .withArgs(providerAddress, camHash, initialState.camGPC, gasPriceCeil)
        .and.to.emit(gelatoCore, "LogProvideCAM")
        .withArgs(providerAddress, otherCAMHash)
        .and.to.emit(gelatoCore, "LogSetCAMGPC")
        .withArgs(
          providerAddress,
          otherCAMHash,
          initialState.camGPC,
          gasPriceCeil
        )
        // LogAddProviderModule
        .and.to.emit(gelatoCore, "LogAddProviderModule")
        .withArgs(providerAddress, providerModule.address)
        .and.to.emit(gelatoCore, "LogAddProviderModule")
        .withArgs(providerAddress, otherProviderModule.address);

      // providerFunds
      expect(await gelatoCore.providerFunds(providerAddress)).to.be.equal(
        minProviderFunds
      );
      // isProviderMinFunded
      expect(await gelatoCore.isProviderMinFunded(providerAddress)).to.be.true;

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

      // cam
      // camGPC
      expect(await gelatoCore.camGPC(providerAddress, camHash)).to.be.equal(
        cam.gasPriceCeil
      );

      // isCAMProvided
      expect(
        await gelatoCore.isCAMProvided(providerAddress, condition.address, [
          actionStruct,
        ])
      ).to.be.equal("Ok");

      // otherCAM
      // camGPC
      expect(
        await gelatoCore.camGPC(providerAddress, otherCAMHash)
      ).to.be.equal(otherCAM.gasPriceCeil);

      // isCAMProvided
      expect(
        await gelatoCore.isCAMProvided(providerAddress, condition.address, [
          actionStruct,
          otherActionStruct,
        ])
      ).to.be.equal("Ok");

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
  });
});
