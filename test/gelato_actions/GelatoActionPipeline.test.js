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

describe("GelatoActionPipeline Tests", function () {
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
  let gelatoActionPipeline;
  let gelatoProvider;
  let actionTransferFromStruct;
  let sellToken;
  let sellDecimals;
  let actionTransferFrom;
  let memoryUint;

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
    gelatoActionPipeline = await GelatoActionPipeline.deploy();
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

    // Call multiProvide for mockConditionDummy + actionTransferFrom
    // Provider registers new condition

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

    const actionTransferFromData = await run("abi-encode-withselector", {
      contractname: "ActionERC20TransferFrom",
      functionname: "action",
      inputs: [sellerAddress, sellToken.address, memoryUint, executorAddress],
    });

    const actionTransferFromDataOut = new Action({
      addr: actionTransferFrom.address,
      data: actionTransferFromData,
      operation: Operation.Delegatecall,
      dataFlow: DataFlow.Out,
      termsOkCheck: true,
    });

    const actionTransferFromDataInAndOut = {
      ...actionTransferFromDataOut,
    };
    actionTransferFromDataInAndOut.dataFlow = DataFlow.InAndOut;
    actionTransferFromDataInAndOut.termsOkCheck = false;

    const actionTransferFromDataIn = { ...actionTransferFromDataOut };
    actionTransferFromDataIn.dataFlow = DataFlow.In;
    actionTransferFromDataIn.termsOkCheck = false;

    const actionTransferFromDataNone = { ...actionTransferFromDataOut };
    actionTransferFromDataNone.dataFlow = DataFlow.None;

    // Make sure the combination of Actions in sequence is valid
    let [actionsCanBeCombinedInSequence] = await gelatoActionPipeline.isValid([
      actionTransferFromDataOut,
      actionTransferFromDataInAndOut,
      actionTransferFromDataIn,
    ]);
    expect(actionsCanBeCombinedInSequence).to.be.true;

    // ### Whitelist Task Spec
    const transferFromTaskSpec1 = new TaskSpec({
      actions: [
        actionTransferFromDataOut,
        actionTransferFromDataInAndOut,
        actionTransferFromDataIn,
      ],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    // Make sure the combination of Actions in sequence is valid
    [actionsCanBeCombinedInSequence] = await gelatoActionPipeline.isValid([
      actionTransferFromDataOut,
      actionTransferFromDataIn,
      actionTransferFromDataNone,
    ]);
    expect(actionsCanBeCombinedInSequence).to.be.true;

    const transferFromTaskSpec2 = new TaskSpec({
      actions: [
        actionTransferFromDataOut,
        actionTransferFromDataIn,
        actionTransferFromDataNone,
      ],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    // Call multiProvide for ActionPlaceOrderBatchExchange
    await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [transferFromTaskSpec1, transferFromTaskSpec2],
        [providerModuleGelatoUserProxy.address]
      );
  });

  it("#1: Actions only use the in memory values for transferFrom actionTransferFromStruct, not the encoded ones", async function () {
    const preBalance = await sellToken.balanceOf(sellerAddress);

    const sellAmounts = [100, 20, 0];
    // Create actions

    const actions = [];
    for (let i = 0; i < 3; i++) {
      const actionTransferFromData = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [
          sellerAddress,
          sellToken.address,
          sellAmounts[i],
          executorAddress,
        ],
      });

      let dataFlow;
      if (i == 0) dataFlow = DataFlow.Out;
      else if (i == 1) dataFlow = DataFlow.InAndOut;
      else dataFlow = DataFlow.In;

      actionTransferFromStruct = new Action({
        addr: actionTransferFrom.address,
        data: actionTransferFromData,
        operation: Operation.Delegatecall,
        dataFlow,
        termsOkCheck: dataFlow == DataFlow.Out ? true : false,
      });
      actions.push(actionTransferFromStruct);
    }

    const transferFromTask = new Task({ actions });

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

    expect(
      await gelatoCore
        .connect(executor)
        .canExec(taskReceiptTransferFrom, GELATO_MAX_GAS, GELATO_GAS_PRICE)
    ).to.be.equal("OK");

    await expect(
      gelatoCore.connect(executor).exec(taskReceiptTransferFrom, {
        gasPrice: GELATO_GAS_PRICE,
        gasLimit: 3000000,
      })
    ).to.emit(gelatoCore, "LogExecSuccess");

    // Provider checks
    expect(await sellToken.balanceOf(sellerAddress)).to.be.equal(
      preBalance.sub(ethers.utils.bigNumberify("300"))
    );
  });

  it("#2: Actions uses in memory values for the second actionTransferFromStruct and calldata values for the third", async function () {
    const preBalance = await sellToken.balanceOf(sellerAddress);

    const sellAmounts = [100, 0, 20];
    // Create actions

    const actions = [];
    for (let i = 0; i < 3; i++) {
      const actionTransferFromData = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [
          sellerAddress,
          sellToken.address,
          sellAmounts[i],
          executorAddress,
        ],
      });

      let dataFlow;
      if (i == 0) dataFlow = DataFlow.Out;
      else if (i == 1) dataFlow = DataFlow.In;
      else dataFlow = DataFlow.None;

      actionTransferFromStruct = new Action({
        addr: actionTransferFrom.address,
        data: actionTransferFromData,
        operation: Operation.Delegatecall,
        dataFlow,
        termsOkCheck: dataFlow == DataFlow.In ? false : true,
      });
      actions.push(actionTransferFromStruct);
    }

    const transferFromTask = new Task({ actions });

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

    expect(
      await gelatoCore
        .connect(executor)
        .canExec(taskReceiptTransferFrom, GELATO_MAX_GAS, GELATO_GAS_PRICE)
    ).to.be.equal("OK");

    await expect(
      gelatoCore.connect(executor).exec(taskReceiptTransferFrom, {
        gasPrice: GELATO_GAS_PRICE,
        gasLimit: 3000000,
      })
    ).to.emit(gelatoCore, "LogExecSuccess");

    // Seller checks
    expect(await sellToken.balanceOf(sellerAddress)).to.be.equal(
      preBalance.sub(ethers.utils.bigNumberify("220"))
    );
  });
});
