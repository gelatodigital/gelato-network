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

describe("GlobalState Tests", function () {
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
  let taskSpecWithProviderStateSetter;
  let taskReceipt;
  let taskReceipt2;
  let gelatoMultiCall;
  let sellToken;
  let sellDecimals;
  let globalState;
  let providerFeeRelay;
  let actionTransferFromGlobal;
  let sendAmount;
  let action1;
  let action2;

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

    // Instantiate GlobalState
    const GlobalState = await ethers.getContractFactory(
      "GlobalState",
      sysAdmin
    );
    globalState = await GlobalState.deploy();
    await globalState.deployed();

    // Instantiate ProviderFeeRelay
    const ProviderFeeRelay = await ethers.getContractFactory(
      "ProviderFeeRelay",
      provider
    );
    providerFeeRelay = await ProviderFeeRelay.deploy(
      globalState.address,
      providerAddress
    );
    await providerFeeRelay.deployed();

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

    // Call multiProvide for mockConditionDummy + actionTransferFromGlobal
    // Provider registers new condition
    const ActionERC20TransferFromGlobal = await ethers.getContractFactory(
      "ActionERC20TransferFromGlobal",
      sysAdmin
    );

    actionTransferFromGlobal = await ActionERC20TransferFromGlobal.deploy(
      globalState.address
    );
    await actionTransferFromGlobal.deployed();

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
    sendAmount = ethers.utils.parseUnits("10", "ether");

    const actionData1 = await run("abi-encode-withselector", {
      contractname: "ProviderFeeRelay",
      functionname: "updateUintStoreAndProvider",
      inputs: [sendAmount],
    });

    action1 = new Action({
      addr: providerFeeRelay.address,
      data: actionData1,
      operation: Operation.Delegatecall,
      value: 0,
      termsOkCheck: true,
    });

    const actionData2 = await run("abi-encode-withselector", {
      contractname: "ActionERC20TransferFromGlobal",
      functionname: "action",
      inputs: [sellerAddress, sellToken.address, executorAddress, sendAmount],
    });

    action2 = new Action({
      addr: actionTransferFromGlobal.address,
      data: actionData2,
      operation: Operation.Delegatecall,
      value: 0,
      termsOkCheck: true,
    });

    // ### Whitelist Task Spec
    taskSpecWithProviderStateSetter = new TaskSpec({
      actions: [action1, action2],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    const taskSpecNoProviderStateSetter = new TaskSpec({
      actions: [action2],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    // Call multiProvide for ActionPlaceOrderBatchExchange
    await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [taskSpecWithProviderStateSetter, taskSpecNoProviderStateSetter],
        [providerModuleGelatoUserProxy.address]
      );

    const taskWithStateSetter = new Task({
      actions: [action1, action2],
    });

    const taskWithoutStateSetter = new Task({
      actions: [action2],
    });

    taskReceipt = new TaskReceipt({
      id: 1,
      provider: gelatoProvider,
      userProxy: userProxyAddress,
      tasks: [taskWithStateSetter],
      submissionsLeft: SUBMISSIONS_LEFT,
    });

    taskReceipt2 = new TaskReceipt({
      id: 2,
      provider: gelatoProvider,
      userProxy: userProxyAddress,
      tasks: [taskWithoutStateSetter],
      submissionsLeft: SUBMISSIONS_LEFT,
    });

    await expect(
      userProxy.submitTask(gelatoProvider, taskWithStateSetter, EXPIRY_DATE)
    ).to.emit(gelatoCore, "LogTaskSubmitted");

    await expect(
      userProxy.submitTask(gelatoProvider, taskWithoutStateSetter, EXPIRY_DATE)
    ).to.emit(gelatoCore, "LogTaskSubmitted");

    // Provider first has to set up his fee model in GlobalState through its ProviderFeeRelay => 1%

    await globalState
      .connect(provider)
      .setActionFee(actionTransferFromGlobal.address, 1, 100);

    const providerFee = await globalState.providerActionFee(
      providerAddress,
      actionTransferFromGlobal.address
    );

    const predictedProviderFee = [
      ethers.utils.bigNumberify("1"),
      ethers.utils.bigNumberify("100"),
    ];
    expect(providerFee[0]).to.be.equal(
      predictedProviderFee[0],
      "Provider fee should be equal to 1"
    );

    expect(providerFee[1]).to.be.equal(
      predictedProviderFee[1],
      "Provider fee should be equal to 1"
    );

    // approve ERC20
    await sellToken.connect(seller).approve(userProxyAddress, sendAmount);
  });

  it("#1: Check if provider payouts happen correctly with GlobalState when we call providerFeeRelay prior to action execution", async function () {
    const preSellerBalance = await sellToken.balanceOf(sellerAddress);

    await expect(
      gelatoCore.connect(executor).exec(
        taskReceipt, // Array of task Receipts
        { gasPrice: GELATO_GAS_PRICE, gasLimit: 3000000 }
      )
    ).to.emit(gelatoCore, "LogExecSuccess");

    const postSellerBalance = await sellToken.balanceOf(sellerAddress);

    // Provider checks

    const expectedAmount = sendAmount.div(ethers.utils.bigNumberify("100"));
    const postProviderBalance = await sellToken.balanceOf(providerAddress);
    expect(postProviderBalance).to.be.equal(expectedAmount);

    // Seller checks
    expect(postSellerBalance).to.be.equal(preSellerBalance.sub(sendAmount));
  });

  it("#2: Check if no provider payouts happen if don't call the providerFeeRelay prior to action execution", async function () {
    const preSellerBalance = await sellToken.balanceOf(sellerAddress);

    await expect(
      gelatoCore.connect(executor).exec(
        taskReceipt2, // Array of task Receipts
        { gasPrice: GELATO_GAS_PRICE, gasLimit: 3000000 }
      )
    ).to.emit(gelatoCore, "LogExecSuccess");

    const postSellerBalance = await sellToken.balanceOf(sellerAddress);

    const expectedAmount = ethers.utils.bigNumberify("0");

    // Provider balance should have remained unchainged
    const postProviderBalance = await sellToken.balanceOf(providerAddress);
    expect(postProviderBalance).to.be.equal(expectedAmount);

    // User balance should have decreased by sendAmount
    // No fees should have been paid, but action should still have worked
    expect(postSellerBalance).to.be.equal(preSellerBalance.sub(sendAmount));
  });

  it("#3: Malicious user should fail if encoding the wrong function for providerFeeRelay", async function () {
    const preSellerBalance = await sellToken.balanceOf(sellerAddress);

    const abi = ["function attack(uint256)"];
    const interFace = new utils.Interface(abi);

    const maliciousData = interFace.functions.attack.encode([sendAmount]);

    const malicousAction = new Action({
      addr: providerFeeRelay.address,
      data: maliciousData,
      termsOkCheck: true,
      value: 0,
      operation: Operation.Delegatecall,
    });

    const maliciousTask = new Task({
      actions: [malicousAction, action2],
    });

    await expect(
      userProxy.submitTask(gelatoProvider, maliciousTask, EXPIRY_DATE)
    ).to.emit(gelatoCore, "LogTaskSubmitted");

    const maliciousTaskReceipt = new TaskReceipt({
      id: 3,
      provider: gelatoProvider,
      userProxy: userProxyAddress,
      tasks: [maliciousTask],
      submissionsLeft: SUBMISSIONS_LEFT,
    });

    await expect(
      gelatoCore.connect(executor).exec(
        maliciousTaskReceipt, // Array of task Receipts
        { gasPrice: GELATO_GAS_PRICE, gasLimit: 3000000 }
      )
    ).to.emit(gelatoCore, "LogExecReverted");

    const postSellerBalance = await sellToken.balanceOf(sellerAddress);

    const expectedAmount = ethers.utils.bigNumberify("0");

    // Provider balance should have remained unchainged
    const postProviderBalance = await sellToken.balanceOf(providerAddress);
    expect(postProviderBalance).to.be.equal(expectedAmount);

    // User balance should have decreased by sendAmount
    // No Change
    expect(postSellerBalance).to.be.equal(preSellerBalance);
  });

  it("#4: Test with PlaceOrderOnBatchExcahnge", async function () {
    const preSellerBalance = await sellToken.balanceOf(sellerAddress);

    // // #### Init Batch Exchange Contracts ####
    const MockBatchExchange = await ethers.getContractFactory(
      "MockBatchExchange"
    );
    const mockBatchExchange = await MockBatchExchange.deploy();
    await mockBatchExchange.deployed();

    const ActionPlaceOrderBatchExchange = await ethers.getContractFactory(
      "ActionPlaceOrderBatchExchange"
    );
    const actionPlaceOrderBatchExchange = await ActionPlaceOrderBatchExchange.deploy(
      mockBatchExchange.address,
      globalState.address
    );
    await actionPlaceOrderBatchExchange.deployed();

    // #### Init Batch Exchange Contracts DONE ####

    // ### Set provider fee
    await globalState
      .connect(provider)
      .setActionFee(actionPlaceOrderBatchExchange.address, 1, 100);

    // ### Set provider fee DONE

    // #### Provide new Task Spec

    /*
      address _sellToken,
      uint128 _sellAmount,
      address _buyToken,
      uint128 _buyAmount,
      uint32 _batchDuration
    */

    const placeOrderData = await run("abi-encode-withselector", {
      contractname: "ActionPlaceOrderBatchExchange",
      functionname: "action",
      inputs: [sellToken.address, sendAmount, sellToken.address, sendAmount, 2],
    });

    const actionPlaceOrder = new Action({
      addr: actionPlaceOrderBatchExchange.address,
      data: placeOrderData,
      operation: Operation.Delegatecall,
      value: 0,
      termsOkCheck: true,
    });

    const setSellAmountAndPlaceOrderTaskSpec = new TaskSpec({
      actions: [action1, actionPlaceOrder],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    await gelatoCore
      .connect(provider)
      .provideTaskSpecs([setSellAmountAndPlaceOrderTaskSpec]);

    // ##### TASK SPECS PROVIDED

    // ##### SUBMIT TASKS

    // First action is set sell amount
    const setSellAmountAndPlaceOrderTask = new Task({
      actions: [action1, actionPlaceOrder],
    });

    await sellToken.transfer(userProxyAddress, sendAmount);

    await expect(
      userProxy.submitTaskCycle(
        gelatoProvider,
        [setSellAmountAndPlaceOrderTask],
        EXPIRY_DATE,
        SUBMISSIONS_LEFT
      )
    ).to.emit(gelatoCore, "LogTaskSubmitted");

    // Create Task Receipts
    const taskReceiptPlaceOrder = new TaskReceipt({
      id: 3,
      provider: gelatoProvider,
      userProxy: userProxyAddress,
      tasks: [setSellAmountAndPlaceOrderTask],
      submissionsLeft: SUBMISSIONS_LEFT,
      index: 0,
    });

    // const canExecResult = await gelatoCore.connect(executor).canExec(
    //   taskReceiptPlaceOrder, // Array of task Receipts
    //   GELATO_MAX_GAS,
    //   GELATO_GAS_PRICE
    // );
    // console.log(canExecResult);

    await expect(
      gelatoCore.connect(executor).exec(
        taskReceiptPlaceOrder, // Array of task Receipts
        { gasPrice: GELATO_GAS_PRICE, gasLimit: 3000000 }
      )
    ).to.emit(gelatoCore, "LogExecSuccess");

    const postSellerBalance = await sellToken.balanceOf(sellerAddress);

    const expectedAmount = sendAmount.div(ethers.utils.bigNumberify("100"));

    // Provider balance should have remained unchainged
    const postProviderBalance = await sellToken.balanceOf(providerAddress);
    expect(postProviderBalance).to.be.equal(expectedAmount);

    // User balance should have decreased by sendAmount
    // No Change
    expect(postSellerBalance).to.be.equal(preSellerBalance.sub(sendAmount));
  });
});
