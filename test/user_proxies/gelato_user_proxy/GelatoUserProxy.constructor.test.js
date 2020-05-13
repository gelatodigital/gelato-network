// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

const { run } = require("@nomiclabs/buidler");

describe("User Proxies - GelatoUserProxy - CONSTRUCTOR", function () {
  let GelatoCoreFactory;
  let GelatoUserProxyFactoryFactory;
  let ProviderModuleGelatoUserProxyFactory;
  let ActionFactory;

  let gelatoCore;
  let gelatoUserProxyFactory;
  let action;
  let providerModuleGelatoUserProxy;

  let user;
  let notUser;
  let provider;
  let executor;

  let userAddress;
  let notUserAddress;
  let providerAddress;
  let executorAddress;

  let optionalAction;
  let optionalTask;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCoreFactory = await ethers.getContractFactory("GelatoCore");
    GelatoUserProxyFactoryFactory = await ethers.getContractFactory(
      "GelatoUserProxyFactory"
    );
    ProviderModuleGelatoUserProxyFactory = await ethers.getContractFactory(
      "ProviderModuleGelatoUserProxy"
    );

    ActionFactory = await ethers.getContractFactory("MockActionDummy");

    gelatoCore = await GelatoCoreFactory.deploy(gelatoSysAdminInitialState);
    gelatoUserProxyFactory = await GelatoUserProxyFactoryFactory.deploy(
      gelatoCore.address
    );
    providerModuleGelatoUserProxy = await ProviderModuleGelatoUserProxyFactory.deploy(
      gelatoUserProxyFactory.address
    );
    action = await ActionFactory.deploy();

    await gelatoCore.deployed();
    await gelatoUserProxyFactory.deployed();
    await providerModuleGelatoUserProxy.deployed();
    await action.deployed();

    // users
    [user, notUser, provider, executor] = await ethers.getSigners();
    userAddress = await user.getAddress();
    notUserAddress = await notUser.getAddress();
    providerAddress = await provider.getAddress();
    executorAddress = await executor.getAddress();

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
  });

  describe("GelatoUserProxyFactory.constructor: state vars", function () {
    it("Should store user address", async function () {
      const tx = await gelatoUserProxyFactory.create([], [], []);
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
      const tx = await gelatoUserProxyFactory.create([], [], []);
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
});
