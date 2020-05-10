// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

const { run } = require("@nomiclabs/buidler");

const SALT_NONCE = 42069;
const OTHER_SALT_NONCE = 69420;
const FUNDING = utils.parseEther("1");

describe("User Proxies - GelatoUserProxyFactory: CREATE TWO", function () {
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

  let userProxyAddress;

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

    userProxyAddress = await gelatoUserProxyFactory.predictProxyAddress(
      userAddress,
      SALT_NONCE
    );
  });

  describe("GelatoUserProxyFactory.createTwo", function () {
    it("Should allow anyone to createTwo a userProxy", async function () {
      // createTwo(): user
      await expect(gelatoUserProxyFactory.createTwo(SALT_NONCE, [], [], false))
        .to.emit(gelatoUserProxyFactory, "LogCreation")
        .withArgs(userAddress, userProxyAddress, 0);

      // gelatoProxyByUser
      expect(
        await gelatoUserProxyFactory.gelatoProxyByUser(userAddress)
      ).to.be.equal(userProxyAddress);

      // userByGelatoProxy
      expect(
        await gelatoUserProxyFactory.userByGelatoProxy(userProxyAddress)
      ).to.be.equal(userAddress);

      // isGelatoUserProxy
      expect(await gelatoUserProxyFactory.isGelatoUserProxy(userProxyAddress))
        .to.be.true;

      // isGelatoProxyUser
      expect(await gelatoUserProxyFactory.isGelatoProxyUser(userAddress)).to.be
        .true;

      // predictProxyAddress: otherUser
      const predictedOtherUserProxyAddress = await gelatoUserProxyFactory.predictProxyAddress(
        otherUserAddress,
        SALT_NONCE
      );

      // createTwo(): otherUser
      await expect(
        gelatoUserProxyFactory
          .connect(otherUser)
          .createTwo(SALT_NONCE, [], [], false)
      )
        .to.emit(gelatoUserProxyFactory, "LogCreation")
        .withArgs(otherUserAddress, predictedOtherUserProxyAddress, 0);

      // gelatoProxyByUser: otherUser
      expect(
        await gelatoUserProxyFactory.gelatoProxyByUser(otherUserAddress)
      ).to.be.equal(predictedOtherUserProxyAddress);

      // userByGelatoProxy: otherUser
      expect(
        await gelatoUserProxyFactory.userByGelatoProxy(
          predictedOtherUserProxyAddress
        )
      ).to.be.equal(otherUserAddress);

      // isGelatoUserProxy: otherUser
      expect(
        await gelatoUserProxyFactory.isGelatoUserProxy(
          predictedOtherUserProxyAddress
        )
      ).to.be.true;

      // isGelatoProxyUser: otherUser
      expect(await gelatoUserProxyFactory.isGelatoProxyUser(otherUserAddress))
        .to.be.true;
    });

    it("Should allow to re-createTwo a userProxy using a different salt", async function () {
      // predictProxyAddress: user
      const userProxyAddress = await gelatoUserProxyFactory.predictProxyAddress(
        userAddress,
        SALT_NONCE
      );

      // createTwo(): user
      await expect(gelatoUserProxyFactory.createTwo(SALT_NONCE, [], [], false))
        .to.emit(gelatoUserProxyFactory, "LogCreation")
        .withArgs(userAddress, userProxyAddress, 0);

      // predictProxyAddress: secondProxy
      const secondUserProxyAddress = await gelatoUserProxyFactory.predictProxyAddress(
        userAddress,
        OTHER_SALT_NONCE
      );

      // createTwo(): user secondProxy
      await expect(
        gelatoUserProxyFactory.createTwo(OTHER_SALT_NONCE, [], [], false)
      )
        .to.emit(gelatoUserProxyFactory, "LogCreation")
        .withArgs(userAddress, secondUserProxyAddress, 0);

      // gelatoProxyByUser: secondProxy
      const secondUserGelatoProxy = await gelatoUserProxyFactory.gelatoProxyByUser(
        userAddress
      );
      expect(secondUserGelatoProxy).to.be.equal(secondUserProxyAddress);
      expect(secondUserGelatoProxy).to.not.be.equal(userProxyAddress);

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

  describe("GelatoUserProxyFactory.createTwo: proxy initialization", function () {
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
      optionalAction = new Action({
        addr: action.address,
        data: actionData,
        operation: Operation.Delegatecall,
      });

      const otherActionData = await run("abi-encode-withselector", {
        contractname: "MockActionDummy",
        functionname: "action(bool)",
        inputs: [false],
      });
      otherOptionalAction = new Action({
        addr: action.address,
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
      const multiProvideTx = await gelatoCore.connect(provider).multiProvide(
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
    });

    it("Should NOT allow to re-createTwo a userProxy using the same salt", async function () {
      // createTwo(): user
      await expect(gelatoUserProxyFactory.createTwo(SALT_NONCE, [], [], false))
        .to.emit(gelatoUserProxyFactory, "LogCreation")
        .withArgs(userAddress, userProxyAddress, 0);

      // createTwo(): user revertv
      await expect(
        gelatoUserProxyFactory.createTwo(
          SALT_NONCE,
          [],
          [optionalTask],
          false,
          {
            value: utils.parseEther("1"),
          }
        )
      ).to.be.reverted;

      // userByGelatoProxy:
      expect(
        await gelatoUserProxyFactory.userByGelatoProxy(userProxyAddress)
      ).to.be.equal(userAddress);

      // isGelatoUserProxy:
      expect(await gelatoUserProxyFactory.isGelatoUserProxy(userProxyAddress))
        .to.be.true;

      // isGelatoProxyUser:
      expect(await gelatoUserProxyFactory.isGelatoProxyUser(userAddress)).to.be
        .true;
    });

    it("Should fund a userProxy", async function () {
      // predictProxyAddress: user
      const userProxyAddress = await gelatoUserProxyFactory.predictProxyAddress(
        userAddress,
        SALT_NONCE
      );

      // createTwo(): user
      await expect(
        gelatoUserProxyFactory.createTwo(SALT_NONCE, [], [], false, {
          value: FUNDING,
        })
      )
        .to.emit(gelatoUserProxyFactory, "LogCreation")
        .withArgs(userAddress, userProxyAddress, FUNDING);
    });

    it("Should submit optional Tasks", async function () {
      // firstTaskReceipt
      const firstTaskReceiptId = (await gelatoCore.currentTaskReceiptId()).add(
        1
      );
      const firstTaskReceipt = new TaskReceipt({
        id: firstTaskReceiptId,
        userProxy: userProxyAddress,
        task: optionalTask,
      });
      const firstTaskReceiptHash = await gelatoCore.hashTaskReceipt(
        firstTaskReceipt
      );

      // secondTaskReceipt
      const secondTaskReceiptId = (await gelatoCore.currentTaskReceiptId()).add(
        1
      );
      const secondTaskReceipt = new TaskReceipt({
        id: secondTaskReceiptId,
        userProxy: userProxyAddress,
        task: optionalTask,
      });
      const secondTaskReceiptHash = await gelatoCore.hashTaskReceipt(
        secondTaskReceipt
      );

      await expect(
        gelatoUserProxyFactory.createTwo(
          SALT_NONCE,
          [],
          [optionalTask, optionalTask],
          false,
          {
            value: FUNDING,
          }
        )
      )
        .to.emit(gelatoUserProxyFactory, "LogCreation")
        .withArgs(userAddress, userProxyAddress, FUNDING)
        .and.to.emit(gelatoCore, "LogTaskSubmitted");
      // withArgs not possible: suspect buidlerevm or ethers struct parsing bug
      // .withArgs(
      //   executorAddress,
      //   firstTaskReceiptId,
      //   firstTaskReceiptHash,
      //   firstTaskReceipt
      // )
      // .and.to.emit(gelatoCore, "LogTaskSubmitted")
      // .withArgs(
      //   executorAddress,
      //   secondTaskReceiptId,
      //   secondTaskReceiptHash,
      //   secondTaskReceipt
      // );
    });

    it("Should exec optional Actions", async function () {
      // We could do this to check for delegatecall event but not possible
      // const userProxy = await ethers.getContractAt(
      //   "GelatoUserProxy",
      //   userProxyAddress
      // );

      await expect(
        gelatoUserProxyFactory.createTwo(
          SALT_NONCE,
          [optionalAction, otherOptionalAction],
          [],
          false,
          {
            value: FUNDING,
          }
        )
      )
        .to.emit(gelatoUserProxyFactory, "LogCreation")
        .withArgs(userAddress, userProxyAddress, FUNDING)
        // Delegatecall events cannot be checked for using ethers
        // .and.to.emit(userProxy, "LogAction") // optionalAction.Operation.Delegatecall
        // .withArgs(true)
        .and.to.emit(action, "LogAction") // otherOptionalAction.Operation.Call
        .withArgs(false);
    });

    it("Should fund, submit Tasks, and exec Actions", async function () {
      await expect(
        gelatoUserProxyFactory.createTwo(
          SALT_NONCE,
          [otherOptionalAction],
          [optionalTask],
          false,
          {
            value: FUNDING,
          }
        )
      )
        .to.emit(gelatoUserProxyFactory, "LogCreation")
        .withArgs(userAddress, userProxyAddress, FUNDING)
        .and.to.emit(gelatoCore, "LogTaskSubmitted")
        .and.to.emit(action, "LogAction")
        .withArgs(false);
    });
  });
});
