// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

import { utils } from "ethers";

// GelatoProviders creation time variable values
import initialState from "./GelatoProviders.initialState";

describe("GelatoCore - GelatoProviders - Setters: IceCreamS", function () {
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
  let iceCream;
  let otherIceCream;

  // ExecClaim for isIceCreamProvided check
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

    // Construct ExecClaim for unit test isIceCreamProvided():
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
    iceCream = new IceCream({
      condition: condition.address,
      actions: [actionStruct],
      gasPriceCeil,
    });

    otherIceCream = new IceCream({
      condition: condition.address,
      actions: [actionStruct, otherActionStruct],
      gasPriceCeil,
    });
  });

  // We test different functionality of the contract as normal Mocha tests.

  // provideIceCreams
  describe("GelatoCore.GelatoProviders.provideIceCreams", function () {
    it("Should allow anyone to provide a single IceCream", async function () {
      // iceCreamHash
      const iceCreamHash = await gelatoCore.iceCreamHash(
        iceCream.condition,
        iceCream.actions
      );

      // provideIceCreams
      await expect(gelatoCore.provideIceCreams([iceCream]))
        .to.emit(gelatoCore, "LogProvideIceCream")
        .withArgs(providerAddress, iceCreamHash)
        .and.to.emit(gelatoCore, "LogSetIceCreamGasPriceCeil")
        .withArgs(
          providerAddress,
          iceCreamHash,
          initialState.iceCreamGasPriceCeil,
          gasPriceCeil
        );

      // iceCream
      // iceCreamGasPriceCeil
      expect(
        await gelatoCore.iceCreamGasPriceCeil(providerAddress, iceCreamHash)
      ).to.be.equal(iceCream.gasPriceCeil);

      // isIceCreamProvided
      expect(
        await gelatoCore.isIceCreamProvided(
          providerAddress,
          condition.address,
          [actionStruct]
        )
      ).to.be.equal("OK");

      // isExecClaimProvided
      expect(await gelatoCore.isExecClaimProvided(execClaim)).not.to.be.equal(
        "IceCreamNotProvided"
      );

      // otherIceCream
      // isIceCreamProvided
      expect(
        await gelatoCore.isIceCreamProvided(
          providerAddress,
          condition.address,
          [actionStruct, otherActionStruct]
        )
      ).to.be.equal("IceCreamNotProvided");

      // isExecClaimProvided
      expect(await gelatoCore.isExecClaimProvided(otherExecClaim)).to.be.equal(
        "IceCreamNotProvided"
      );
    });

    it("Should allow anyone to provideIceCreams", async function () {
      // iceCreamHash
      const iceCreamHash = await gelatoCore.iceCreamHash(
        iceCream.condition,
        iceCream.actions
      );
      // otherIceCreamHash
      const otherIceCreamHash = await gelatoCore.iceCreamHash(
        otherIceCream.condition,
        otherIceCream.actions
      );

      // provideIceCreams
      await expect(gelatoCore.provideIceCreams([iceCream, otherIceCream]))
        .to.emit(gelatoCore, "LogProvideIceCream")
        .withArgs(providerAddress, iceCreamHash)
        .and.to.emit(gelatoCore, "LogSetIceCreamGasPriceCeil")
        .withArgs(
          providerAddress,
          iceCreamHash,
          initialState.iceCreamGasPriceCeil,
          gasPriceCeil
        )
        .and.to.emit(gelatoCore, "LogProvideIceCream")
        .withArgs(providerAddress, otherIceCreamHash)
        .and.to.emit(gelatoCore, "LogSetIceCreamGasPriceCeil")
        .withArgs(
          providerAddress,
          otherIceCreamHash,
          initialState.iceCreamGasPriceCeil,
          gasPriceCeil
        );

      // iceCream
      // iceCreamGasPriceCeil
      expect(
        await gelatoCore.iceCreamGasPriceCeil(providerAddress, iceCreamHash)
      ).to.be.equal(iceCream.gasPriceCeil);

      // isIceCreamProvided
      expect(
        await gelatoCore.isIceCreamProvided(
          providerAddress,
          condition.address,
          [actionStruct]
        )
      ).to.be.equal("OK");

      // isExecClaimProvided
      expect(await gelatoCore.isExecClaimProvided(execClaim)).not.to.be.equal(
        "IceCreamNotProvided"
      );

      // otherIceCream
      // iceCreamGasPriceCeil
      expect(
        await gelatoCore.iceCreamGasPriceCeil(
          providerAddress,
          otherIceCreamHash
        )
      ).to.be.equal(otherIceCream.gasPriceCeil);

      // isIceCreamProvided
      expect(
        await gelatoCore.isIceCreamProvided(
          providerAddress,
          condition.address,
          [actionStruct, otherActionStruct]
        )
      ).to.be.equal("OK");

      // isExecClaimProvided;
      expect(
        await gelatoCore.isExecClaimProvided(otherExecClaim)
      ).not.to.be.equal("IceCreamNotProvided");
    });

    it("Should NOT allow to provide same IceCreams again", async function () {
      await gelatoCore.provideIceCreams([iceCream]);

      await expect(gelatoCore.provideIceCreams([iceCream])).to.be.revertedWith(
        "GelatoProviders.setIceCreamGasPriceCeil: redundant"
      );

      await expect(
        gelatoCore.provideIceCreams([otherIceCream, iceCream])
      ).to.be.revertedWith(
        "GelatoProviders.setIceCreamGasPriceCeil: redundant"
      );
    });

    it("Should allow anyone to setIceCreamGasPriceCeil", async function () {
      // iceCreamHash
      const iceCreamHash = await gelatoCore.iceCreamHash(
        iceCream.condition,
        iceCream.actions
      );

      // setIceCreamGasPriceCeil
      await expect(
        gelatoCore.setIceCreamGasPriceCeil(iceCreamHash, gasPriceCeil)
      )
        .to.emit(gelatoCore, "LogSetIceCreamGasPriceCeil")
        .withArgs(
          providerAddress,
          iceCreamHash,
          initialState.iceCreamGasPriceCeil,
          gasPriceCeil
        );

      // iceCream
      // iceCreamGasPriceCeil
      expect(
        await gelatoCore.iceCreamGasPriceCeil(providerAddress, iceCreamHash)
      ).to.be.equal(gasPriceCeil);

      // isIceCreamProvided
      expect(
        await gelatoCore.isIceCreamProvided(
          providerAddress,
          condition.address,
          [actionStruct]
        )
      ).to.be.equal("OK");

      // isExecClaimProvided
      expect(await gelatoCore.isExecClaimProvided(execClaim)).not.to.be.equal(
        "IceCreamNotProvided"
      );

      // otherIceCream
      // isIceCreamProvided
      expect(
        await gelatoCore.isIceCreamProvided(
          providerAddress,
          condition.address,
          [actionStruct, otherActionStruct]
        )
      ).to.be.equal("IceCreamNotProvided");

      // isExecClaimProvided
      expect(await gelatoCore.isExecClaimProvided(otherExecClaim)).to.be.equal(
        "IceCreamNotProvided"
      );
    });

    it("Should NOT allow to redundantly setIceCreamGasPriceCeil", async function () {
      // iceCreamHash
      const iceCreamHash = await gelatoCore.iceCreamHash(
        iceCream.condition,
        iceCream.actions
      );

      // setIceCreamGasPriceCeil
      await gelatoCore.setIceCreamGasPriceCeil(iceCreamHash, gasPriceCeil);

      await expect(
        gelatoCore.setIceCreamGasPriceCeil(iceCreamHash, gasPriceCeil)
      ).to.be.revertedWith(
        "GelatoProviders.setIceCreamGasPriceCeil: redundant"
      );
    });
  });

  // unprovideIceCreams
  describe("GelatoCore.GelatoProviders.unprovideIceCreams", function () {
    it("Should allow Providers to unprovide a single IceCream", async function () {
      // provideIceCreams
      await gelatoCore.provideIceCreams([iceCream, otherIceCream]);

      // iceCreamHash
      const iceCreamHash = await gelatoCore.iceCreamHash(
        iceCream.condition,
        iceCream.actions
      );
      // otherIceCreamHash
      const otherIceCreamHash = await gelatoCore.iceCreamHash(
        otherIceCream.condition,
        otherIceCream.actions
      );

      // unprovideIceCreams
      await expect(gelatoCore.unprovideIceCreams([iceCream]))
        .to.emit(gelatoCore, "LogUnprovideIceCream")
        .withArgs(providerAddress, iceCreamHash);

      // iceCream
      // iceCreamGasPriceCeil
      expect(
        await gelatoCore.iceCreamGasPriceCeil(providerAddress, iceCreamHash)
      ).to.be.equal(initialState.iceCreamGasPriceCeil);

      // isIceCreamProvided
      expect(
        await gelatoCore.isIceCreamProvided(
          providerAddress,
          condition.address,
          [actionStruct]
        )
      ).to.be.equal("IceCreamNotProvided");

      // isExecClaimProvided
      expect(await gelatoCore.isExecClaimProvided(execClaim)).to.be.equal(
        "IceCreamNotProvided"
      );

      // otherIceCream
      // iceCreamGasPriceCeil
      expect(
        await gelatoCore.iceCreamGasPriceCeil(
          providerAddress,
          otherIceCreamHash
        )
      ).to.be.equal(otherIceCream.gasPriceCeil);

      // isIceCreamProvided
      expect(
        await gelatoCore.isIceCreamProvided(
          providerAddress,
          condition.address,
          [actionStruct, otherActionStruct]
        )
      ).to.be.equal("OK");

      // isExecClaimProvided
      expect(
        await gelatoCore.isExecClaimProvided(otherExecClaim)
      ).not.to.be.equal("IceCreamNotProvided");
    });

    it("Should allow Providers to unprovideIceCreams", async function () {
      // provideIceCreams
      await gelatoCore.provideIceCreams([iceCream, otherIceCream]);

      // iceCreamHash
      const iceCreamHash = await gelatoCore.iceCreamHash(
        iceCream.condition,
        iceCream.actions
      );
      // otherIceCreamHash
      const otherIceCreamHash = await gelatoCore.iceCreamHash(
        otherIceCream.condition,
        otherIceCream.actions
      );

      // unprovideIceCreams
      await expect(gelatoCore.unprovideIceCreams([iceCream, otherIceCream]))
        .to.emit(gelatoCore, "LogUnprovideIceCream")
        .withArgs(providerAddress, iceCreamHash)
        .and.to.emit(gelatoCore, "LogUnprovideIceCream")
        .withArgs(providerAddress, otherIceCreamHash);

      // iceCream
      // iceCreamGasPriceCeil
      expect(
        await gelatoCore.iceCreamGasPriceCeil(providerAddress, iceCreamHash)
      ).to.be.equal(initialState.iceCreamGasPriceCeil);

      // isIceCreamProvided
      expect(
        await gelatoCore.isIceCreamProvided(
          providerAddress,
          condition.address,
          [actionStruct]
        )
      ).to.be.equal("IceCreamNotProvided");

      // otherIceCream
      // iceCreamGasPriceCeil
      expect(
        await gelatoCore.iceCreamGasPriceCeil(
          providerAddress,
          otherIceCreamHash
        )
      ).to.be.equal(initialState.iceCreamGasPriceCeil);

      // isIceCreamProvided
      expect(
        await gelatoCore.isIceCreamProvided(
          providerAddress,
          condition.address,
          [actionStruct, otherActionStruct]
        )
      ).to.be.equal("IceCreamNotProvided");
    });

    it("Should NOT allow Providers to unprovide not-provided IceCreams", async function () {
      // unprovideIceCreams revert
      await expect(
        gelatoCore.unprovideIceCreams([iceCream])
      ).to.be.revertedWith("GelatoProviders.unprovideIceCreams: redundant");

      // unprovideIceCreams revert
      await expect(
        gelatoCore.unprovideIceCreams([iceCream, otherIceCream])
      ).to.be.revertedWith("GelatoProviders.unprovideIceCreams: redundant");

      // provideIceCreams
      await gelatoCore.provideIceCreams([iceCream]);

      // unprovideIceCreams revert
      await expect(
        gelatoCore.unprovideIceCreams([otherIceCream])
      ).to.be.revertedWith("GelatoProviders.unprovideIceCreams: redundant");

      // unprovideIceCreams revert
      await expect(
        gelatoCore.unprovideIceCreams([iceCream, otherIceCream])
      ).to.be.revertedWith("GelatoProviders.unprovideIceCreams: redundant");
    });
  });
});
