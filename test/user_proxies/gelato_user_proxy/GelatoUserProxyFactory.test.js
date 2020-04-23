// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

describe("User Proxies - GelatoUserProxy - FACTORY", function () {
  let GelatoCoreFactory;
  let GelatoUserProxyFactoryFactory;

  let gelatoCore;
  let gelatoUserProxyFactory;

  let user;
  let otherUser;

  let userAddress;
  let otherUserAddress;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCoreFactory = await ethers.getContractFactory("GelatoCore");
    GelatoUserProxyFactoryFactory = await ethers.getContractFactory(
      "GelatoUserProxyFactory"
    );

    gelatoCore = await GelatoCoreFactory.deploy();
    gelatoUserProxyFactory = await GelatoUserProxyFactoryFactory.deploy(
      gelatoCore.address
    );

    await gelatoCore.deployed();
    await gelatoUserProxyFactory.deployed();

    // users
    [user, otherUser] = await ethers.getSigners();
    userAddress = await user.getAddress();
    otherUserAddress = await otherUser.getAddress();
  });

  describe("GelatoUserProxyFactory.constructor", function () {
    it("Should store gelatoCore address", async function () {
      expect(await gelatoUserProxyFactory.gelatoCore()).to.be.equal(
        gelatoCore.address
      );
    });
  });

  describe("GelatoUserProxyFactory.create", function () {
    it("Should allow anyone to create a userProxy", async function () {
      // create(): user
      await expect(gelatoUserProxyFactory.create([], [])).to.emit(
        gelatoUserProxyFactory,
        "LogCreation"
      );

      // gelatoProxyByUser
      const userGelatoProxy = await gelatoUserProxyFactory.gelatoProxyByUser(
        userAddress
      );
      // userByGelatoProxy
      expect(
        await gelatoUserProxyFactory.userByGelatoProxy(userGelatoProxy)
      ).to.be.equal(userAddress);

      // isGelatoUserProxy
      expect(await gelatoUserProxyFactory.isGelatoUserProxy(userGelatoProxy)).to
        .be.true;
      // isGelatoProxyUser
      expect(await gelatoUserProxyFactory.isGelatoProxyUser(userAddress)).to.be
        .true;

      // create(): otherUser
      await expect(
        gelatoUserProxyFactory.connect(otherUser).create([], [])
      ).to.emit(gelatoUserProxyFactory, "LogCreation");

      // gelatoProxyByUser: otherUser
      const otherUserGelatoProxy = await gelatoUserProxyFactory.gelatoProxyByUser(
        otherUserAddress
      );
      // userByGelatoProxy: otherUser
      expect(
        await gelatoUserProxyFactory.userByGelatoProxy(otherUserGelatoProxy)
      ).to.be.equal(otherUserAddress);

      // isGelatoUserProxy: otherUser
      expect(
        await gelatoUserProxyFactory.isGelatoUserProxy(otherUserGelatoProxy)
      ).to.be.true;
      // isGelatoProxyUser: otherUser
      expect(await gelatoUserProxyFactory.isGelatoProxyUser(otherUserAddress))
        .to.be.true;
    });

    it("Should allow to re-create a userProxy", async function () {
      // create(): user firstProxy
      const tx = await gelatoUserProxyFactory.create([], []);
      await tx.wait();

      // gelatoProxyByUser: first proxy
      const firstUserGelatoProxy = await gelatoUserProxyFactory.gelatoProxyByUser(
        userAddress
      );

      // create(): user secondProxy
      await expect(gelatoUserProxyFactory.create([], [])).to.emit(
        gelatoUserProxyFactory,
        "LogCreation"
      );

      // gelatoProxyByUser: secondProxy
      const secondUserGelatoProxy = await gelatoUserProxyFactory.gelatoProxyByUser(
        userAddress
      );

      expect(secondUserGelatoProxy).to.not.be.equal(firstUserGelatoProxy);

      // userByGelatoProxy: secondProxy
      expect(
        await gelatoUserProxyFactory.userByGelatoProxy(secondUserGelatoProxy)
      ).to.be.equal(userAddress);

      // isGelatoUserProxy: secondProxy
      expect(
        await gelatoUserProxyFactory.isGelatoUserProxy(secondUserGelatoProxy)
      ).to.be.true;
      // isGelatoProxyUser: secondProxy
      expect(await gelatoUserProxyFactory.isGelatoProxyUser(userAddress)).to.be
        .true;
    });
  });
});
