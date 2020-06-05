// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers, utils } = require("@nomiclabs/buidler");

import initialStateSysAdmin from "../gelato_core/base/gelato_sys_admin/GelatoSysAdmin.initialState";
import initialStateGasPriceOracle from "../gelato_core/base/gelato_gas_price_oracle/GelatoGasPriceOracle.initialState";
import { Operation } from "../../src/classes/gelato/Action";

const GELATO_MAX_GAS = initialStateSysAdmin.gelatoMaxGas;
const GELATO_GAS_PRICE = initialStateGasPriceOracle.gasPrice;

const EXPIRY_DATE = 0;
const SUBMISSIONS_LEFT = 1;

const NUM = 100;
const DEN = 10000;
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
// => Fee = 1%

describe("FeeHandler Tests", function () {
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
  let taskSpecTransferFrom;
  let taskReceipt1;
  let taskReceipt2;
  let gelatoMultiCall;
  let sellToken;
  let sellDecimals;
  let globalState;
  let feeHandlerAddress;
  let actionTransferFrom;
  let actionTransfer;
  let sendAmount;
  let action1;
  let action2;
  let action3;
  let feeHandlerFactory;

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

    const FeeHandlerFactory = await ethers.getContractFactory(
      "FeeHandlerFactory",
      provider
    );
    feeHandlerFactory = await FeeHandlerFactory.deploy();
    await feeHandlerFactory.deployed();

    // Instantiate FeeHandler
    await feeHandlerFactory.connect(provider).create(NUM);
    feeHandlerAddress = await feeHandlerFactory.getFeeHandler(
      providerAddress,
      NUM
    );

    const feeHandler = await ethers.getContractAt(
      "FeeHandler",
      feeHandlerAddress
    );

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
    const ActionERC20TransferFrom = await ethers.getContractFactory(
      "ActionERC20TransferFrom",
      sysAdmin
    );

    actionTransferFrom = await ActionERC20TransferFrom.deploy();
    await actionTransferFrom.deployed();

    const ActionTransfer = await ethers.getContractFactory(
      "ActionTransfer",
      sysAdmin
    );

    actionTransfer = await ActionTransfer.deploy();
    await actionTransfer.deployed();

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

    // whitelist token on fee contract
    const provider2 = await feeHandler.getProvider();
    await feeHandler.connect(provider).addTokenToWhitelist(sellToken.address);
    await feeHandler.connect(provider).addTokenToWhitelist(ETH_ADDRESS);
    await feeHandler.connect(provider).activateOwnWhitelist();

    // ### Action #1
    sendAmount = ethers.utils.parseUnits("10", "ether");
  });

  it("#1: Check provider payouts, when EOA has to pay fee and ERC20 token is used", async function () {
    // Instantiate Actions
    const feeHandlerInputs = [
      sellToken.address /*_sendToken*/,
      sendAmount /*_sendAmount*/,
      sellerAddress /*_feePayer*/,
    ];

    const actionDataFeeHandler = await run("abi-encode-withselector", {
      contractname: "FeeHandler",
      functionname: "action",
      inputs: feeHandlerInputs,
    });

    action1 = new Action({
      addr: feeHandlerAddress,
      data: actionDataFeeHandler,
      operation: Operation.Delegatecall,
      value: 0,
      termsOkCheck: true,
    });

    const actionData2 = await run("abi-encode-withselector", {
      contractname: "ActionERC20TransferFrom",
      functionname: "action",
      inputs: [
        sellerAddress,
        sellToken.address,
        executorAddress,
        sendAmount,
        false,
      ],
    });

    action2 = new Action({
      addr: actionTransferFrom.address,
      data: actionData2,
      operation: Operation.Delegatecall,
      value: 0,
      termsOkCheck: true,
    });

    // ### Whitelist Task Spec
    taskSpecTransferFrom = new TaskSpec({
      actions: [action1, action2],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [taskSpecTransferFrom],
        [providerModuleGelatoUserProxy.address]
      );

    // Submit Task
    const task = new Task({
      actions: [action1, action2],
    });

    await expect(
      userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
    ).to.emit(gelatoCore, "LogTaskSubmitted");

    // Call CanExec
    taskReceipt1 = new TaskReceipt({
      id: 1,
      provider: gelatoProvider,
      userProxy: userProxyAddress,
      tasks: [task],
      submissionsLeft: SUBMISSIONS_LEFT,
    });

    const preSellerBalance = await sellToken.balanceOf(sellerAddress);

    await sellToken.connect(seller).approve(userProxyAddress, sendAmount);

    const canExecResult = await gelatoCore.connect(executor).canExec(
      taskReceipt1, // Array of task Receipts
      GELATO_MAX_GAS,
      GELATO_GAS_PRICE
    );

    expect(canExecResult).to.be.equal("OK");
    // console.log(canExecResult);

    await expect(
      gelatoCore.connect(executor).exec(
        taskReceipt1, // Array of task Receipts
        { gasLimit: 3000000 }
      )
    ).to.emit(gelatoCore, "LogExecSuccess");

    const postSellerBalance = await sellToken.balanceOf(sellerAddress);

    // Provider checks

    // 1% fee
    const expectedAmount = sendAmount.div(ethers.utils.bigNumberify("100"));
    const postProviderBalance = await sellToken.balanceOf(providerAddress);
    expect(postProviderBalance).to.be.equal(expectedAmount);

    // Seller checks
    expect(postSellerBalance).to.be.equal(preSellerBalance.sub(sendAmount));
  });

  it("#2: Check provider payouts, when Proxy has to pay fee and ERC20 token is used", async function () {
    // Instantiate Actions
    const feeHandlerInputs = [
      sellToken.address /*_sendToken*/,
      sendAmount /*_sendAmount*/,
      userProxyAddress /*_feePayer*/,
    ];

    const actionDataFeeHandler = await run("abi-encode-withselector", {
      contractname: "FeeHandler",
      functionname: "action",
      inputs: feeHandlerInputs,
    });

    action1 = new Action({
      addr: feeHandlerAddress,
      data: actionDataFeeHandler,
      operation: Operation.Delegatecall,
      value: 0,
      termsOkCheck: true,
    });

    const actionData3 = await run("abi-encode-withselector", {
      contractname: "ActionTransfer",
      functionname: "action",
      inputs: [sellToken.address, sendAmount, executorAddress, false],
    });

    action3 = new Action({
      addr: actionTransfer.address,
      data: actionData3,
      operation: Operation.Delegatecall,
      value: 0,
      termsOkCheck: true,
    });

    // ### Whitelist Task Spec
    const taskSpecTransfer = new TaskSpec({
      actions: [action1, action3],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [taskSpecTransfer],
        [providerModuleGelatoUserProxy.address]
      );

    // Submit Task
    const task = new Task({
      actions: [action1, action3],
    });

    await expect(
      userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
    ).to.emit(gelatoCore, "LogTaskSubmitted");

    // Call canexec

    taskReceipt1 = new TaskReceipt({
      id: 1,
      provider: gelatoProvider,
      userProxy: userProxyAddress,
      tasks: [task],
      submissionsLeft: SUBMISSIONS_LEFT,
    });

    const preSellerBalance = await sellToken.balanceOf(sellerAddress);

    await sellToken.connect(seller).transfer(userProxyAddress, sendAmount);

    const canExecResult = await gelatoCore.connect(executor).canExec(
      taskReceipt1, // Array of task Receipts
      GELATO_MAX_GAS,
      GELATO_GAS_PRICE
    );

    expect(canExecResult).to.be.equal("OK");

    await expect(
      gelatoCore.connect(executor).exec(
        taskReceipt1, // Array of task Receipts
        { gasLimit: 3000000 }
      )
    ).to.emit(gelatoCore, "LogExecSuccess");

    const postSellerBalance = await sellToken.balanceOf(sellerAddress);

    // Provider checks

    // 1% fee
    const expectedAmount = sendAmount.div(ethers.utils.bigNumberify("100"));
    const postProviderBalance = await sellToken.balanceOf(providerAddress);
    expect(postProviderBalance).to.be.equal(expectedAmount);

    // Seller checks
    expect(postSellerBalance).to.be.equal(preSellerBalance.sub(sendAmount));
  });

  it("#3: Check provider payouts, when Proxy has to pay fee and ETH is used. Also leave other address in ActionTransfer to check it gets overwritten", async function () {
    // Instantiate Actions
    const feeHandlerInputs = [
      ETH_ADDRESS /*_sendToken*/,
      sendAmount /*_sendAmount*/,
      userProxyAddress /*_feePayer*/,
    ];

    const actionDataFeeHandler = await run("abi-encode-withselector", {
      contractname: "FeeHandler",
      functionname: "action",
      inputs: feeHandlerInputs,
    });

    action1 = new Action({
      addr: feeHandlerAddress,
      data: actionDataFeeHandler,
      operation: Operation.Delegatecall,
      value: 0,
      termsOkCheck: true,
    });

    // Set payload to 0 as otherwise termsOk will not return "OK"
    const tokenAmount = 0;

    const actionData3 = await run("abi-encode-withselector", {
      contractname: "ActionTransfer",
      functionname: "action",
      inputs: [sellToken.address, tokenAmount, executorAddress, false],
    });

    action3 = new Action({
      addr: actionTransfer.address,
      data: actionData3,
      operation: Operation.Delegatecall,
      value: 0,
      termsOkCheck: true,
    });

    // ### Whitelist Task Spec
    const taskSpecTransfer = new TaskSpec({
      actions: [action1, action3],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [taskSpecTransfer],
        [providerModuleGelatoUserProxy.address]
      );

    // Submit Task
    const task = new Task({
      actions: [action1, action3],
    });

    await expect(
      userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
    ).to.emit(gelatoCore, "LogTaskSubmitted");

    // Call canexec

    taskReceipt1 = new TaskReceipt({
      id: 1,
      provider: gelatoProvider,
      userProxy: userProxyAddress,
      tasks: [task],
      submissionsLeft: SUBMISSIONS_LEFT,
    });

    await seller.sendTransaction({ value: sendAmount, to: userProxyAddress });

    const proxyEthBalanceBefore = await ethers.provider.getBalance(
      userProxyAddress
    );

    const canExecResult = await gelatoCore.connect(executor).canExec(
      taskReceipt1, // Array of task Receipts
      GELATO_MAX_GAS,
      GELATO_GAS_PRICE
    );

    expect(canExecResult).to.be.equal("OK");

    const preProviderEthBalance = await ethers.provider.getBalance(
      providerAddress
    );

    await expect(
      gelatoCore.connect(executor).exec(
        taskReceipt1, // Array of task Receipts
        { gasLimit: 4000000 }
      )
    ).to.emit(gelatoCore, "LogExecSuccess");

    const proxyEthBalanceAfter = await ethers.provider.getBalance(
      userProxyAddress
    );

    // Provider checks

    // 1% fee
    const expectedAmount = sendAmount.div(ethers.utils.bigNumberify("100"));
    const postProviderEthBalance = await ethers.provider.getBalance(
      providerAddress
    );

    expect(postProviderEthBalance).to.be.equal(
      preProviderEthBalance.add(expectedAmount)
    );

    // Seller checks
    expect(proxyEthBalanceAfter).to.be.equal(
      proxyEthBalanceBefore.sub(sendAmount)
    );
  });

  // Test when funds are already in proxy

  // Test when ETH is already in proxy and ETH is used
});
