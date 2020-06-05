// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { ethers } = require("@nomiclabs/buidler");

const GELATO_GAS_PRICE = ethers.utils.parseUnits("8", "gwei");

const EXPIRY_DATE = 0;

describe("Gelato Core - Task Submission ", function () {
  let user;
  let provider;
  let executor;
  let sysAdmin;
  let userAddress;
  let providerAddress;
  let executorAddress;
  let userProxyAddress;
  let gelatoUserProxyFactory;
  let providerModuleGelatoUserProxy;
  let gelatoCore;
  let conditionDummyStruct;
  let actionDummyStruct;
  let gelatoProvider;
  let taskReceiptId = 1;
  let task;

  beforeEach(async function () {
    // Get signers
    [user, provider, executor, sysAdmin] = await ethers.getSigners();
    userAddress = await user.getAddress();
    providerAddress = await provider.getAddress();
    executorAddress = await executor.getAddress();

    // Deploy Gelato Core with SysAdmin + Stake Executor
    const GelatoCore = await ethers.getContractFactory("GelatoCore", sysAdmin);
    gelatoCore = await GelatoCore.deploy(gelatoSysAdminInitialState);
    await gelatoCore
      .connect(executor)
      .stakeExecutor({ value: ethers.utils.parseUnits("1", "ether") });

    // Deploy Gelato Gas Price Oracle with SysAdmin and set to GELATO_GAS_PRICE
    const GelatoGasPriceOracle = await ethers.getContractFactory(
      "GelatoGasPriceOracle",
      sysAdmin
    );
    const gelatoGasPriceOracle = await GelatoGasPriceOracle.deploy(
      GELATO_GAS_PRICE
    );

    // Set gas price oracle on core
    await gelatoCore
      .connect(sysAdmin)
      .setGelatoGasPriceOracle(gelatoGasPriceOracle.address);

    // Deploy GelatoUserProxyFactory with SysAdmin
    const GelatoUserProxyFactory = await ethers.getContractFactory(
      "GelatoUserProxyFactory",
      sysAdmin
    );
    gelatoUserProxyFactory = await GelatoUserProxyFactory.deploy(
      gelatoCore.address
    );

    // Deploy ProviderModuleGelatoUserProxy with constructorArgs
    const ProviderModuleGelatoUserProxy = await ethers.getContractFactory(
      "ProviderModuleGelatoUserProxy",
      sysAdmin
    );
    providerModuleGelatoUserProxy = await ProviderModuleGelatoUserProxy.deploy(
      gelatoUserProxyFactory.address,
      constants.AddressZero // placeholder for multiSend
    );

    // Deploy Dummy Condition
    const DummyConditionFactory = await ethers.getContractFactory(
      "MockConditionDummy"
    );
    const conditionDummy = await DummyConditionFactory.deploy();
    await conditionDummy.deployed();

    // Deploy Actions
    // // ERCTransferFROM
    const ActionDummyFactory = await ethers.getContractFactory(
      "MockActionDummy"
    );
    const actionDummy = await ActionDummyFactory.deploy();
    await actionDummy.deployed();

    // Call provideFunds(value) with provider on core
    await gelatoCore.connect(provider).provideFunds(providerAddress, {
      value: ethers.utils.parseUnits("1", "ether"),
    });

    actionDummyStruct = new Action({
      addr: actionDummy.address,
      data: constants.HashZero,
      operation: Operation.Delegatecall,
      termsOkCheck: true,
    });

    conditionDummyStruct = new Condition({
      inst: conditionDummy.address,
      data: constants.HashZero,
    });

    // GelatoProvider
    gelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: providerModuleGelatoUserProxy.address,
    });

    // Task
    task = new Task({
      actions: [actionDummyStruct],
    });

    // Call multiProvideexecutor, TaskSpecs[], providerModules[])
    await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [],
        [providerModuleGelatoUserProxy.address]
      );

    // Create UserProxy
    const createTx = await gelatoUserProxyFactory.connect(user).create();
    await createTx.wait();
    [userProxyAddress] = await gelatoUserProxyFactory.gelatoProxiesByUser(
      userAddress
    );
  });

  describe("GelatoCore.canSubmit Tests", function () {
    it("#1: Executor not minStaked", async function () {
      const fakeGelatoProvider = new GelatoProvider({
        addr: userAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      expect(
        await gelatoCore.canSubmitTask(
          userProxyAddress,
          fakeGelatoProvider,
          task,
          EXPIRY_DATE
        )
      ).to.equal("GelatoCore.canSubmitTask: executor not minStaked");
    });

    it("#2: expiryDate", async function () {
      const expiryDateInPast = 1586776139;

      expect(
        await gelatoCore.canSubmitTask(
          userProxyAddress,
          gelatoProvider,
          task,
          expiryDateInPast
        )
      ).to.equal("GelatoCore.canSubmitTask: expiryDate");
    });

    it("#3: Action not provided: TaskSpecNotProvided", async function () {
      expect(
        await gelatoCore.canSubmitTask(
          userProxyAddress,
          gelatoProvider,
          task,
          EXPIRY_DATE
        )
      ).to.equal("GelatoCore.canSubmitTask.isProvided:TaskSpecNotProvided");

      await gelatoCore.connect(provider).provideTaskSpecs([
        new TaskSpec({
          actions: task.actions,
          gasPriceCeil: utils.parseUnits("20", "gwei"),
        }),
      ]);

      expect(
        await gelatoCore.canSubmitTask(
          userProxyAddress,
          gelatoProvider,
          task,
          EXPIRY_DATE
        )
      ).to.equal("OK");
    });

    it("#4: Condition not provided: TaskSpecNotProvided", async function () {
      await gelatoCore.connect(provider).provideTaskSpecs([
        new TaskSpec({
          actions: task.actions,
          gasPriceCeil: utils.parseUnits("20", "gwei"),
        }),
      ]);

      expect(
        await gelatoCore.canSubmitTask(
          userProxyAddress,
          gelatoProvider,
          task,
          EXPIRY_DATE
        )
      ).to.equal("OK");

      // Add non-provided Condition to task
      task.conditions.push(conditionDummyStruct);

      expect(
        await gelatoCore.canSubmitTask(
          userProxyAddress,
          gelatoProvider,
          task,
          EXPIRY_DATE
        )
      ).to.equal("GelatoCore.canSubmitTask.isProvided:TaskSpecNotProvided");
    });

    it("#5: InvalidProviderModule", async function () {
      await gelatoCore.connect(provider).provideTaskSpecs([
        new TaskSpec({
          actions: task.actions,
          gasPriceCeil: utils.parseUnits("20", "gwei"),
        }),
      ]);

      expect(
        await gelatoCore.canSubmitTask(
          userProxyAddress,
          gelatoProvider,
          task,
          EXPIRY_DATE
        )
      ).to.equal("OK");

      const gelatoProviderWithFakeModule = new GelatoProvider({
        addr: providerAddress,
        module: constants.AddressZero,
      });

      // GelatoCore.canSubmitTask.isProvided:InvalidProviderModule
      expect(
        await gelatoCore.canSubmitTask(
          userProxyAddress,
          gelatoProviderWithFakeModule,
          task,
          EXPIRY_DATE
        )
      ).to.equal("GelatoCore.canSubmitTask.isProvided:InvalidProviderModule");
    });
  });
});
