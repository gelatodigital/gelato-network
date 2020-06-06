// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");

import initialStateSysAdmin from "../base/gelato_sys_admin/GelatoSysAdmin.initialState";
import initialStateGasPriceOracle from "../base/gelato_gas_price_oracle/GelatoGasPriceOracle.initialState";

//

const GELATO_MAX_GAS = initialStateSysAdmin.gelatoMaxGas;
const GELATO_GAS_PRICE = initialStateGasPriceOracle.gasPrice;

const EXPIRY_DATE = 0;
const SUBMISSIONS_LEFT = 1;

// ##### Gnosis Action Test Cases #####
// 1. All sellTokens got converted into buy tokens, sufficient for withdrawal
// 2. All sellTokens got converted into buy tokens, insufficient for withdrawal
// 3. SellTokens got partially converted into buy tokens, insufficient buy tokens for withdrawal
// 4. No sellTokens got converted into buy tokens, sufficient sell tokens for withdrawal
// 5. No sellTokens got converted into buy tokens, insufficient sell tokens for withdrawal
describe("GelatoCore.canExec", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
  let user;
  let provider;
  let executor;
  let sysAdmin;
  let userProxy;
  let userAddress;
  let providerAddress;
  let executorAddress;
  let sysAdminAddress;
  let userProxyAddress;
  let tx;
  let txResponse;
  let providerModuleGelatoUserProxy;
  let gelatoCore;
  let taskReceipt;
  let gelatoGasPriceOracle;
  let gelatoProvider;
  let condition;
  let action;
  let taskSpec;

  // ###### GelatoCore Setup ######
  beforeEach(async function () {
    // Get signers
    [user, provider, executor, sysAdmin] = await ethers.getSigners();
    userAddress = await user.getAddress();
    providerAddress = await provider.getAddress();
    executorAddress = await executor.getAddress();
    sysAdminAddress = await sysAdmin.getAddress();

    // Deploy Gelato Core with SysAdmin + Stake Executor
    const GelatoCore = await ethers.getContractFactory("GelatoCore", sysAdmin);
    gelatoCore = await GelatoCore.deploy(gelatoSysAdminInitialState);
    await gelatoCore.deployed();
    await gelatoCore
      .connect(executor)
      .stakeExecutor({ value: await gelatoCore.minExecutorStake() });

    // Deploy Gelato Gas Price Oracle with SysAdmin and set to GELATO_GAS_PRICE
    const GelatoGasPriceOracle = await ethers.getContractFactory(
      "GelatoGasPriceOracle",
      sysAdmin
    );
    gelatoGasPriceOracle = await GelatoGasPriceOracle.deploy(GELATO_GAS_PRICE);
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

    const GelatoActionPipeline = await ethers.getContractFactory(
      "GelatoActionPipeline",
      sysAdmin
    );
    const gelatoActionPipeline = await GelatoActionPipeline.deploy();
    await gelatoActionPipeline.deployed();

    // Deploy ProviderModuleGelatoUserProxy with constructorArgs
    const ProviderModuleGelatoUserProxy = await ethers.getContractFactory(
      "ProviderModuleGelatoUserProxy",
      sysAdmin
    );
    providerModuleGelatoUserProxy = await ProviderModuleGelatoUserProxy.deploy(
      gelatoUserProxyFactory.address,
      gelatoActionPipeline.address
    );
    await providerModuleGelatoUserProxy.deployed();

    // Call provideFunds(value) with provider on core
    await gelatoCore.connect(provider).provideFunds(providerAddress, {
      value: ethers.utils.parseUnits("1", "ether"),
    });

    // Register new provider TaskSpec on core with provider EDITS NEED ä#######################

    // Call multiProvide for mockConditionDummy + actionERC20TransferFrom
    // Provider registers new condition
    const MockActionDummy = await ethers.getContractFactory(
      "MockActionDummy",
      sysAdmin
    );

    const mockActionDummy = await MockActionDummy.deploy();
    await mockActionDummy.deployed();

    const mockActionDummyGelato = new Action({
      addr: mockActionDummy.address,
      data: constants.HashZero,
      operation: Operation.Delegatecall,
      termsOkCheck: true,
    });

    taskSpec = new TaskSpec({
      actions: [mockActionDummyGelato],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    // Call multiProvide for actionWithdrawBatchExchange
    await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [taskSpec],
        [providerModuleGelatoUserProxy.address]
      );

    // Create UserProxy
    const createTx = await gelatoUserProxyFactory.connect(user).create();
    await createTx.wait();
    [userProxyAddress] = await gelatoUserProxyFactory.gelatoProxiesByUser(
      userAddress
    );
    userProxy = await ethers.getContractAt("GelatoUserProxy", userProxyAddress);

    const abi = ["function action(bool)"];
    const interFace = new utils.Interface(abi);

    const actionData = interFace.functions.action.encode([true]);

    gelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: providerModuleGelatoUserProxy.address,
    });

    action = new Action({
      addr: mockActionDummy.address,
      data: actionData,
      operation: Operation.Delegatecall,
      value: 0,
      termsOkCheck: true,
    });

    const task = new Task({
      actions: [action],
    });

    taskReceipt = new TaskReceipt({
      id: 1,
      provider: gelatoProvider,
      userProxy: userProxyAddress,
      tasks: [task],
      submissionsLeft: SUBMISSIONS_LEFT,
    });

    await expect(
      userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
    ).to.emit(gelatoCore, "LogTaskSubmitted");
  });

  it("#1: CanExec - ExecutorNotMinStaked", async function () {
    expect(
      await gelatoCore
        .connect(executor)
        .canExec(
          taskReceipt,
          GELATO_MAX_GAS,
          ethers.utils.parseUnits("1", "gwei")
        )
    ).to.equal("OK");

    const currentMinStake = await gelatoCore.minExecutorStake();

    await gelatoCore
      .connect(sysAdmin)
      .setMinExecutorStake(currentMinStake.add(1));

    expect(
      await gelatoCore
        .connect(executor)
        .canExec(
          taskReceipt,
          GELATO_MAX_GAS,
          ethers.utils.parseUnits("1", "gwei")
        )
    ).to.equal("ExecutorNotMinStaked");
  });

  it("#2: CanExec - Call view func with too low Gas Price is OK as we check it in exec)", async function () {
    expect(
      await gelatoCore
        .connect(executor)
        .canExec(
          taskReceipt,
          GELATO_MAX_GAS,
          ethers.utils.parseUnits("1", "gwei")
        )
    ).to.equal("OK");
  });

  it("#3: CanExec - Call view func with too high gas price leading to insufficient provider funds)", async function () {
    await gelatoGasPriceOracle
      .connect(sysAdmin)
      .setGasPrice(ethers.utils.parseUnits("300", "ether"));

    expect(
      await gelatoCore
        .connect(executor)
        .canExec(
          taskReceipt,
          GELATO_MAX_GAS,
          ethers.utils.parseUnits("300", "ether")
        )
    ).to.equal("ProviderIlliquidity");
  });

  it("#4: CanExec - Task Receipt expired", async function () {
    let oldBlock = await ethers.provider.getBlock();

    const lifespan = 420;
    const expiryDate = oldBlock.timestamp + lifespan;

    const task2 = new Task({
      actions: [action],
    });

    let taskReceipt2 = new TaskReceipt({
      id: 2,
      provider: gelatoProvider,
      userProxy: userProxyAddress,
      tasks: [task2],
      submissionsLeft: SUBMISSIONS_LEFT,
      expiryDate,
    });

    await expect(
      userProxy.submitTask(gelatoProvider, task2, expiryDate)
    ).to.emit(gelatoCore, "LogTaskSubmitted");

    await ethers.provider.send("evm_mine", [expiryDate]);

    expect(
      await gelatoCore
        .connect(executor)
        .canExec(taskReceipt2, GELATO_MAX_GAS, GELATO_GAS_PRICE)
    ).to.equal("TaskReceiptExpired");
  });

  it("#5: CanExec - Fail due to providerCanExec failure: notProvided)", async function () {
    const task2 = new Task({
      actions: [action],
    });

    let taskReceipt2 = new TaskReceipt({
      id: 2,
      provider: gelatoProvider,
      userProxy: userProxyAddress,
      tasks: [task2],
      submissionsLeft: SUBMISSIONS_LEFT,
    });

    await userProxy.submitTask(gelatoProvider, task2, EXPIRY_DATE);

    await gelatoCore.connect(provider).unprovideTaskSpecs([taskSpec]);

    expect(
      await gelatoCore
        .connect(executor)
        .canExec(taskReceipt2, GELATO_MAX_GAS, GELATO_GAS_PRICE)
    ).to.equal("taskSpecGasPriceCeil-OR-notProvided");
  });

  it("#6: CanExec - Fail due to providerCanExec failure: taskSpecGasPriceCeil)", async function () {
    await gelatoGasPriceOracle
      .connect(sysAdmin)
      .setGasPrice(taskSpec.gasPriceCeil.add(1));

    expect(
      await gelatoCore
        .connect(executor)
        .canExec(taskReceipt, GELATO_MAX_GAS, taskSpec.gasPriceCeil.add(1))
    ).to.equal("taskSpecGasPriceCeil-OR-notProvided");
  });

  it("#7: CanExec - SelfProvider: Fail due to SelfProviderGasPriceCeil", async function () {
    const selfProvider = new GelatoProvider({
      addr: userProxyAddress,
      module: providerModuleGelatoUserProxy.address,
    });

    const multiProvideData = await run("abi-encode-withselector", {
      contractname: "GelatoCore",
      functionname: "multiProvide",
      inputs: [executorAddress, [], [providerModuleGelatoUserProxy.address]],
    });

    const multiProvideAction = new Action({
      addr: gelatoCore.address,
      data: multiProvideData,
      value: utils.parseEther("1"),
      operation: Operation.Call,
    });

    await userProxy.execAction(multiProvideAction, {
      value: utils.parseEther("1"),
    });

    const selfProvidedTask = new Task({
      actions: [action],
      selfProviderGasPriceCeil: GELATO_GAS_PRICE,
    });

    await expect(
      userProxy.submitTask(selfProvider, selfProvidedTask, EXPIRY_DATE)
    ).to.emit(gelatoCore, "LogTaskSubmitted");

    const selfProvidedTaskReceipt = new TaskReceipt({
      id: 2,
      userProxy: userProxyAddress,
      provider: selfProvider,
      tasks: [selfProvidedTask],
    });

    expect(
      await gelatoCore
        .connect(executor)
        .canExec(selfProvidedTaskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE)
    ).to.equal("OK");

    await gelatoGasPriceOracle
      .connect(sysAdmin)
      .setGasPrice(GELATO_GAS_PRICE.add(1));

    expect(
      await gelatoCore
        .connect(executor)
        .canExec(
          selfProvidedTaskReceipt,
          GELATO_MAX_GAS,
          GELATO_GAS_PRICE.add(1)
        )
    ).to.equal("SelfProviderGasPriceCeil");
  });

  it("#8: CanExec - SelfProvider: Fail due to InvalidProviderModule", async function () {
    const selfProvider = new GelatoProvider({
      addr: userProxyAddress,
      module: providerModuleGelatoUserProxy.address,
    });

    const multiProvideData = await run("abi-encode-withselector", {
      contractname: "GelatoCore",
      functionname: "multiProvide",
      inputs: [executorAddress, [], []],
    });

    const multiProvideAction = new Action({
      addr: gelatoCore.address,
      data: multiProvideData,
      value: utils.parseEther("1"),
      operation: Operation.Call,
    });
    await userProxy.execAction(multiProvideAction, {
      value: utils.parseEther("1"),
    });

    const selfProvidedTask = new Task({
      actions: [action],
      selfProviderGasPriceCeil: GELATO_GAS_PRICE,
    });

    await expect(
      userProxy.submitTask(selfProvider, selfProvidedTask, EXPIRY_DATE)
    ).to.emit(gelatoCore, "LogTaskSubmitted");

    const selfProvidedTaskReceipt = new TaskReceipt({
      id: 2,
      userProxy: userProxyAddress,
      provider: selfProvider,
      tasks: [selfProvidedTask],
    });

    expect(
      await gelatoCore
        .connect(executor)
        .canExec(selfProvidedTaskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE)
    ).to.equal("InvalidProviderModule");

    // Provide the ProviderModule
    const addProviderModuleData = await run("abi-encode-withselector", {
      contractname: "GelatoCore",
      functionname: "addProviderModules",
      inputs: [[providerModuleGelatoUserProxy.address]],
    });

    const addProviderModuleAction = new Action({
      addr: gelatoCore.address,
      data: addProviderModuleData,
      operation: Operation.Call,
    });

    await userProxy.execAction(addProviderModuleAction);

    expect(
      await gelatoCore
        .connect(executor)
        .canExec(selfProvidedTaskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE)
    ).to.equal("OK");
  });

  it("#9: CanExec - Return Ok when called via executor)", async function () {
    expect(
      await gelatoCore
        .connect(executor)
        .canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE)
    ).to.equal("OK");
  });

  it("#10: CanExec - Return InvalidExecutor when called NOT via executor)", async function () {
    expect(
      await gelatoCore
        .connect(provider)
        .canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE)
    ).to.equal("InvalidExecutor");
  });

  it("#11: CanExec - Call view func with higher Gas Price)", async function () {
    expect(
      await gelatoCore
        .connect(executor)
        .canExec(
          taskReceipt,
          GELATO_MAX_GAS,
          ethers.utils.bigNumberify("800", "Gwei")
        )
    ).to.equal("OK");
  });
});
