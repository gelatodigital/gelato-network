// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

const { run } = require("@nomiclabs/buidler");

describe("User Proxies - GelatoUserProxyFactory: CREATE", function () {
  let GelatoCoreFactory;
  let GelatoUserProxyFactoryFactory;
  let ProviderModuleGelatoUserProxyFactory;
  let SelfProviderModuleGelatoUserProxyFactory;
  let ActionFactory;

  let gelatoCore;
  let gelatoUserProxyFactory;
  let action;
  let providerModuleGelatoUserProxy;
  let selfProviderModuleGelatoUserProxy;

  let user;
  let otherUser;
  let provider;
  let executor;

  let userAddress;
  let otherUserAddress;
  let providerAddress;
  let executorAddress;

  let optionalAction;
  let otherOptionalAction;
  let optionalTask;

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

    // tx signers
    [user, otherUser, provider, executor] = await ethers.getSigners();
    userAddress = await user.getAddress();
    otherUserAddress = await otherUser.getAddress();
    providerAddress = await provider.getAddress();
    executorAddress = await executor.getAddress();
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
      await expect(
        gelatoUserProxyFactory.create([], [], { value: utils.parseEther("1") })
      ).to.emit(gelatoUserProxyFactory, "LogCreation");

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

  describe("GelatoUserProxyFactory.create: _submitTasks & _execActions", function () {
    beforeEach(async function () {
      // Get the ContractFactory, contract instance, and Signers here.
      ProviderModuleGelatoUserProxyFactory = await ethers.getContractFactory(
        "ProviderModuleGelatoUserProxy"
      );
      SelfProviderModuleGelatoUserProxyFactory = await ethers.getContractFactory(
        "SelfProviderModuleGelatoUserProxy"
      );
      ActionFactory = await ethers.getContractFactory("MockActionDummy");

      providerModuleGelatoUserProxy = await ProviderModuleGelatoUserProxyFactory.deploy(
        gelatoUserProxyFactory.address
      );
      selfProviderModuleGelatoUserProxy = await SelfProviderModuleGelatoUserProxyFactory.deploy();
      action = await ActionFactory.deploy();

      await providerModuleGelatoUserProxy.deployed();
      await selfProviderModuleGelatoUserProxy.deployed();
      await action.deployed();

      // Action
      const actionData = await run("abi-encode-withselector", {
        contractname: "MockActionDummy",
        functionname: "action(bool)",
        inputs: [true],
      });
      optionalAction = new Action({
        inst: action.address,
        data: actionData,
        operation: Operation.Delegatecall,
      });

      const otherActionData = await run("abi-encode-withselector", {
        contractname: "MockActionDummy",
        functionname: "action(bool)",
        inputs: [false],
      });
      otherOptionalAction = new Action({
        inst: action.address,
        data: otherActionData,
        operation: Operation.Call,
      });

      // optionalTask
      optionalTask = new Task({
        provider: new GelatoProvider({
          addr: providerAddress,
          module: providerModuleGelatoUserProxy.address,
        }),
        actions: [optionalAction],
      });

      // stakeExecutor
      const stakeTx = await gelatoCore.connect(executor).stakeExecutor({
        value: await gelatoCore.minExecutorStake(),
      });
      await stakeTx.wait();

      // multiProvide: provider
      let multiProvideTx = await gelatoCore.connect(provider).multiProvide(
        executorAddress,
        [
          new TaskSpec({
            actions: [optionalAction],
            gasPriceCeil: utils.parseUnits("20", "gwei"),
          }),
        ],
        [providerModuleGelatoUserProxy.address]
      );
      await multiProvideTx.wait();

      // multiProvide: selfProvider
      multiProvideTx = await gelatoCore.multiProvide(
        executorAddress,
        [],
        [selfProviderModuleGelatoUserProxy.address]
      );
      await multiProvideTx.wait();
    });

    it("Should submit optional Tasks", async function () {
      await expect(gelatoUserProxyFactory.create([optionalTask], [])).to.emit(
        gelatoCore,
        "LogSubmitTask"
      );
      await expect(
        gelatoUserProxyFactory.create([optionalTask, optionalTask], [])
      ).to.emit(gelatoCore, "LogSubmitTask");
    });

    it("Should exec optional Actions", async function () {
      await expect(gelatoUserProxyFactory.create([], [optionalAction])).to.not
        .be.reverted;

      await expect(
        gelatoUserProxyFactory.create([], [optionalAction, otherOptionalAction])
      )
        .to.emit(action, "LogAction")
        .withArgs(false);
    });

    it("Should submit optional Tasks and exec optional Actions", async function () {
      await expect(
        gelatoUserProxyFactory.create([optionalTask], [otherOptionalAction])
      )
        .to.emit(gelatoCore, "LogSubmitTask")
        .and.to.emit(action, "LogAction")
        .withArgs(false);
    });
  });
});
