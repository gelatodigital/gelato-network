// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect, assert } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");
//
const GELATO_GAS_PRICE = ethers.utils.parseUnits("8", "gwei");

// ##### Gnosis Action Test Cases #####
// 1. All sellTokens got converted into buy tokens, sufficient for withdrawal
// 2. All sellTokens got converted into buy tokens, insufficient for withdrawal
// 3. SellTokens got partially converted into buy tokens, insufficient buy tokens for withdrawal
// 4. No sellTokens got converted into buy tokens, sufficient sell tokens for withdrawal
// 5. No sellTokens got converted into buy tokens, insufficient sell tokens for withdrawal
describe("GelatoCore.cancelTask", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
  let seller;
  let provider;
  let executor;
  let sysAdmin;
  let userProxy;
  let sellerAddress;
  let providerAddress;
  let executorAddress;
  let sysAdminAddress;
  let userProxyAddress;
  let providerModuleGelatoUserProxy;
  let gelatoCore;
  let mockActionDummy;

  let task;

  let taskReceipt;
  let taskReceipt2;

  // ###### GelatoCore Setup ######
  beforeEach(async function () {
    // Get signers
    [seller, provider, executor, sysAdmin] = await ethers.getSigners();
    sellerAddress = await seller.getAddress();
    providerAddress = await provider.getAddress();
    executorAddress = await executor.getAddress();
    sysAdminAddress = await sysAdmin.getAddress();

    // Deploy Gelato Core with SysAdmin + Stake Executor
    const GelatoCore = await ethers.getContractFactory("GelatoCore", sysAdmin);
    gelatoCore = await GelatoCore.deploy();
    await gelatoCore.deployed();
    await gelatoCore
      .connect(executor)
      .stakeExecutor({ value: ethers.utils.parseUnits("1", "ether") });

    // Deploy Gelato Gas Price Oracle with SysAdmin and set to GELATO_GAS_PRICE
    const GelatoGasPriceOracle = await ethers.getContractFactory(
      "GelatoGasPriceOracle",
      sysAdmin
    );
    const gelatoGasPriceOracle = await GelatoGasPriceOracle.deploy(
      gelatoCore.address,
      GELATO_GAS_PRICE
    );
    await gelatoGasPriceOracle.deployed();

    // Set gas price oracle on core
    await gelatoCore
      .connect(sysAdmin)
      .setGelatoGasPriceOracle(gelatoGasPriceOracle.address);

    // Deploy GelatoUserProxyFactory with SysAdmin
    const GelatoUserProxyFactory = await ethers.getContractFactory(
      "GelatoUserProxyFactory",
      sysAdmin
    );
    const gelatoUserProxyFactory = await GelatoUserProxyFactory.deploy(
      gelatoCore.address
    );
    await gelatoUserProxyFactory.deployed();

    // Deploy ProviderModuleGelatoUserProxy with constructorArgs
    const ProviderModuleGelatoUserProxy = await ethers.getContractFactory(
      "ProviderModuleGelatoUserProxy",
      sysAdmin
    );
    providerModuleGelatoUserProxy = await ProviderModuleGelatoUserProxy.deploy(
      gelatoUserProxyFactory.address
    );
    await providerModuleGelatoUserProxy.deployed();

    // Provide TaskSpec
    const MockActionDummy = await ethers.getContractFactory(
      "MockActionDummy",
      sysAdmin
    );

    mockActionDummy = await MockActionDummy.deploy();
    await mockActionDummy.deployed();

    const mockActionDummyGelato = new Action({
      addr: mockActionDummy.address,
      data: constants.HashZero,
      operation: Operation.Delegatecall,
      termsOkCheck: true,
    });

    // Provider registers new acttion

    const newTaskSpec2 = new TaskSpec({
      actions: [mockActionDummyGelato],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    // Call provideFunds(value) with provider on core
    await gelatoCore.connect(provider).provideFunds(providerAddress, {
      value: ethers.utils.parseUnits("1", "ether"),
    });

    // Instantiate ProviderModule that reverts in execPayload()

    await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [newTaskSpec2],
        [providerModuleGelatoUserProxy.address]
      );

    // Create UserProxy
    const createTx = await gelatoUserProxyFactory
      .connect(seller)
      .create([], [], false);
    await createTx.wait();
    userProxyAddress = await gelatoUserProxyFactory.gelatoProxyByUser(
      sellerAddress
    );
    userProxy = await ethers.getContractAt("GelatoUserProxy", userProxyAddress);

    const abi = ["function action(bool)"];
    const interFace = new utils.Interface(abi);

    const actionData = interFace.functions.action.encode([true]);

    const gelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: providerModuleGelatoUserProxy.address,
    });

    const action = new Action({
      addr: mockActionDummy.address,
      data: actionData,
      operation: Operation.Delegatecall,
      value: 0,
      termsOkCheck: true,
    });

    task = new Task({
      base: new TaskBase({
        provider: gelatoProvider,
        actions: [action],
        expiryDate: constants.HashZero,
      }),
    });

    taskReceipt = {
      id: 1,
      userProxy: userProxyAddress,
      task,
    };

    taskReceipt2 = {
      id: 2,
      userProxy: userProxyAddress,
      task,
    };

    const submitTaskTx = await userProxy.submitTask(task);
    await submitTaskTx.wait();
  });

  // We test different functionality of the contract as normal Mocha tests.
  it("#1: Cancel task succesfully as user", async function () {
    await expect(userProxy.cancelTask(taskReceipt))
      .to.emit(gelatoCore, "LogTaskCancelled")
      .withArgs(taskReceipt.id);
  });

  it("#2: Cancel task succesfully as provider", async function () {
    await expect(gelatoCore.connect(provider).cancelTask(taskReceipt))
      .to.emit(gelatoCore, "LogTaskCancelled")
      .withArgs(taskReceipt.id);
  });

  it("#3: Cancel task unsuccesfully as random third party", async function () {
    await expect(
      gelatoCore.connect(executor).cancelTask(taskReceipt)
    ).to.be.revertedWith("GelatoCore.cancelTask: sender");
  });

  it("#4: Cancel task unsuccesfully due to wrong taskReceipt input", async function () {
    await expect(
      gelatoCore.connect(provider).cancelTask(taskReceipt2)
    ).to.be.revertedWith(
      "VM Exception while processing transaction: revert GelatoCore.cancelTask: invalid taskReceiptHash"
    );
  });

  it("#5: Multi Cancel task succesfully as user", async function () {
    // submit second Task
    const submitTaskTx = await userProxy.submitTask(task);
    await submitTaskTx.wait();

    await expect(userProxy.multiCancelTasks([taskReceipt, taskReceipt2]))
      .to.emit(gelatoCore, "LogTaskCancelled")
      .withArgs(taskReceipt.id)
      .to.emit(gelatoCore, "LogTaskCancelled")
      .withArgs(taskReceipt2.id);
  });

  it("#6: Multi Cancel task succesfully as provider", async function () {
    // submit second Task
    const submitTaskTx = await userProxy.submitTask(task);
    await submitTaskTx.wait();

    await expect(
      userProxy.connect(provider).multiCancelTasks([taskReceipt, taskReceipt2])
    )
      .to.emit(gelatoCore, "LogTaskCancelled")
      .withArgs(taskReceipt.id)
      .to.emit(gelatoCore, "LogTaskCancelled")
      .withArgs(taskReceipt2.id);
  });
});
