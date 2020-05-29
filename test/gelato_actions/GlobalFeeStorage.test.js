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

describe("GelatoCore.canExecMultiCall", function () {
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
  let newTaskSpec;
  let taskReceipts;
  let gelatoMultiCall;
  let sellToken;
  let sellDecimals;

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

    // Instantiate GlobalStateStorage
    const GlobalStateStorage = await ethers.getContractFactory(
      "GlobalStateStorage",
      sysAdmin
    );
    globalStateStorage = await GlobalStateStorage.deploy();
    await globalStateStorage.deployed();

    // Instantiate ProviderStateSetter
    const ProviderStateSetter = await ethers.getContractFactory(
      "ProviderStateSetter",
      provider
    );
    providerStateSetter = await ProviderStateSetter.deploy(
      globalStateStorage.address
    );
    await providerStateSetter.deployed();

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

    const actionTransferFromGlobal = await ActionERC20TransferFromGlobal.deploy(
      globalStateStorage.address
    );
    await actionTransferFromGlobal.deployed();

    const mockActionDummyGelato = new Action({
      addr: actionTransferFromGlobal.address,
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

    const actionData = await run("abi-encode-withselector", {
      contractname: "ActionERC20TransferFrom",
      functionname: "action",
      inputs: [
        sellerAddress,
        sellToken.address,
        providerAddress,
        ethers.utils.parseUnits("1", "ether"),
      ],
    });

    action = new Action({
      addr: actionTransferFromGlobal.address,
      data: actionData,
      operation: Operation.Delegatecall,
      value: 0,
      termsOkCheck: true,
    });

    const task = new Task({
      actions: [action],
    });

    const taskNumber = 2;
    const taskReceipt = new TaskReceipt({
      id: i + 1,
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
  it("#1: Check if provider payouts happen correctly with GlobalFeeStorage", async function () {
    const multiCanExecReturn = await gelatoMultiCall
      .connect(executor)
      .multiCanExec(
        taskReceipts, // Array of task Receipts
        GELATO_MAX_GAS,
        ethers.utils.parseUnits("1", "gwei")
      );

    const canExecResults = multiCanExecReturn.returnData;
    canExecResults.forEach((result) => {
      if (result.response === "InvalidExecutor") {
      }
      // console.log(`TR with id: ${result.id} is ready to be executed`);
      expect(result.response).to.equal("InvalidExecutor");
    });
  });
});
