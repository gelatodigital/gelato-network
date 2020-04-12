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

  // provideCAMs
  describe("GelatoCore.GelatoProviders.provideCAMs", function () {
    it("Should allow anyone to provide a single action", async function () {
      await expect(gelatoCore.provideCAMs([actionWithGasPriceCeil]))
        .to.emit(gelatoCore, "LogProvideCAM")
        .withArgs(
          providerAddress,
          actionWithGasPriceCeil._address,
          initialState.camGPC,
          actionWithGasPriceCeil.gasPriceCeil
        );
      expect(
        await gelatoCore.camGPC(
          providerAddress,
          actionWithGasPriceCeil._address
        )
      ).to.be.equal(actionWithGasPriceCeil.gasPriceCeil);
    });

    it("Should allow anyone to provideCAMs", async function () {
      await expect(
        gelatoCore.provideCAMs([
          actionWithGasPriceCeil,
          otherActionWithGasPriceCeil,
        ])
      )
        .to.emit(gelatoCore, "LogProvideCAM")
        .withArgs(
          providerAddress,
          actionWithGasPriceCeil._address,
          initialState.camGPC,
          actionWithGasPriceCeil.gasPriceCeil
        )
        .and.to.emit(gelatoCore, "LogProvideCAM")
        .withArgs(
          providerAddress,
          otherActionWithGasPriceCeil._address,
          initialState.camGPC,
          otherActionWithGasPriceCeil.gasPriceCeil
        );
      expect(
        await gelatoCore.camGPC(
          providerAddress,
          actionWithGasPriceCeil._address
        )
      ).to.be.equal(actionWithGasPriceCeil.gasPriceCeil);
      expect(
        await gelatoCore.camGPC(
          providerAddress,
          otherActionWithGasPriceCeil._address
        )
      ).to.be.equal(otherActionWithGasPriceCeil.gasPriceCeil);
    });

    it("Should NOT allow to provide same actions again", async function () {
      await gelatoCore.provideCAMs([actionWithGasPriceCeil]);

      await expect(
        gelatoCore.provideCAMs([actionWithGasPriceCeil])
      ).to.be.revertedWith("GelatoProviders.provideCAMs: redundant");

      await expect(
        gelatoCore.provideCAMs([
          otherActionWithGasPriceCeil,
          actionWithGasPriceCeil,
        ])
      ).to.be.revertedWith("GelatoProviders.provideCAMs: redundant");
    });
  });

  // unprovideCAMs
  describe("GelatoCore.GelatoProviders.unprovideCAMs", function () {
    it("Should allow Providers to unprovide a single Action", async function () {
      // provideCAMs
      await gelatoCore.provideCAMs([
        actionWithGasPriceCeil,
        otherActionWithGasPriceCeil,
      ]);

      // unprovideCAMs
      await expect(gelatoCore.unprovideCAMs([action.address]))
        .to.emit(gelatoCore, "LogUnprovideCAM")
        .withArgs(providerAddress, action.address);
      expect(
        await gelatoCore.camGPC(providerAddress, action.address)
      ).to.be.equal(initialState.camGPC);
      expect(
        await gelatoCore.camGPC(
          providerAddress,
          otherAction.address
        )
      ).to.be.equal(otherActionWithGasPriceCeil.gasPriceCeil);
    });

    it("Should allow Providers to unprovideCAMs", async function () {
      // provideCAMs
      await gelatoCore.provideCAMs([
        actionWithGasPriceCeil,
        otherActionWithGasPriceCeil,
      ]);

      // unprovideCAMs
      await expect(
        gelatoCore.unprovideCAMs([action.address, otherAction.address])
      )
        .to.emit(gelatoCore, "LogUnprovideCAM")
        .withArgs(providerAddress, action.address)
        .and.to.emit(gelatoCore, "LogUnprovideCAM")
        .withArgs(providerAddress, otherAction.address);
      expect(
        await gelatoCore.camGPC(providerAddress, action.address)
      ).to.be.equal(initialState.camGPC);
      expect(
        await gelatoCore.camGPC(
          providerAddress,
          otherAction.address
        )
      ).to.be.equal(initialState.camGPC);
    });

    it("Should NOT allow Providers to unprovide not-provided Actions", async function () {
      // unprovideCAMs
      await expect(
        gelatoCore.unprovideCAMs([action.address])
      ).to.be.revertedWith("GelatoProviders.unprovideCAMs: redundant");

      await expect(
        gelatoCore.unprovideCAMs([action.address, otherAction.address])
      ).to.be.revertedWith("GelatoProviders.unprovideCAMs: redundant");

      // provideCAMs
      await gelatoCore.provideCAMs([actionWithGasPriceCeil]);

      // unprovideCAMs
      await expect(
        gelatoCore.unprovideCAMs([otherAction.address])
      ).to.be.revertedWith("GelatoProviders.unprovideCAMs: redundant");

      await expect(
        gelatoCore.unprovideCAMs([action.address, otherAction.address])
      ).to.be.revertedWith("GelatoProviders.unprovideCAMs: redundant");
    });
  });
});
