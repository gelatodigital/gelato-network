// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers, utils } = require("@nomiclabs/buidler");

import initialStateSysAdmin from "../gelato_core/base/gelato_sys_admin/GelatoSysAdmin.initialState";
import initialStateGasPriceOracle from "../gelato_core/base/gelato_gas_price_oracle/GelatoGasPriceOracle.initialState";
import DataFlow from "../../src/enums/gelato/DataFlow";

const GELATO_MAX_GAS = initialStateSysAdmin.gelatoMaxGas;
const GELATO_GAS_PRICE = initialStateGasPriceOracle.gasPrice;

const EXPIRY_DATE = 0;
const SUBMISSIONS_LEFT = 1;

const NUM = 100;
const DEN = 10000;
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
// => Fee = 1%

describe("ActionFeeHandler Tests", function () {
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
  let gelatoGasPriceOracle;
  let gelatoProvider;
  let sellToken;
  let sellDecimals;
  let feeHandlerAddress;
  let actionTransferFrom;
  let actionTransfer;
  let sendAmount;
  let feeHandlerActionStruct;
  let actionTransferFromStruct;
  let actionTransferStruct;
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

    // Instantiate ActionFeeHandler
    await feeHandlerFactory.connect(provider).create(NUM);
    feeHandlerAddress = await feeHandlerFactory.feeHandlerByProviderAndNum(
      providerAddress,
      NUM
    );

    const feeHandler = await ethers.getContractAt(
      "ActionFeeHandler",
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

    const GelatoActionPipeline = await ethers.getContractFactory(
      "GelatoActionPipeline",
      sysAdmin
    );
    const gelatoActionPipeline = await GelatoActionPipeline.deploy();

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
    await feeHandler
      .connect(provider)
      .addTokenToCustomWhitelist(sellToken.address);
    await feeHandler.connect(provider).addTokenToCustomWhitelist(ETH_ADDRESS);
    await feeHandler.connect(provider).activateCustomWhitelist();

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
      contractname: "ActionFeeHandler",
      functionname: "action",
      inputs: feeHandlerInputs,
    });

    feeHandlerActionStruct = new Action({
      addr: feeHandlerAddress,
      data: actionDataFeeHandler,
      operation: Operation.Delegatecall,
      dataFlow: DataFlow.Out,
      termsOkCheck: true,
    });

    const erc20TransferFromData = await run("abi-encode-withselector", {
      contractname: "ActionERC20TransferFrom",
      functionname: "action",
      inputs: [sellerAddress, sellToken.address, sendAmount, executorAddress],
    });

    actionTransferFromStruct = new Action({
      addr: actionTransferFrom.address,
      data: erc20TransferFromData,
      operation: Operation.Delegatecall,
      dataFlow: DataFlow.In,
      termsOkCheck: false,
    });

    // ### Whitelist Task Spec
    const taskSpecPayFeeAndTransferFrom = new TaskSpec({
      actions: [feeHandlerActionStruct, actionTransferFromStruct],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [taskSpecPayFeeAndTransferFrom],
        [providerModuleGelatoUserProxy.address]
      );

    // Submit Task
    const taskPayFeeAndTransferFrom = new Task({
      actions: [feeHandlerActionStruct, actionTransferFromStruct],
    });

    await expect(
      userProxy.submitTask(
        gelatoProvider,
        taskPayFeeAndTransferFrom,
        EXPIRY_DATE
      )
    ).to.emit(gelatoCore, "LogTaskSubmitted");

    // Call CanExec
    const taskReceiptPayFeeAndTransferFrom = new TaskReceipt({
      id: 1,
      provider: gelatoProvider,
      userProxy: userProxyAddress,
      tasks: [taskPayFeeAndTransferFrom],
      submissionsLeft: SUBMISSIONS_LEFT,
    });

    const preSellerBalance = await sellToken.balanceOf(sellerAddress);

    await sellToken.connect(seller).approve(userProxyAddress, sendAmount);

    expect(
      await gelatoCore
        .connect(executor)
        .canExec(
          taskReceiptPayFeeAndTransferFrom,
          GELATO_MAX_GAS,
          GELATO_GAS_PRICE
        )
    ).to.be.equal("OK");

    await expect(
      gelatoCore.connect(executor).exec(taskReceiptPayFeeAndTransferFrom, {
        gasPrice: GELATO_GAS_PRICE,
        gasLimit: 3000000,
      })
    ).to.emit(gelatoCore, "LogExecSuccess");

    // Provider checks
    // 1% fee
    expect(await sellToken.balanceOf(providerAddress)).to.be.equal(
      sendAmount.div(ethers.utils.bigNumberify("100"))
    );

    // Seller checks
    expect(await sellToken.balanceOf(sellerAddress)).to.be.equal(
      preSellerBalance.sub(sendAmount)
    );
  });

  it("#2: Check provider payouts, when Proxy has to pay fee and ERC20 token is used", async function () {
    // Instantiate Actions
    const feeHandlerInputs = [
      sellToken.address /*_sendToken*/,
      sendAmount /*_sendAmount*/,
      userProxyAddress /*_feePayer*/,
    ];

    const actionDataFeeHandler = await run("abi-encode-withselector", {
      contractname: "ActionFeeHandler",
      functionname: "action",
      inputs: feeHandlerInputs,
    });

    feeHandlerActionStruct = new Action({
      addr: feeHandlerAddress,
      data: actionDataFeeHandler,
      operation: Operation.Delegatecall,
      dataFlow: DataFlow.Out,
      termsOkCheck: true,
    });

    const actionTransferData = await run("abi-encode-withselector", {
      contractname: "ActionTransfer",
      functionname: "action",
      inputs: [sellToken.address, sendAmount, executorAddress],
    });

    actionTransferStruct = new Action({
      addr: actionTransfer.address,
      data: actionTransferData,
      operation: Operation.Delegatecall,
      dataFlow: DataFlow.In,
      termsOkCheck: false,
    });

    // ### Whitelist Task Spec
    const taskSpecPayFeeAndTransfer = new TaskSpec({
      actions: [feeHandlerActionStruct, actionTransferStruct],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [taskSpecPayFeeAndTransfer],
        [providerModuleGelatoUserProxy.address]
      );

    // Submit Task
    const taskPayTokenFeeAndTransfer = new Task({
      actions: [feeHandlerActionStruct, actionTransferStruct],
    });

    await expect(
      userProxy.submitTask(
        gelatoProvider,
        taskPayTokenFeeAndTransfer,
        EXPIRY_DATE
      )
    ).to.emit(gelatoCore, "LogTaskSubmitted");

    // Call canexec

    const taskReceiptPayTokenFeeAndTransfer = new TaskReceipt({
      id: 1,
      provider: gelatoProvider,
      userProxy: userProxyAddress,
      tasks: [taskPayTokenFeeAndTransfer],
      submissionsLeft: SUBMISSIONS_LEFT,
    });

    const preSellerBalance = await sellToken.balanceOf(sellerAddress);

    await sellToken.connect(seller).transfer(userProxyAddress, sendAmount);

    expect(
      await gelatoCore
        .connect(executor)
        .canExec(
          taskReceiptPayTokenFeeAndTransfer,
          GELATO_MAX_GAS,
          GELATO_GAS_PRICE
        )
    ).to.be.equal("OK");

    await expect(
      gelatoCore.connect(executor).exec(taskReceiptPayTokenFeeAndTransfer, {
        gasPrice: GELATO_GAS_PRICE,
        gasLimit: 3000000,
      })
    ).to.emit(gelatoCore, "LogExecSuccess");

    // Provider checks
    // 1% fee
    expect(await sellToken.balanceOf(providerAddress)).to.be.equal(
      sendAmount.div(ethers.utils.bigNumberify("100"))
    );

    // Seller checks
    expect(await sellToken.balanceOf(sellerAddress)).to.be.equal(
      preSellerBalance.sub(sendAmount)
    );
  });

  it("#3: Check provider payouts, when Proxy has to pay fee and ETH is used. Also leave other address in ActionTransfer to check it gets overwritten", async function () {
    // Instantiate Actions
    const feeHandlerInputs = [
      ETH_ADDRESS /*_sendToken*/,
      sendAmount /*_sendAmount*/,
      userProxyAddress /*_feePayer*/,
    ];

    const actionDataFeeHandler = await run("abi-encode-withselector", {
      contractname: "ActionFeeHandler",
      functionname: "action",
      inputs: feeHandlerInputs,
    });

    feeHandlerActionStruct = new Action({
      addr: feeHandlerAddress,
      data: actionDataFeeHandler,
      operation: Operation.Delegatecall,
      dataFlow: DataFlow.Out,
      termsOkCheck: true,
    });

    // Set payload to 0 as otherwise termsOk will not return "OK"
    const tokenAmount = 0;

    const actionTransferData = await run("abi-encode-withselector", {
      contractname: "ActionTransfer",
      functionname: "action",
      inputs: [sellToken.address, tokenAmount, executorAddress],
    });

    actionTransferStruct = new Action({
      addr: actionTransfer.address,
      data: actionTransferData,
      operation: Operation.Delegatecall,
      dataFlow: DataFlow.In,
      termsOkCheck: false,
    });

    // ### Whitelist Task Spec
    const taskSpecPayFeeAndTransfer = new TaskSpec({
      actions: [feeHandlerActionStruct, actionTransferStruct],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [taskSpecPayFeeAndTransfer],
        [providerModuleGelatoUserProxy.address]
      );

    // Submit Task
    const taskPayETHFeeAndTransfer = new Task({
      actions: [feeHandlerActionStruct, actionTransferStruct],
    });

    await expect(
      userProxy.submitTask(
        gelatoProvider,
        taskPayETHFeeAndTransfer,
        EXPIRY_DATE
      )
    ).to.emit(gelatoCore, "LogTaskSubmitted");

    // Call canexec

    const taskReceiptPayETHFeeAndTransfer = new TaskReceipt({
      id: 1,
      provider: gelatoProvider,
      userProxy: userProxyAddress,
      tasks: [taskPayETHFeeAndTransfer],
      submissionsLeft: SUBMISSIONS_LEFT,
    });

    await seller.sendTransaction({ value: sendAmount, to: userProxyAddress });

    const proxyEthBalanceBefore = await ethers.provider.getBalance(
      userProxyAddress
    );

    expect(
      await gelatoCore
        .connect(executor)
        .canExec(
          taskReceiptPayETHFeeAndTransfer,
          GELATO_MAX_GAS,
          GELATO_GAS_PRICE
        )
    ).to.be.equal("OK");

    const providerEthBalanceBefore = await ethers.provider.getBalance(
      providerAddress
    );

    await expect(
      gelatoCore.connect(executor).exec(taskReceiptPayETHFeeAndTransfer, {
        gasPrice: GELATO_GAS_PRICE,
        gasLimit: 4000000,
      })
    ).to.emit(gelatoCore, "LogExecSuccess");

    // Provider checks
    // 1% fee
    expect(await ethers.provider.getBalance(providerAddress)).to.be.equal(
      providerEthBalanceBefore.add(
        sendAmount.div(ethers.utils.bigNumberify("100"))
      )
    );

    // Seller checks
    expect(await ethers.provider.getBalance(userProxyAddress)).to.be.equal(
      proxyEthBalanceBefore.sub(sendAmount)
    );
  });

  // Test when funds are already in proxy

  // Test when ETH is already in proxy and ETH is used
});
