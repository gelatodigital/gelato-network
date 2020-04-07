// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

describe("GelatoCore - GelatoSysAdmin - Setters: OWNABLE", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
  let GelatoCore;
  let gelatoCore;
  let owner;
  let newOwner;
  let notOwner;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCore = await ethers.getContractFactory("GelatoCore");
    gelatoCore = await GelatoCore.deploy();
    await gelatoCore.deployed();
    [owner, notOwner, newOwner] = await ethers.getSigners();
  });

  // We test different functionality of the contract as normal Mocha tests.

  // transferOwnership
  describe("GelatoCore.GelatoSysAdmin.Ownable.transferOwnership", function () {
    it("Should let the owner transferOwnership", async function () {
      expect(await gelatoCore.isOwner()).to.be.true;
      expect(await gelatoCore.connect(newOwner).isOwner()).to.be.false;
      await expect(gelatoCore.transferOwnership(await newOwner.getAddress()))
        .to.emit(gelatoCore, "OwnershipTransferred")
        .withArgs(await owner.getAddress(), await newOwner.getAddress());

      expect(await gelatoCore.isOwner()).to.be.false;
      expect(await gelatoCore.connect(newOwner).isOwner()).to.be.true;
    });

    it("Shouldn't let non-Owners transferOwnership", async function () {
      await expect(
        gelatoCore
          .connect(notOwner)
          .transferOwnership(await notOwner.getAddress())
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  // renounceOwnership
  describe("GelatoCore.GelatoSysAdmin.Ownable.renounceOwnership", function () {
    it("Should let the owner renounceOwnership", async function () {
      expect(await gelatoCore.isOwner()).to.be.true;
      await expect(gelatoCore.renounceOwnership())
        .to.emit(gelatoCore, "OwnershipTransferred")
        .withArgs(await owner.getAddress(), constants.AddressZero);
      expect(await gelatoCore.isOwner()).to.be.false;
    });

    it("Shouldn't let non-Owners renounceOwnership", async function () {
      await expect(
        gelatoCore.connect(notOwner).renounceOwnership()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
