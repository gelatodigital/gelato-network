// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

const { run } = require("@nomiclabs/buidler");

describe("User Proxies - GelatoUserProxy - CONSTRUCTOR", function () {
  let GelatoCoreFactory;
  let GelatoUserProxyFactoryFactory;
  let SelfProviderModuleGelatoUserProxyFactory;
  let ActionFactory;

  let gelatoCore;
  let gelatoUserProxyFactory;
  let action;
  let selfProviderModuleGelatoUserProxy;

  let user;
  let notUser;

  let userAddress;
  let notUserAddress;

  let actionStruct;
  let submitTaskTask;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCoreFactory = await ethers.getContractFactory("GelatoCore");
    GelatoUserProxyFactoryFactory = await ethers.getContractFactory(
      "GelatoUserProxyFactory"
    );
    SelfProviderModuleGelatoUserProxyFactory = await ethers.getContractFactory(
      "SelfProviderModuleGelatoUserProxy"
    );
    ActionFactory = await ethers.getContractFactory("MockActionDummy");

    gelatoCore = await GelatoCoreFactory.deploy();
    gelatoUserProxyFactory = await GelatoUserProxyFactoryFactory.deploy(
      gelatoCore.address
    );
    selfProviderModuleGelatoUserProxy = await SelfProviderModuleGelatoUserProxyFactory.deploy();
    action = await ActionFactory.deploy();

    await gelatoCore.deployed();
    await gelatoUserProxyFactory.deployed();
    await selfProviderModuleGelatoUserProxy.deployed();
    await action.deployed();

    // users
    [user, notUser] = await ethers.getSigners();
    userAddress = await user.getAddress();
    notUserAddress = await notUser.getAddress();

    // Action
    const actionData = await run("abi-encode-withselector", {
      contractname: "MockActionDummy",
      functionname: "action(bool)",
      inputs: [true],
    });
    actionStruct = new Action({
      inst: action.address,
      data: actionData,
      operation: Operation.Delegatecall,
    });

    // submitTaskTask
    submitTaskTask = new Task({
      provider: new GelatoProvider({
        addr: userAddress,
        module: selfProviderModuleGelatoUserProxy.address,
      }),
      actions: [actionStruct],
    });
  });

  describe("GelatoUserProxyFactory.constructor: state vars", function () {
    it("Should store user address", async function () {
      const tx = await gelatoUserProxyFactory.create([], []);
      await tx.wait();
      const gelatoUserProxyAddress = await gelatoUserProxyFactory.gelatoProxyByUser(
        userAddress
      );
      const gelatoUserProxy = await ethers.getContractAt(
        "GelatoUserProxy",
        gelatoUserProxyAddress
      );
      expect(await gelatoUserProxy.user()).to.be.equal(userAddress);
    });

    it("Should store gelatoCore address", async function () {
      const tx = await gelatoUserProxyFactory.create([], []);
      await tx.wait();
      const gelatoUserProxyAddress = await gelatoUserProxyFactory.gelatoProxyByUser(
        userAddress
      );
      const gelatoUserProxy = await ethers.getContractAt(
        "GelatoUserProxy",
        gelatoUserProxyAddress
      );
      expect(await gelatoUserProxy.gelatoCore()).to.be.equal(
        gelatoCore.address
      );
    });
  });

  //   describe("GelatoUserProxyFactory.create", function () {
  //     it("Should allow anyone to create a userProxy", async function () {
  //       // create(): user
  //       await expect(gelatoUserProxyFactory.create([], [])).to.emit(
  //         gelatoUserProxyFactory,
  //         "LogCreation"
  //       );

  //       // gelatoProxyByUser
  //       const userGelatoProxy = await gelatoUserProxyFactory.gelatoProxyByUser(
  //         userAddress
  //       );
  //       // userByGelatoProxy
  //       expect(
  //         await gelatoUserProxyFactory.userByGelatoProxy(userGelatoProxy)
  //       ).to.be.equal(userAddress);

  //       // isGelatoUserProxy
  //       expect(await gelatoUserProxyFactory.isGelatoUserProxy(userGelatoProxy)).to
  //         .be.true;
  //       // isGelatoProxyUser
  //       expect(await gelatoUserProxyFactory.isGelatoProxyUser(userAddress)).to.be
  //         .true;

  //       // create(): otherUser
  //       await expect(
  //         gelatoUserProxyFactory.connect(otherUser).create([], [])
  //       ).to.emit(gelatoUserProxyFactory, "LogCreation");

  //       // gelatoProxyByUser: otherUser
  //       const otherUserGelatoProxy = await gelatoUserProxyFactory.gelatoProxyByUser(
  //         otherUserAddress
  //       );
  //       // userByGelatoProxy: otherUser
  //       expect(
  //         await gelatoUserProxyFactory.userByGelatoProxy(otherUserGelatoProxy)
  //       ).to.be.equal(otherUserAddress);

  //       // isGelatoUserProxy: otherUser
  //       expect(
  //         await gelatoUserProxyFactory.isGelatoUserProxy(otherUserGelatoProxy)
  //       ).to.be.true;
  //       // isGelatoProxyUser: otherUser
  //       expect(await gelatoUserProxyFactory.isGelatoProxyUser(otherUserAddress))
  //         .to.be.true;
  //     });
  //   });
});
