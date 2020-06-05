// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

import initialState from "./GelatoProviders.initialState";

const SUBMISSIONS_LEFT = 1;

describe("GelatoCore - GelatoProviders - Setters: PROVIDER MODULES", function () {
  // We define the ContractFactory and Address variables here and assign them in
  // a beforeEach hook.
  let GelatoCoreFactory;
  let GelatoUserProxyFactoryFactory;
  let ProviderModuleFactory;
  let OtherProviderModuleFactory;
  let FakeProviderModuleFactory;

  let gelatoCore;
  let gelatoUserProxyFactory;
  let providerModule;
  let otherProviderModule;
  let fakeProviderModule;

  let provider;
  let user;
  let providerAddress;

  let gelatoUserProxyAddress;

  let gelatoProvider;
  let otherGelatoProvider;
  let fakeGelatoProvider;

  let task;
  let otherTask;
  let fakeTask;

  let taskReceipt;
  let otherTaskReceipt;
  let fakeTaskReceipt;

  // Condition - Actions - Mix
  let taskSpec;
  const gasPriceCeil = utils.parseUnits("20", "gwei");

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCoreFactory = await ethers.getContractFactory("GelatoCore");
    GelatoUserProxyFactoryFactory = await ethers.getContractFactory(
      "GelatoUserProxyFactory"
    );
    ProviderModuleFactory = await ethers.getContractFactory(
      "ProviderModuleGelatoUserProxy"
    );
    OtherProviderModuleFactory = await ethers.getContractFactory(
      "ProviderModuleGnosisSafeProxy"
    );
    FakeProviderModuleFactory = await ethers.getContractFactory(
      "MockConditionDummy"
    );

    gelatoCore = await GelatoCoreFactory.deploy(gelatoSysAdminInitialState);
    await gelatoCore.deployed();

    gelatoUserProxyFactory = await GelatoUserProxyFactoryFactory.deploy(
      gelatoCore.address
    );
    await gelatoUserProxyFactory.deployed();

    [provider, user] = await ethers.getSigners();
    providerAddress = await provider.getAddress();

    await gelatoUserProxyFactory.connect(user).create();
    [gelatoUserProxyAddress] = await gelatoUserProxyFactory.gelatoProxiesByUser(
      await user.getAddress()
    );

    const GelatoMultiSend = await ethers.getContractFactory("GelatoMultiSend");
    const gelatoMultiSend = await GelatoMultiSend.deploy();

    providerModule = await ProviderModuleFactory.deploy(
      gelatoUserProxyFactory.address,
      gelatoMultiSend.address
    );

    const Multisend = await ethers.getContractFactory("Multisend");

    const multisend = await Multisend.deploy();

    otherProviderModule = await OtherProviderModuleFactory.deploy(
      [constants.HashZero], // hashes
      [constants.AddressZero], // masterCopies
      gelatoCore.address,
      multisend.address
    );
    fakeProviderModule = await FakeProviderModuleFactory.deploy();

    await providerModule.deployed();
    await otherProviderModule.deployed();
    await fakeProviderModule.deployed();

    gelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: providerModule.address,
    });
    otherGelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: otherProviderModule.address,
    });
    fakeGelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: fakeProviderModule.address,
    });

    const action = new Action({
      addr: constants.AddressZero,
      data: constants.HashZero,
      operation: Operation.Call,
      termsOkCheck: true,
    });

    task = new Task({
      actions: [action],
    });
    otherTask = new Task({
      actions: [action],
    });
    fakeTask = new Task({
      actions: [action],
    });

    taskReceipt = new TaskReceipt({
      id: 1,
      provider: gelatoProvider,
      userProxy: gelatoUserProxyAddress,
      tasks: [task],
      submissionsLeft: SUBMISSIONS_LEFT,
    });
    otherTaskReceipt = new TaskReceipt({
      id: 1,
      provider: otherGelatoProvider,
      userProxy: gelatoUserProxyAddress,
      tasks: [otherTask],
      submissionsLeft: SUBMISSIONS_LEFT,
    });
    fakeTaskReceipt = new TaskReceipt({
      id: 1,
      provider: fakeGelatoProvider,
      userProxy: gelatoUserProxyAddress,
      tasks: [fakeTask],
      submissionsLeft: SUBMISSIONS_LEFT,
    });

    // Task Spec
    taskSpec = new TaskSpec({
      actions: [action],
      gasPriceCeil,
    });
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

      // providerModules
      expect(
        (await gelatoCore.providerModules(providerAddress)).length
      ).to.be.equal(initialState.providerModulesLength);

      // providerModuleChecks
      expect(
        await gelatoCore.providerModuleChecks(
          1, // taskReceiptId
          gelatoUserProxyAddress,
          gelatoProvider,
          task
        )
      ).to.be.equal("InvalidProviderModule");

      // addProviderModules()
      await expect(gelatoCore.addProviderModules([providerModule.address]))
        .to.emit(gelatoCore, "LogProviderModuleAdded")
        .withArgs(providerAddress, providerModule.address);

      // isModuleProvided
      expect(
        await gelatoCore.isModuleProvided(
          providerAddress,
          providerModule.address
        )
      ).to.be.true;

      // providerModules
      expect(
        (await gelatoCore.providerModules(providerAddress)).length
      ).to.be.equal(1);
      expect(
        (await gelatoCore.providerModules(providerAddress))[0]
      ).to.be.equal(providerModule.address);

      // providerModuleChecks
      expect(
        await gelatoCore.providerModuleChecks(
          1, // taskReceiptId
          gelatoUserProxyAddress,
          gelatoProvider,
          task
        )
      ).to.be.equal("OK");
    });

    it("Should allow anyone to addProviderModules", async function () {
      // providerModuleChecks
      expect(
        await gelatoCore.providerModuleChecks(
          1, // taskReceiptId
          gelatoUserProxyAddress,
          gelatoProvider,
          task
        )
      ).to.be.equal("InvalidProviderModule");
      expect(
        await gelatoCore.providerModuleChecks(
          1, // taskReceiptId
          gelatoUserProxyAddress,
          otherGelatoProvider,
          otherTask
        )
      ).to.be.equal("InvalidProviderModule");

      // addProviderModules()
      await expect(
        gelatoCore.addProviderModules([
          providerModule.address,
          otherProviderModule.address,
        ])
      )
        .to.emit(gelatoCore, "LogProviderModuleAdded")
        .withArgs(providerAddress, providerModule.address)
        .and.to.emit(gelatoCore, "LogProviderModuleAdded")
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

      // providerModuleChecks
      expect(
        await gelatoCore.providerModuleChecks(
          1, // taskReceiptId
          gelatoUserProxyAddress,
          gelatoProvider,
          task
        )
      ).to.be.equal("OK");
      expect(
        await gelatoCore.providerModuleChecks(
          1, // taskReceiptId
          gelatoUserProxyAddress,
          otherGelatoProvider,
          otherTask
        )
      ).to.not.be.equal("OK");
    });

    it("Should catch non-conform providerModuleChecks()", async function () {
      // addProviderModules()
      await expect(gelatoCore.addProviderModules([fakeProviderModule.address]))
        .to.emit(gelatoCore, "LogProviderModuleAdded")
        .withArgs(providerAddress, fakeProviderModule.address);

      expect(
        await gelatoCore.providerModuleChecks(
          1, // taskReceiptId
          gelatoUserProxyAddress,
          fakeGelatoProvider,
          fakeTask
        )
      ).to.be.equal("GelatoProviders.providerModuleChecks");
    });

    it("Should return providerModuleChecks from providerCanExec, if correct gelatoGasPrice", async function () {
      // provideTaskSpecs
      await gelatoCore.provideTaskSpecs([taskSpec]);

      // addProviderModules()
      await gelatoCore.addProviderModules([
        providerModule.address,
        otherProviderModule.address,
        fakeProviderModule.address,
      ]);

      const weirdFlexButOkPrice = 0;
      const okGelatoGasPrice = taskSpec.gasPriceCeil.sub(1);
      const alsoOkGelatoGasPrice = taskSpec.gasPriceCeil;
      const notOkGelatoGasPrice = taskSpec.gasPriceCeil.add(1);

      // providerCanExec: taskReceipt (provided gelato user proxy)

      expect(
        await gelatoCore.providerCanExec(
          taskReceipt.id,
          taskReceipt.userProxy,
          gelatoProvider,
          taskReceipt.tasks[taskReceipt.index],
          weirdFlexButOkPrice
        )
      ).to.be.equal("OK");

      // providerCanExec: otherTaskReceipt (not provided gnosis safe)
      expect(
        await gelatoCore.providerCanExec(
          otherTaskReceipt.id,
          otherTaskReceipt.userProxy,
          otherGelatoProvider,
          otherTaskReceipt.tasks[otherTaskReceipt.index],
          okGelatoGasPrice
        )
      ).to.not.be.equal("OK");

      // providerCanExec: fakeTaskReceipt
      expect(
        await gelatoCore.providerCanExec(
          fakeTaskReceipt.id,
          fakeTaskReceipt.userProxy,
          fakeGelatoProvider,
          fakeTaskReceipt.tasks[fakeTaskReceipt.index],
          alsoOkGelatoGasPrice
        )
      ).to.be.equal("GelatoProviders.providerModuleChecks");

      // providerCanExec: gelatoGasPriceTooHigh
      expect(
        await gelatoCore.providerCanExec(
          taskReceipt.id,
          taskReceipt.userProxy,
          gelatoProvider,
          taskReceipt.tasks[taskReceipt.index],
          notOkGelatoGasPrice
        )
      ).to.be.equal("taskSpecGasPriceCeil-OR-notProvided");
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
        .to.emit(gelatoCore, "LogProviderModuleRemoved")
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
        .to.emit(gelatoCore, "LogProviderModuleRemoved")
        .withArgs(providerAddress, providerModule.address)
        .and.to.emit(gelatoCore, "LogProviderModuleRemoved")
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
