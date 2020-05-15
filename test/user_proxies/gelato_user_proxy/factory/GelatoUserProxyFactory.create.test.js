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

  let gelatoProvider;
  let task;

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
        gelatoUserProxyFactory.create({
          value: utils.parseEther("1"),
        })
      ).to.emit(gelatoUserProxyFactory, "LogCreation");

      // gelatoProxiesByUser
      const [
        userProxyAddress,
      ] = await gelatoUserProxyFactory.gelatoProxiesByUser(userAddress);

      // userByGelatoProxy
      expect(
        await gelatoUserProxyFactory.userByGelatoProxy(userProxyAddress)
      ).to.be.equal(userAddress);

      // isGelatoUserProxy
      expect(await gelatoUserProxyFactory.isGelatoUserProxy(userProxyAddress))
        .to.be.true;

      // isGelatoProxyUser
      expect(
        await gelatoUserProxyFactory.isGelatoProxyUser(
          userAddress,
          userProxyAddress
        )
      ).to.be.true;

      // create(): otherUser
      await expect(gelatoUserProxyFactory.connect(otherUser).create()).to.emit(
        gelatoUserProxyFactory,
        "LogCreation"
      );

      // gelatoProxiesByUser: otherUser
      const [
        otherUserProxyAddress,
      ] = await gelatoUserProxyFactory.gelatoProxiesByUser(otherUserAddress);

      // userByGelatoProxy: otherUser
      expect(
        await gelatoUserProxyFactory.userByGelatoProxy(otherUserProxyAddress)
      ).to.be.equal(otherUserAddress);

      // isGelatoUserProxy: otherUser
      expect(
        await gelatoUserProxyFactory.isGelatoUserProxy(otherUserProxyAddress)
      ).to.be.true;

      // isGelatoProxyUser: otherUser
      expect(
        await gelatoUserProxyFactory.isGelatoProxyUser(
          otherUserAddress,
          otherUserProxyAddress
        )
      ).to.be.true;
    });

    it("Should allow to re-create a userProxy", async function () {
      // create(): user firstProxy
      const tx = await gelatoUserProxyFactory.create();
      await tx.wait();

      // gelatoProxiesByUser: first proxy
      const [
        userProxyAddress,
      ] = await gelatoUserProxyFactory.gelatoProxiesByUser(userAddress);

      // create(): user secondProxy
      await expect(gelatoUserProxyFactory.create()).to.emit(
        gelatoUserProxyFactory,
        "LogCreation"
      );

      // gelatoProxiesByUser: secondProxy
      const [
        _,
        secondUserProxyAddress,
      ] = await gelatoUserProxyFactory.gelatoProxiesByUser(userAddress);

      expect(secondUserProxyAddress).to.not.be.equal(userProxyAddress);

      // userByGelatoProxy: secondProxy
      expect(
        await gelatoUserProxyFactory.userByGelatoProxy(secondUserProxyAddress)
      ).to.be.equal(userAddress);

      // isGelatoUserProxy: secondProxy
      expect(
        await gelatoUserProxyFactory.isGelatoUserProxy(secondUserProxyAddress)
      ).to.be.true;
      // isGelatoProxyUser: secondProxy
      expect(
        await gelatoUserProxyFactory.isGelatoProxyUser(
          userAddress,
          userProxyAddress
        )
      ).to.be.true;
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

      // gelatoProvider
      gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      // task
      task = new Task({
        actions: [actionStruct],
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
        gelatoUserProxyFactory.createExecActionsSubmitTasks(
          [],
          gelatoProvider,
          [task],
          [0] // default 0
        )
      ).to.emit(gelatoCore, "LogTaskSubmitted");
      await expect(
        gelatoUserProxyFactory.createExecActionsSubmitTasks(
          [],
          gelatoProvider,
          [task, task],
          [0, 0]
        )
      ).to.emit(gelatoCore, "LogTaskSubmitted");
    });

    it("Should exec optional Actions", async function () {
      await expect(gelatoUserProxyFactory.createExecActions([actionStruct])).to
        .not.be.reverted;

      await expect(
        gelatoUserProxyFactory.createExecActions([
          actionStruct,
          otherActionStruct,
        ])
      )
        .to.emit(action, "LogAction")
        .withArgs(false);
    });

    it("Should submit optional Tasks and exec optional Actions", async function () {
      await expect(
        gelatoUserProxyFactory.createExecActionsSubmitTasks(
          [otherActionStruct],
          gelatoProvider,
          [task],
          [0]
        )
      )
        .to.emit(gelatoCore, "LogTaskSubmitted")
        .and.to.emit(action, "LogAction")
        .withArgs(false);
    });
  });
});
