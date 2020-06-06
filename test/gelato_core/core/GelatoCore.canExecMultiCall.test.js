// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");

import initialStateSysAdmin from "../base/gelato_sys_admin/GelatoSysAdmin.initialState";
import initialStateGasPriceOracle from "../base/gelato_gas_price_oracle/GelatoGasPriceOracle.initialState";

const GELATO_MAX_GAS = initialStateSysAdmin.gelatoMaxGas;
const GELATO_GAS_PRICE = initialStateGasPriceOracle.gasPrice;

const EXPIRY_DATE = 0;
const SUBMISSIONS_LEFT = 1;

describe("GelatoCore.canExecMultiCall", function () {
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
  let providerModuleGelatoUserProxy;
  let gelatoCore;
  let gelatoGasPriceOracle;
  let gelatoProvider;
  let action;
  let newTaskSpec;
  let taskReceipts;
  let gelatoMultiCall;

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
      .stakeExecutor({ value: ethers.utils.parseUnits("1", "ether") });

    // Instantiate GelatoMultiCall
    const GelatoMultiCall = await ethers.getContractFactory(
      "GelatoMultiCall",
      sysAdmin
    );
    gelatoMultiCall = await GelatoMultiCall.deploy(gelatoCore.address);
    await gelatoMultiCall.deployed();

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

    const taskNumber = 2;
    taskReceipts = [];
    for (let i = 0; i < taskNumber; i++) {
      const taskReceipt = new TaskReceipt({
        id: i + 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });
      taskReceipts.push(taskReceipt);
      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");
    }
  });

  // We test different functionality of the contract as normal Mocha tests.
  it("#1: CanExec - Call view func with too low Gas Price is OK as we check it in exec)", async function () {
    const multiCanExecReturn = await gelatoMultiCall
      .connect(executor)
      .multiCanExec(
        taskReceipts, // Array of task Receipts
        GELATO_MAX_GAS,
        ethers.utils.parseUnits("1", "gwei")
      );

    for (const { response } of multiCanExecReturn.responses)
      expect(response).to.equal("InvalidExecutor");
  });
});
