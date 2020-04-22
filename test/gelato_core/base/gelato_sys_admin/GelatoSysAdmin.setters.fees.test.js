// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

// GelatoSysAdmin creation time variable values
import initialState from "./GelatoSysAdmin.initialState";

describe("GelatoCore - GelatoSysAdmin - Setters: FEES", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
  let GelatoCore;
  let gelatoCore;
  let owner;
  let notOwner;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCore = await ethers.getContractFactory("GelatoCore");
    gelatoCore = await GelatoCore.deploy();
    await gelatoCore.deployed();
    [owner, notOwner] = await ethers.getSigners();
  });

  // We test different functionality of the contract as normal Mocha tests.

  // setExecutorSuccessShare
  describe("GelatoCore.GelatoSysAdmin.setExecutorSuccessShare", function () {
    it("Should let the owner setExecutorSuccessShare", async function () {
      const executorSuccessShare = await gelatoCore.executorSuccessShare();
      const sysAdminSuccessShare = await gelatoCore.sysAdminSuccessShare();

      // Every transaction and call is sent with the owner by default
      await expect(gelatoCore.setExecutorSuccessShare(69))
        .to.emit(gelatoCore, "LogSetExecutorSuccessShare")
        .withArgs(executorSuccessShare, 69, sysAdminSuccessShare.add(69));

      // executorSuccessShare
      expect(await gelatoCore.executorSuccessShare()).to.be.equal(69);

      // totalSuccessShare
      expect(await gelatoCore.totalSuccessShare()).to.be.equal(
        sysAdminSuccessShare.add(69)
      );
    });

    it("Should NOT let non-Owners setExecutorSuccessShare", async function () {
      // gelatoCore.connect returns the same GelatoCore contract instance,
      // but associated to a different signer
      await expect(
        gelatoCore.connect(notOwner).setExecutorSuccessShare(69420)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  // setSysAdminSuccessShare
  describe("GelatoCore.GelatoSysAdmin.setSysAdminSuccessShare", function () {
    it("Should let the owner setSysAdminSuccessShare", async function () {
      const executorSuccessShare = await gelatoCore.executorSuccessShare();
      const sysAdminSuccessShare = await gelatoCore.sysAdminSuccessShare();

      // Every transaction and call is sent with the owner by default
      await expect(gelatoCore.setSysAdminSuccessShare(96))
        .to.emit(gelatoCore, "LogSetSysAdminSuccessShare")
        .withArgs(sysAdminSuccessShare, 96, executorSuccessShare.add(96));

      // sysAdminSuccessShare
      expect(await gelatoCore.sysAdminSuccessShare()).to.be.equal(96);

      // totalSuccessShare
      expect(await gelatoCore.totalSuccessShare()).to.be.equal(
        executorSuccessShare.add(96)
      );
    });

    it("Should NOT let non-Owners setSysAdminSuccessShare", async function () {
      // gelatoCore.connect returns the same GelatoCore contract instance,
      // but associated to a different signer
      await expect(
        gelatoCore.connect(notOwner).setSysAdminSuccessShare(42069)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
