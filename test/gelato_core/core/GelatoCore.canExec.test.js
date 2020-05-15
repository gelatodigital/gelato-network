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
  let tx;
  let txResponse;
  let providerModuleGelatoUserProxy;
  let gelatoCore;
  let taskReceipt;
  let gelatoGasPriceOracle;
  let gelatoProvider;
  let condition;
  let action;
  let newTaskSpec;

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
    gelatoCore = await GelatoCore.deploy(gelatoSysAdminInitialState);
    await gelatoCore.deployed();
    await gelatoCore
      .connect(executor)
      .stakeExecutor({ value: ethers.utils.parseUnits("1", "ether") });

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

    // Deploy ProviderModuleGelatoUserProxy with constructorArgs
    const ProviderModuleGelatoUserProxy = await ethers.getContractFactory(
      "ProviderModuleGelatoUserProxy",
      sysAdmin
    );
    providerModuleGelatoUserProxy = await ProviderModuleGelatoUserProxy.deploy(
      gelatoUserProxyFactory.address
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

    newTaskSpec = new TaskSpec({
      actions: [mockActionDummyGelato],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    // Call multiProvide for actionWithdrawBatchExchange
    await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [newTaskSpec],
        [providerModuleGelatoUserProxy.address]
      );

    // Create UserProxy
    const createTx = await gelatoUserProxyFactory.connect(seller).create();
    await createTx.wait();
    [userProxyAddress] = await gelatoUserProxyFactory.gelatoProxiesByUser(
      sellerAddress
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

  // We test different functionality of the contract as normal Mocha tests.
  it("#1: CanExec - Call view func with too low Gas Price is OK as we check it in exec)", async function () {
    const canExecReturn = await gelatoCore
      .connect(executor)
      .canExec(
        taskReceipt,
        GELATO_MAX_GAS,
        ethers.utils.parseUnits("1", "gwei")
      );

    expect(canExecReturn).to.equal("OK");
  });

  it("#2: CanExec - Call view func with too high gas price leading to insufficient provider funds)", async function () {
    await gelatoGasPriceOracle
      .connect(sysAdmin)
      .setGasPrice(ethers.utils.parseUnits("300", "ether"));

    const canExecReturn = await gelatoCore
      .connect(executor)
      .canExec(
        taskReceipt,
        GELATO_MAX_GAS,
        ethers.utils.parseUnits("300", "ether")
      );

    expect(canExecReturn).to.equal("ProviderIlliquidity");
  });

  it("#3: CanExec - Task Receipt expired", async function () {
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

  it("#4: CanExec - Fail due to provider module check failure, not whitelisted action)", async function () {
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

    await gelatoCore.connect(provider).unprovideTaskSpecs([newTaskSpec]);

    const canExecReturn = await gelatoCore
      .connect(executor)
      .canExec(taskReceipt2, GELATO_MAX_GAS, GELATO_GAS_PRICE);

    expect(canExecReturn).to.equal("taskSpecGasPriceCeil-OR-notProvided");
  });

  it("#5: CanExec - Return Ok when called via executor)", async function () {
    const canExecReturn = await gelatoCore
      .connect(executor)
      .canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE);

    expect(canExecReturn).to.equal("OK");
  });

  it("#6: CanExec - Return InvalidExecutor when called NOT via executor)", async function () {
    const canExecReturn = await gelatoCore
      .connect(provider)
      .canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE);

    expect(canExecReturn).to.equal("InvalidExecutor");
  });

  it("#7: CanExec - Call view func with higher Gas Price)", async function () {
    const canExecReturn = await gelatoCore
      .connect(executor)
      .canExec(
        taskReceipt,
        GELATO_MAX_GAS,
        ethers.utils.bigNumberify("800", "Gwei")
      );

    expect(canExecReturn).to.equal("OK");
  });
});
