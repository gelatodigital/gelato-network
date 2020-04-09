// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

import { utils } from "ethers";

// GelatoProviders creation time variable values
import initialState from "./GelatoProviders.initialState";

describe("GelatoCore - GelatoProviders - Setters: CONDITIONS", function () {
  // We define the ContractFactory and Address variables here and assign them in
  // a beforeEach hook.
  let GelatoCore;
  let Action;
  let OtherAction;
  let gelatoCore;
  let action;
  let actionWithGasPriceCeil;
  let otherAction;
  let otherActionWithGasPriceCeil;
  let provider;
  let providerAddress;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCore = await ethers.getContractFactory("GelatoCore");
    Action = await ethers.getContractFactory("MockActionDummy");
    OtherAction = await ethers.getContractFactory("MockActionDummy");
    gelatoCore = await GelatoCore.deploy();
    action = await Action.deploy();
    otherAction = await OtherAction.deploy();
    await gelatoCore.deployed();
    await action.deployed();
    await otherAction.deployed();

    actionWithGasPriceCeil = new ActionWithGasPriceCeil(
      action.address,
      utils.parseUnits("20", "gwei")
    );
    otherActionWithGasPriceCeil = new ActionWithGasPriceCeil(
      otherAction.address,
      utils.parseUnits("20", "gwei")
    );

    [provider] = await ethers.getSigners();
    providerAddress = await provider.getAddress();
  });

  // We test different functionality of the contract as normal Mocha tests.

  // provideActions
  describe("GelatoCore.GelatoProviders.provideActions", function () {
    it("Should allow anyone to provide a single action", async function () {
      await expect(gelatoCore.provideActions([actionWithGasPriceCeil]))
        .to.emit(gelatoCore, "LogProvideAction")
        .withArgs(
          providerAddress,
          actionWithGasPriceCeil._address,
          initialState.actionGasPriceCeil,
          actionWithGasPriceCeil.gasPriceCeil
        );
      expect(
        await gelatoCore.actionGasPriceCeil(
          providerAddress,
          actionWithGasPriceCeil._address
        )
      ).to.be.equal(actionWithGasPriceCeil.gasPriceCeil);
    });

    it("Should allow anyone to provideActions", async function () {
      await expect(
        gelatoCore.provideActions([
          actionWithGasPriceCeil,
          otherActionWithGasPriceCeil,
        ])
      )
        .to.emit(gelatoCore, "LogProvideAction")
        .withArgs(
          providerAddress,
          actionWithGasPriceCeil._address,
          initialState.actionGasPriceCeil,
          actionWithGasPriceCeil.gasPriceCeil
        )
        .and.to.emit(gelatoCore, "LogProvideAction")
        .withArgs(
          providerAddress,
          otherActionWithGasPriceCeil._address,
          initialState.actionGasPriceCeil,
          otherActionWithGasPriceCeil.gasPriceCeil
        );
      expect(
        await gelatoCore.actionGasPriceCeil(
          providerAddress,
          actionWithGasPriceCeil._address
        )
      ).to.be.equal(actionWithGasPriceCeil.gasPriceCeil);
      expect(
        await gelatoCore.actionGasPriceCeil(
          providerAddress,
          otherActionWithGasPriceCeil._address
        )
      ).to.be.equal(otherActionWithGasPriceCeil.gasPriceCeil);
    });

    it("Should NOT allow to provide same actions again", async function () {
      await gelatoCore.provideActions([actionWithGasPriceCeil]);

      await expect(
        gelatoCore.provideActions([actionWithGasPriceCeil])
      ).to.be.revertedWith("GelatoProviders.provideActions: redundant");

      await expect(
        gelatoCore.provideActions([
          otherActionWithGasPriceCeil,
          actionWithGasPriceCeil,
        ])
      ).to.be.revertedWith("GelatoProviders.provideActions: redundant");
    });
  });

  // unprovideActions
  describe("GelatoCore.GelatoProviders.unprovideActions", function () {
    it("Should allow Providers to unprovide a single Action", async function () {
      // provideActions
      await gelatoCore.provideActions([
        actionWithGasPriceCeil,
        otherActionWithGasPriceCeil,
      ]);

      // unprovideActions
      await expect(gelatoCore.unprovideActions([action.address]))
        .to.emit(gelatoCore, "LogUnprovideAction")
        .withArgs(providerAddress, action.address);
      expect(
        await gelatoCore.actionGasPriceCeil(providerAddress, action.address)
      ).to.be.equal(initialState.actionGasPriceCeil);
      expect(
        await gelatoCore.actionGasPriceCeil(
          providerAddress,
          otherAction.address
        )
      ).to.be.equal(otherActionWithGasPriceCeil.gasPriceCeil);
    });

    it("Should allow Providers to unprovideActions", async function () {
      // provideActions
      await gelatoCore.provideActions([
        actionWithGasPriceCeil,
        otherActionWithGasPriceCeil,
      ]);

      // unprovideActions
      await expect(
        gelatoCore.unprovideActions([action.address, otherAction.address])
      )
        .to.emit(gelatoCore, "LogUnprovideAction")
        .withArgs(providerAddress, action.address)
        .and.to.emit(gelatoCore, "LogUnprovideAction")
        .withArgs(providerAddress, otherAction.address);
      expect(
        await gelatoCore.actionGasPriceCeil(providerAddress, action.address)
      ).to.be.equal(initialState.actionGasPriceCeil);
      expect(
        await gelatoCore.actionGasPriceCeil(
          providerAddress,
          otherAction.address
        )
      ).to.be.equal(initialState.actionGasPriceCeil);
    });

    it("Should NOT allow Providers to unprovide not-provided Actions", async function () {
      // unprovideActions
      await expect(
        gelatoCore.unprovideActions([action.address])
      ).to.be.revertedWith("GelatoProviders.unprovideActions: redundant");

      await expect(
        gelatoCore.unprovideActions([action.address, otherAction.address])
      ).to.be.revertedWith("GelatoProviders.unprovideActions: redundant");

      // provideActions
      await gelatoCore.provideActions([actionWithGasPriceCeil]);

      // unprovideActions
      await expect(
        gelatoCore.unprovideActions([otherAction.address])
      ).to.be.revertedWith("GelatoProviders.unprovideActions: redundant");

      await expect(
        gelatoCore.unprovideActions([action.address, otherAction.address])
      ).to.be.revertedWith("GelatoProviders.unprovideActions: redundant");
    });
  });
});
