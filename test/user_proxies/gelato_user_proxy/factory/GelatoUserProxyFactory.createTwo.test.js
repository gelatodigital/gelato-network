// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

const { run } = require("@nomiclabs/buidler");

const SALT_NONCE = 42069;
const OTHER_SALT_NONCE = 69420;

describe("User Proxies - GelatoUserProxyFactory: CREATE TWO", function () {
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

  describe("GelatoUserProxyFactory.createTwo", function () {
    it("Should allow anyone to createTwo a userProxy", async function () {
      // predictProxyAddress: user
      const predictedUserProxyAddress = await gelatoUserProxyFactory.predictProxyAddress(
        userAddress,
        SALT_NONCE
      );

      // createTwo(): user
      await expect(gelatoUserProxyFactory.createTwo(SALT_NONCE, [], []))
        .to.emit(gelatoUserProxyFactory, "LogCreation")
        .withArgs(userAddress, predictedUserProxyAddress);

      // gelatoProxyByUser
      expect(
        await gelatoUserProxyFactory.gelatoProxyByUser(userAddress)
      ).to.be.equal(predictedUserProxyAddress);

      // userByGelatoProxy
      expect(
        await gelatoUserProxyFactory.userByGelatoProxy(
          predictedUserProxyAddress
        )
      ).to.be.equal(userAddress);

      // isGelatoUserProxy
      expect(
        await gelatoUserProxyFactory.isGelatoUserProxy(
          predictedUserProxyAddress
        )
      ).to.be.true;

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
        gelatoUserProxyFactory.connect(otherUser).createTwo(SALT_NONCE, [], [])
      )
        .to.emit(gelatoUserProxyFactory, "LogCreation")
        .withArgs(otherUserAddress, predictedOtherUserProxyAddress);

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

    // it("Should allow to re-createTwo a userProxy using a different salt", async function () {
    //   // createTwo(): user firstProxy
    //   const tx = await gelatoUserProxyFactory.createTwo(SALT_NONCE, [], []);
    //   await tx.wait();

    //   // gelatoProxyByUser: first proxy
    //   const firstUserGelatoProxy = await gelatoUserProxyFactory.gelatoProxyByUser(
    //     userAddress
    //   );

    //   // predictProxyAddress: secondProxy
    //   const secondUserProxyAddress = await gelatoUserProxyFactory.predictProxyAddress(
    //     userAddress,
    //     SALT_NONCE
    //   );

    //   // createTwo(): user secondProxy
    //   await expect(gelatoUserProxyFactory.createTwo(OTHER_SALT_NONCE))
    //     .to.emit(gelatoUserProxyFactory, "LogCreation")
    //     .withArgs(userAddress, secondUserProxyAddress);

    //   // gelatoProxyByUser: secondProxy
    //   const secondUserGelatoProxy = await gelatoUserProxyFactory.gelatoProxyByUser(
    //     userAddress
    //   );
    //   expect(secondUserGelatoProxy).to.be.equal(secondUserProxyAddress);
    //   expect(secondUserGelatoProxy).to.not.be.equal(firstUserGelatoProxy);

    //   // userByGelatoProxy: secondProxy
    //   expect(
    //     await gelatoUserProxyFactory.userByGelatoProxy(secondUserGelatoProxy)
    //   ).to.be.equal(userAddress);

    //   // isGelatoUserProxy: secondProxy
    //   expect(
    //     await gelatoUserProxyFactory.isGelatoUserProxy(secondUserGelatoProxy)
    //   ).to.be.true;
    //   // isGelatoProxyUser: secondProxy
    //   expect(await gelatoUserProxyFactory.isGelatoProxyUser(userAddress)).to.be
    //     .true;
    // });
  });
  /*
  describe("GelatoUserProxyFactory.createTwo: _submitTasks & _execActions", function () {
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
      )
        .to.emit(gelatoCore, "LogSubmitTask")
        .and.to.emit(gelatoCore, "LogSubmitTask");
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

    it("Should exec submit optional Tasks and exec optional Actions", async function () {
      await expect(
        gelatoUserProxyFactory.create([optionalTask], [otherOptionalAction])
      )
        .to.emit(gelatoCore, "LogSubmitTask")
        .and.to.emit(action, "LogAction")
        .withArgs(false);
    });
  }); */
});
