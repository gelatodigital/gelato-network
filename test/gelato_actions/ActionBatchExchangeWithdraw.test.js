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

describe("BatchExchange Withdraw Test", function () {
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
  let taskSpec;
  let sellToken;
  let sellDecimals;
  let mockBatchExchange;
  let taskReceipt;
  let actionWithdrawBatchExchange;

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

    // Call multiProvide for mockConditionDummy + actionTransfer
    // Provider registers new condition
    // // #### ActionWithdrawBatchExchange Start ####
    const MockBatchExchange = await ethers.getContractFactory(
      "MockBatchExchange"
    );
    mockBatchExchange = await MockBatchExchange.deploy();
    await mockBatchExchange.deployed();

    const ActionWithdrawBatchExchange = await ethers.getContractFactory(
      "ActionWithdrawBatchExchange",
      sysAdmin
    );

    actionWithdrawBatchExchange = await ActionWithdrawBatchExchange.deploy(
      mockBatchExchange.address
    );
    await actionWithdrawBatchExchange.deployed();

    const ActionTransfer = await ethers.getContractFactory(
      "ActionTransfer",
      sysAdmin
    );

    const actionTransferContract = await ActionTransfer.deploy();
    await actionTransferContract.deployed();

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
      mockBatchExchange.address,
      sellDecimals
    );
    await sellToken.deployed();

    // ##### Whitelist Task Spec
    // Send amount for ActionTransfer action, not known beforehand, is based on withdraw amount
    const sendAmount = 0;

    const actionDataWithdraw = await run("abi-encode-withselector", {
      contractname: "ActionWithdrawBatchExchange",
      functionname: "action",
      inputs: [sellToken.address],
    });

    const actionWithdraw = new Action({
      addr: actionWithdrawBatchExchange.address,
      data: actionDataWithdraw,
      operation: Operation.Delegatecall,
      dataFlow: DataFlow.Out,
      termsOkCheck: true,
    });

    // SendAmount = 0 to avoid getting stuck at transfer termsOK
    const actionDataTransfer = await run("abi-encode-withselector", {
      contractname: "ActionTransfer",
      functionname: "action",
      inputs: [sellToken.address, 0, sellerAddress],
    });

    const actionTransfer = new Action({
      addr: actionTransferContract.address,
      data: actionDataTransfer,
      operation: Operation.Delegatecall,
      dataFlow: DataFlow.In,
      termsOkCheck: false,
    });

    // Make sure the combination of Actions in sequence is valid
    const [
      actionsCanBeCombinedInSequence,
    ] = await gelatoActionPipeline.isValid([actionWithdraw, actionTransfer]);
    expect(actionsCanBeCombinedInSequence).to.be.true;

    // ### Whitelist Task Spec
    taskSpec = new TaskSpec({
      actions: [actionWithdraw, actionTransfer],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    // Call multiProvide for ActionPlaceOrderBatchExchange
    await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [taskSpec],
        [providerModuleGelatoUserProxy.address]
      );

    const task = new Task({
      actions: [actionWithdraw, actionTransfer],
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

  it("#1: Withdraw action returns correct data to transfer action", async function () {
    const withdrawAmount = ethers.utils.parseEther("10");

    // Set withdraw amount
    await mockBatchExchange.setWithdrawAmount(
      sellToken.address,
      withdrawAmount
    );

    await mockBatchExchange.setValidWithdrawRequest(userProxyAddress);

    expect(
      await gelatoCore
        .connect(executor)
        .canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE)
    ).to.equal("OK");

    const preBalance = await sellToken.balanceOf(sellerAddress);

    await expect(
      gelatoCore
        .connect(executor)
        .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 3000000 })
    ).to.emit(gelatoCore, "LogExecSuccess");

    expect(await sellToken.balanceOf(sellerAddress)).to.be.equal(
      preBalance.add(withdrawAmount)
    );
  });
});
