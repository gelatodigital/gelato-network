// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers, utils } = require("@nomiclabs/buidler");

import initialStateSysAdmin from "../gelato_core/base/gelato_sys_admin/GelatoSysAdmin.initialState";
import initialStateGasPriceOracle from "../gelato_core/base/gelato_gas_price_oracle/GelatoGasPriceOracle.initialState";
import { Operation } from "../../src/classes/gelato/Action";

//

const GELATO_MAX_GAS = initialStateSysAdmin.gelatoMaxGas;
const GELATO_GAS_PRICE = initialStateGasPriceOracle.gasPrice;

const EXPIRY_DATE = 0;
const SUBMISSIONS_LEFT = 1;

describe("Return Data Passing Tests", function () {
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
  let gelatoGasPriceOracle;
  let gelatoProvider;
  let condition;
  let action;
  let transferFromTaskSpec;
  let taskReceipt2;
  let gelatoMultiCall;
  let sellToken;
  let sellDecimals;
  let globalState;
  let providerFeeRelay;
  let actionTransferFrom;
  let memoryUint;
  let action2;
  let mockActionDummyUint;

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

    const GelatoMultiSend = await ethers.getContractFactory(
      "GelatoMultiSend",
      sysAdmin
    );
    const gelatoMultiSend = await GelatoMultiSend.deploy();
    await gelatoMultiSend.deployed();

    // Deploy ProviderModuleGelatoUserProxy with constructorArgs
    const ProviderModuleGelatoUserProxy = await ethers.getContractFactory(
      "ProviderModuleGelatoUserProxy",
      sysAdmin
    );
    providerModuleGelatoUserProxy = await ProviderModuleGelatoUserProxy.deploy(
      gelatoUserProxyFactory.address,
      gelatoMultiSend.address
    );
    await providerModuleGelatoUserProxy.deployed();

    // Call provideFunds(value) with provider on core
    await gelatoCore.connect(provider).provideFunds(providerAddress, {
      value: ethers.utils.parseUnits("1", "ether"),
    });

    // Register new provider TaskSpec on core with provider EDITS NEED ä#######################

    // Call multiProvide for mockConditionDummy + actionTransferFrom
    // Provider registers new condition
    const MockActionDummyUint = await ethers.getContractFactory(
      "MockActionDummyUint",
      sysAdmin
    );

    mockActionDummyUint = await MockActionDummyUint.deploy();
    await mockActionDummyUint.deployed();

    const ActionERC20TransferFrom = await ethers.getContractFactory(
      "ActionERC20TransferFrom",
      sysAdmin
    );

    actionTransferFrom = await ActionERC20TransferFrom.deploy();
    await actionTransferFrom.deployed();

    // Create UserProxy
    const createTx = await gelatoUserProxyFactory.connect(seller).create();
    await createTx.wait();
    [userProxyAddress] = await gelatoUserProxyFactory.gelatoProxiesByUser(
      sellerAddress
    );
    userProxy = await ethers.getContractAt("GelatoUserProxy", userProxyAddress);

    gelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: providerModuleGelatoUserProxy.address,
    });

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    sellDecimals = 18;
    sellToken = await MockERC20.deploy(
      "DAI",
      (100 * 10 ** sellDecimals).toString(),
      sellerAddress,
      sellDecimals
    );
    await sellToken.deployed();

    // ### Action #1
    memoryUint = 10;

    const actionData = await run("abi-encode-withselector", {
      contractname: "ActionERC20TransferFrom",
      functionname: "action",
      inputs: [
        sellerAddress,
        sellToken.address,
        executorAddress,
        memoryUint,
        true,
      ],
    });

    action = new Action({
      addr: actionTransferFrom.address,
      data: actionData,
      operation: Operation.Delegatecall,
      value: 0,
      termsOkCheck: true,
    });

    // ### Whitelist Task Spec
    transferFromTaskSpec = new TaskSpec({
      actions: [action, action, action],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    // Call multiProvide for ActionPlaceOrderBatchExchange
    await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [transferFromTaskSpec],
        [providerModuleGelatoUserProxy.address]
      );
  });

  it("#1: Actions only use the in memory values for transferFrom action, not the encoded ones", async function () {
    const preBalance = await sellToken.balanceOf(sellerAddress);

    const sellAmounts = [100, 20, 0];
    // Create actions

    const actions = [];
    for (let i = 0; i < 3; i++) {
      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [
          sellerAddress,
          sellToken.address,
          executorAddress,
          sellAmounts[i],
          true,
        ],
      });

      action = new Action({
        addr: actionTransferFrom.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });
      actions.push(action);
    }

    const transferFromTask = new Task({
      actions: [actions[0], actions[1], actions[2]],
    });

    const taskReceiptTransferFrom = new TaskReceipt({
      id: 1,
      provider: gelatoProvider,
      userProxy: userProxyAddress,
      tasks: [transferFromTask],
      submissionsLeft: SUBMISSIONS_LEFT,
    });

    await expect(
      userProxy.submitTask(gelatoProvider, transferFromTask, EXPIRY_DATE)
    ).to.emit(gelatoCore, "LogTaskSubmitted");

    await sellToken.approve(userProxyAddress, 300);

    const canExecResult = await gelatoCore.connect(executor).canExec(
      taskReceiptTransferFrom, // Array of task Receipts
      GELATO_MAX_GAS,
      GELATO_GAS_PRICE
    );

    expect(canExecResult).to.be.equal("OK");
    // console.log(canExecResult);

    await expect(
      gelatoCore.connect(executor).exec(
        taskReceiptTransferFrom, // Array of task Receipts
        { gasLimit: 3000000 }
      )
    ).to.emit(gelatoCore, "LogExecSuccess");

    const postBalance = await sellToken.balanceOf(sellerAddress);
    const expectedDelta = ethers.utils.bigNumberify("300");

    // Provider checks
    expect(postBalance).to.be.equal(preBalance.sub(expectedDelta));
  });

  it("#2: Actions uses in memory values for the second action and calldata values for the third", async function () {
    const preBalance = await sellToken.balanceOf(sellerAddress);

    const sellAmounts = [100, 0, 20];
    // Create actions

    const actions = [];
    for (let i = 0; i < 3; i++) {
      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [
          sellerAddress,
          sellToken.address,
          executorAddress,
          sellAmounts[i],
          // for the last action, dont use in memory data
          i === 1 ? false : true,
        ],
      });

      action = new Action({
        addr: actionTransferFrom.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });
      actions.push(action);
    }

    const transferFromTask = new Task({
      actions: [actions[0], actions[1], actions[2]],
    });

    const taskReceiptTransferFrom = new TaskReceipt({
      id: 1,
      provider: gelatoProvider,
      userProxy: userProxyAddress,
      tasks: [transferFromTask],
      submissionsLeft: SUBMISSIONS_LEFT,
    });

    await expect(
      userProxy.submitTask(gelatoProvider, transferFromTask, EXPIRY_DATE)
    ).to.emit(gelatoCore, "LogTaskSubmitted");

    await sellToken.approve(userProxyAddress, 300);

    const canExecResult = await gelatoCore.connect(executor).canExec(
      taskReceiptTransferFrom, // Array of task Receipts
      GELATO_MAX_GAS,
      GELATO_GAS_PRICE
    );

    expect(canExecResult).to.be.equal("OK");
    // console.log(canExecResult);

    await expect(
      gelatoCore.connect(executor).exec(
        taskReceiptTransferFrom, // Array of task Receipts
        { gasLimit: 3000000 }
      )
    ).to.emit(gelatoCore, "LogExecSuccess");

    const postBalance = await sellToken.balanceOf(sellerAddress);
    const expectedDelta = ethers.utils.bigNumberify("220");

    // Provider checks
    expect(postBalance).to.be.equal(preBalance.sub(expectedDelta));
  });
});
