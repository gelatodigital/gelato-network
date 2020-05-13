// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

const { run } = require("@nomiclabs/buidler");

describe("User Proxies - GelatoUserProxyFactory: CREATE", function () {
  let GelatoCoreFactory;
  let GelatoUserProxyFactoryFactory;
  let ProviderModuleGelatoUserProxyFactory;
  let ActionFactory;

  let gelatoCore;
  let gelatoUserProxyFactory;
  let action;
  let providerModuleGelatoUserProxy;

  let user;
  let otherUser;
  let provider;
  let executor;

  let userAddress;
  let otherUserAddress;
  let providerAddress;
  let executorAddress;

  let actionStruct;
  let otherActionStruct;
  let task;
  let standaloneTaskSequence;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCoreFactory = await ethers.getContractFactory("GelatoCore");
    GelatoUserProxyFactoryFactory = await ethers.getContractFactory(
      "GelatoUserProxyFactory"
    );

    gelatoCore = await GelatoCoreFactory.deploy(gelatoSysAdminInitialState);
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
        gelatoUserProxyFactory.create([], [], {
          value: utils.parseEther("1"),
        })
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

  describe("GelatoUserProxyFactory.create: _tasks & _execActions", function () {
    beforeEach(async function () {
      // Get the ContractFactory, contract instance, and Signers here.
      ProviderModuleGelatoUserProxyFactory = await ethers.getContractFactory(
        "ProviderModuleGelatoUserProxy"
      );
      ActionFactory = await ethers.getContractFactory("MockActionDummy");

      providerModuleGelatoUserProxy = await ProviderModuleGelatoUserProxyFactory.deploy(
        gelatoUserProxyFactory.address
      );
      action = await ActionFactory.deploy();

      await providerModuleGelatoUserProxy.deployed();
      await action.deployed();

      // Action
      const actionData = await run("abi-encode-withselector", {
        contractname: "MockActionDummy",
        functionname: "action(bool)",
        inputs: [true],
      });
      actionStruct = new Action({
        addr: action.address,
        data: actionData,
        operation: Operation.Delegatecall,
      });

      const otherActionData = await run("abi-encode-withselector", {
        contractname: "MockActionDummy",
        functionname: "action(bool)",
        inputs: [false],
      });
      otherActionStruct = new Action({
        addr: action.address,
        data: otherActionData,
        operation: Operation.Call,
      });

      // task
      task = new Task({
        provider: new GelatoProvider({
          addr: providerAddress,
          module: providerModuleGelatoUserProxy.address,
        }),
        actions: [actionStruct],
      });

      standaloneTaskSequence = new StandaloneTaskSequence({
        taskSequence: [task],
      });

      // stakeExecutor
      const stakeTx = await gelatoCore.connect(executor).stakeExecutor({
        value: await gelatoCore.minExecutorStake(),
      });
      await stakeTx.wait();

      // multiProvide: provider
      const multiProvideTx = await gelatoCore.connect(provider).multiProvide(
        executorAddress,
        [
          new TaskSpec({
            actions: [actionStruct],
            gasPriceCeil: utils.parseUnits("20", "gwei"),
          }),
        ],
        [providerModuleGelatoUserProxy.address]
      );
      await multiProvideTx.wait();
    });

    it("Should submit optional Tasks", async function () {
      await expect(
        gelatoUserProxyFactory.create([], [standaloneTaskSequence])
      ).to.emit(gelatoCore, "LogTaskSubmitted");
      await expect(
        gelatoUserProxyFactory.create(
          [],
          [standaloneTaskSequence, standaloneTaskSequence]
        )
      ).to.emit(gelatoCore, "LogTaskSubmitted");
    });

    it("Should exec optional Actions", async function () {
      await expect(gelatoUserProxyFactory.create([actionStruct], [])).to.not.be
        .reverted;

      await expect(
        gelatoUserProxyFactory.create([actionStruct, otherActionStruct], [])
      )
        .to.emit(action, "LogAction")
        .withArgs(false);
    });

    it("Should submit optional Tasks and exec optional Actions", async function () {
      await expect(
        gelatoUserProxyFactory.create(
          [otherActionStruct],
          [standaloneTaskSequence]
        )
      )
        .to.emit(gelatoCore, "LogTaskSubmitted")
        .and.to.emit(action, "LogAction")
        .withArgs(false);
    });
  });
});
