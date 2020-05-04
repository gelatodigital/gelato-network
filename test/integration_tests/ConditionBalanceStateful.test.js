// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");

import initialStateSysAdmin from "../gelato_core/base/gelato_sys_admin/GelatoSysAdmin.initialState";
import initialStateGasPriceOracle from "../gelato_core/base/gelato_gas_price_oracle/GelatoGasPriceOracle.initialState";
import { constants } from "ethers";

const GELATO_MAX_GAS = initialStateSysAdmin.gelatoMaxGas;
const GELATO_GAS_PRICE = initialStateGasPriceOracle.gasPrice;

describe("Balanced based Condition integration test with 10x auto execution", function () {
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
  let MockERC20;
  let sellToken;
  let sellDecimals;
  let conditionBalanceStateful;
  let mockActionDummy;

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
    gelatoGasPriceOracle = await GelatoGasPriceOracle.deploy(
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

    // Call provideFunds(value) with provider on core
    await gelatoCore.connect(provider).provideFunds(providerAddress, {
      value: ethers.utils.parseUnits("1", "ether"),
    });

    // Create UserProxy
    const createTx = await gelatoUserProxyFactory
      .connect(seller)
      .create([], []);
    await createTx.wait();
    userProxyAddress = await gelatoUserProxyFactory.gelatoProxyByUser(
      sellerAddress
    );
    userProxy = await ethers.getContractAt("GelatoUserProxy", userProxyAddress);

    MockERC20 = await ethers.getContractFactory("MockERC20");

    // DEPLOY DUMMY ERC20s
    // // Deploy Sell Token
    sellDecimals = 18;
    sellToken = await MockERC20.deploy(
      "DAI",
      (100 * 10 ** sellDecimals).toString(),
      sellerAddress,
      sellDecimals
    );
    await sellToken.deployed();

    // Register new provider TaskSpec on core with provider #######################
    const ConditionBalanceStateful = await ethers.getContractFactory(
      "ConditionBalanceStateful"
    );

    conditionBalanceStateful = await ConditionBalanceStateful.deploy();
    await conditionBalanceStateful.deployed();

    const condition = new Condition({
      inst: conditionBalanceStateful.address,
      data: constants.HashZero,
    });

    // Call multiProvide for mockConditionDummy + actionERC20TransferFrom
    // Provider registers new condition
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

    gelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: providerModuleGelatoUserProxy.address,
    });

    const actionSetRef = new Action({
      addr: conditionBalanceStateful.address,
      data: constants.HashZero,
      operation: Operation.Call,
    });

    newTaskSpec = new TaskSpec({
      provider: gelatoProvider,
      conditions: [condition.inst],
      actions: [mockActionDummyGelato, actionSetRef],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      autoSubmitNextTask: true,
    });

    // Call multiProvide for actionWithdrawBatchExchange
    await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [newTaskSpec],
        [providerModuleGelatoUserProxy.address]
      );
  });

  // We test different functionality of the contract as normal Mocha tests.
  it("#1: Succesfully exec Condition Balance Stateful task 10 times in a row ", async function () {
    // address _proxy, address _account, address _token, uint256, bool _greaterElseSmaller
    const conditionData = await run("abi-encode-withselector", {
      contractname: "ConditionBalanceStateful",
      functionname: "ok",
      inputs: [userProxyAddress, sellerAddress, sellToken.address, true],
    });

    const actionData = await run("abi-encode-withselector", {
      contractname: "MockActionDummy",
      functionname: "action",
      inputs: [true],
    });

    let condition = new Condition({
      inst: conditionBalanceStateful.address,
      data: conditionData,
    });

    let action = new Action({
      addr: mockActionDummy.address,
      data: actionData,
      operation: Operation.Delegatecall,
      termsOkCheck: true,
    });

    // Set RefBalance and create task on gelato in one tx
    let changeFactor = ethers.utils.parseUnits("1", sellDecimals);

    const setRefData = await run("abi-encode-withselector", {
      contractname: "ConditionBalanceStateful",
      functionname: "setRefBalance",
      inputs: [changeFactor, sellToken.address, sellerAddress, true],
    });

    const actionSetRef = new Action({
      addr: conditionBalanceStateful.address,
      data: setRefData,
      operation: Operation.Call,
    });

    const task = new Task({
      provider: gelatoProvider,
      conditions: [condition],
      actions: [action, actionSetRef],
      expiryData: 0,
      autoSubmitNextTask: true,
    });

    const submitTaskData = await run("abi-encode-withselector", {
      contractname: "GelatoCore",
      functionname: "submitTask",
      inputs: [task],
    });

    const actionSubmitTask = new Action({
      addr: gelatoCore.address,
      data: submitTaskData,
      operation: Operation.Call,
      termsOkCheck: false,
      value: 0,
    });

    const taskReceipt = {
      id: 1,
      userProxy: userProxyAddress,
      task,
    };

    await userProxy
      .connect(seller)
      .multiExecActions([actionSetRef, actionSubmitTask]);

    let canExecReturn = await gelatoCore
      .connect(executor)
      .canExec(executorAddress, taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE);

    expect(canExecReturn).to.equal(
      "ConditionNotOk:NotOkERC20BalanceIsNotGreaterThanRefBalance"
    );

    await sellToken.create(sellerAddress, changeFactor);

    canExecReturn = await gelatoCore
      .connect(executor)
      .canExec(executorAddress, taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE);

    expect(canExecReturn).to.equal("OK");

    await expect(
      gelatoCore.connect(executor).exec(taskReceipt, {
        gasPrice: GELATO_GAS_PRICE,
        gasLimit: GELATO_MAX_GAS,
      })
    )
      .to.emit(gelatoCore, "LogExecSuccess")
      .to.emit(gelatoCore, "LogTaskSubmitted");

    // ##################################### First execution DONE
    for (let i = 0; i < 10; i++) {
      taskReceipt.id++;

      canExecReturn = await gelatoCore
        .connect(executor)
        .canExec(
          executorAddress,
          taskReceipt,
          GELATO_MAX_GAS,
          GELATO_GAS_PRICE
        );

      expect(canExecReturn).to.equal(
        "ConditionNotOk:NotOkERC20BalanceIsNotGreaterThanRefBalance"
      );

      await sellToken.create(sellerAddress, changeFactor);

      canExecReturn = await gelatoCore
        .connect(executor)
        .canExec(
          executorAddress,
          taskReceipt,
          GELATO_MAX_GAS,
          GELATO_GAS_PRICE
        );

      expect(canExecReturn).to.equal("OK");

      await expect(
        gelatoCore.connect(executor).exec(taskReceipt, {
          gasPrice: GELATO_GAS_PRICE,
          gasLimit: GELATO_MAX_GAS,
        })
      )
        .to.emit(gelatoCore, "LogExecSuccess")
        .to.emit(gelatoCore, "LogTaskSubmitted");
    }

    // ##################################### Second execution DONE
  });
});
