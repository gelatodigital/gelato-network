// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

const { run } = require("@nomiclabs/buidler");

describe("User Proxies - GelatoUserProxy - execActionsAndSubmitTaskCycle", function () {
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
  let gelatoProvider;

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

    const GelatoMultiSend = await ethers.getContractFactory("GelatoMultiSend");
    const gelatoMultiSend = await GelatoMultiSend.deploy();
    await gelatoMultiSend.deployed();

    providerModuleGelatoUserProxy = await ProviderModuleGelatoUserProxyFactory.deploy(
      gelatoUserProxyFactory.address,
      gelatoMultiSend.address
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
      operation: Operation.Call,
    });

    // optionalTask
    gelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: providerModuleGelatoUserProxy.address,
    });
    optionalTask = new Task({
      provider: gelatoProvider,
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

  describe("GelatoUserProxyFactory.execActionsAndSubmitTaskCycle", function () {
    it("Should execute actions before submiting a task on gelato using execActionsAndSubmitTaskCycle", async function () {
      const tx = await gelatoUserProxyFactory.create();
      await tx.wait();
      const [
        gelatoUserProxyAddress,
      ] = await gelatoUserProxyFactory.gelatoProxiesByUser(userAddress);
      const gelatoUserProxy = await ethers.getContractAt(
        "GelatoUserProxy",
        gelatoUserProxyAddress
      );

      await expect(
        gelatoUserProxy
          .connect(user)
          .execActionsAndSubmitTaskCycle(
            [optionalAction],
            gelatoProvider,
            [optionalTask],
            0,
            4
          )
      )
        .to.emit(gelatoCore, "LogTaskSubmitted")
        .and.to.emit(action, "LogAction");
    });

    it("Don't execute action before submiting a task on gelato using execActionsAndSubmitTaskCycle", async function () {
      const tx = await gelatoUserProxyFactory.create();
      await tx.wait();
      const [
        gelatoUserProxyAddress,
      ] = await gelatoUserProxyFactory.gelatoProxiesByUser(userAddress);
      const gelatoUserProxy = await ethers.getContractAt(
        "GelatoUserProxy",
        gelatoUserProxyAddress
      );

      await expect(
        gelatoUserProxy
          .connect(user)
          .execActionsAndSubmitTaskCycle(
            [],
            gelatoProvider,
            [optionalTask],
            0,
            4
          )
      ).to.emit(gelatoCore, "LogTaskSubmitted");
    });
  });
});
