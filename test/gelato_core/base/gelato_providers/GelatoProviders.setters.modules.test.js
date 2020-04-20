// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

import initialState from "./GelatoProviders.initialState";

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
  let extcodehashGelatoUserProxy;

  let execClaim;
  let otherExecClaim;
  let fakeExecClaim;

  // Condition - Actions - Mix
  let cam;
  // GPC
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

    gelatoCore = await GelatoCoreFactory.deploy();
    await gelatoCore.deployed();

    gelatoUserProxyFactory = await GelatoUserProxyFactoryFactory.deploy(
      gelatoCore.address
    );
    await gelatoUserProxyFactory.deployed();

    [provider, user] = await ethers.getSigners();
    providerAddress = await provider.getAddress();

    await gelatoUserProxyFactory.connect(user).create();
    gelatoUserProxyAddress = await gelatoUserProxyFactory.gelatoProxyByUser(
      await user.getAddress()
    );
    extcodehashGelatoUserProxy = await gelatoUserProxyFactory.proxyExtcodehash();

    providerModule = await ProviderModuleFactory.deploy([
      extcodehashGelatoUserProxy,
    ]);
    otherProviderModule = await OtherProviderModuleFactory.deploy(
      [constants.HashZero], // hashes
      [constants.AddressZero], // masterCopies
      gelatoCore.address
    );
    fakeProviderModule = await FakeProviderModuleFactory.deploy();

    await providerModule.deployed();
    await otherProviderModule.deployed();
    await fakeProviderModule.deployed();

    const gelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: providerModule.address,
    });
    const otherGelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: otherProviderModule.address,
    });
    const fakeGelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: fakeProviderModule.address,
    });
    const condition = new Condition({
      inst: constants.AddressZero,
      data: constants.HashZero,
    });
    const action = new Action({
      inst: constants.AddressZero,
      data: constants.HashZero,
      operation: Operation.Call,
      termsOkCheck: true,
    });
    const task = new Task({
      provider: gelatoProvider,
      condition,
      actions: [action],
      expiryDate: constants.Zero,
    });
    const otherTask = new Task({
      provider: otherGelatoProvider,
      condition,
      actions: [action],
      expiryDate: constants.Zero,
    });
    const fakeTask = new Task({
      provider: fakeGelatoProvider,
      condition,
      actions: [action],
      expiryDate: constants.Zero,
    });

    execClaim = new ExecClaim({
      id: 0,
      userProxy: gelatoUserProxyAddress,
      task,
    });
    otherExecClaim = new ExecClaim({
      id: 0,
      userProxy: gelatoUserProxyAddress,
      task: otherTask,
    });
    fakeExecClaim = new ExecClaim({
      id: 0,
      userProxy: gelatoUserProxyAddress,
      task: fakeTask,
    });

    // Condition Action Mix
    cam = new CAM({
      condition: condition.inst,
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

      // numOfProviderModules
      expect(
        await gelatoCore.numOfProviderModules(providerAddress)
      ).to.be.equal(initialState.numOfProviderModules);

      // providerModules
      expect(
        (await gelatoCore.providerModules(providerAddress)).length
      ).to.be.equal(initialState.providerModulesLength);

      // providerModuleChecks
      expect(await gelatoCore.providerModuleChecks(execClaim)).to.be.equal(
        "InvalidProviderModule"
      );

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

      // providerModuleChecks
      expect(await gelatoCore.providerModuleChecks(execClaim)).to.be.equal(
        "Ok"
      );
    });

    it("Should allow anyone to addProviderModules", async function () {
      // providerModuleChecks
      expect(await gelatoCore.providerModuleChecks(execClaim)).to.be.equal(
        "InvalidProviderModule"
      );
      expect(await gelatoCore.providerModuleChecks(otherExecClaim)).to.be.equal(
        "InvalidProviderModule"
      );

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

      // providerModuleChecks
      expect(await gelatoCore.providerModuleChecks(execClaim)).to.be.equal(
        "Ok"
      );
      expect(
        await gelatoCore.providerModuleChecks(otherExecClaim)
      ).to.not.be.equal("Ok");
    });

    it("Should catch non-conform providerModuleChecks()", async function () {
      // addProviderModules()
      await expect(gelatoCore.addProviderModules([fakeProviderModule.address]))
        .to.emit(gelatoCore, "LogAddProviderModule")
        .withArgs(providerAddress, fakeProviderModule.address);

      expect(await gelatoCore.providerModuleChecks(fakeExecClaim)).to.be.equal(
        "GelatoProviders.providerModuleChecks"
      );
    });

    it("Should return providerModuleChecks from providerCanExec, if correct gelatoGasPrice", async function () {
      // provideCAMs
      await gelatoCore.provideCAMs([cam]);

      // addProviderModules()
      await gelatoCore.addProviderModules([
        providerModule.address,
        otherProviderModule.address,
        fakeProviderModule.address,
      ]);

      const weirdFlexButOkPrice = 0;
      const okGelatoGasPrice = cam.gasPriceCeil.sub(1);
      const alsoOkGelatoGasPrice = cam.gasPriceCeil;
      const notOkGelatoGasPrice = cam.gasPriceCeil.add(1);

      // providerCanExec: execClaim (provided gelato user proxy)
      expect(
        await gelatoCore.providerCanExec(execClaim, weirdFlexButOkPrice)
      ).to.be.equal("Ok");

      // providerCanExec: otherExecClaim (not provided gnosis safe)
      expect(
        await gelatoCore.providerCanExec(otherExecClaim, okGelatoGasPrice)
      ).to.not.be.equal("Ok");

      // providerCanExec: fakeExecClaim
      expect(
        await gelatoCore.providerCanExec(fakeExecClaim, alsoOkGelatoGasPrice)
      ).to.be.equal("GelatoProviders.providerModuleChecks");

      // providerCanExec: gelatoGasPriceTooHigh
      expect(
        await gelatoCore.providerCanExec(execClaim, notOkGelatoGasPrice)
      ).to.be.equal("camGasPriceCeil-OR-notProvided");
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
