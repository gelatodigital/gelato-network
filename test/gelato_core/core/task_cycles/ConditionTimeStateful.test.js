// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");

import initialStateSysAdmin from "../../base/gelato_sys_admin/GelatoSysAdmin.initialState";
import initialStateGasPriceOracle from "../../base/gelato_gas_price_oracle/GelatoGasPriceOracle.initialState";

const GELATO_MAX_GAS = initialStateSysAdmin.gelatoMaxGas;
const GELATO_GAS_PRICE = initialStateGasPriceOracle.gasPrice;

describe("Condition Time Stateful: Time based Condition integration test with 10x auto resubmissions", function () {
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
  let conditionTimeStateful;
  let conditionTimeStatefulStruct;
  let mockActionDummy;
  let mockActionDummyStruct;
  let actionSetRefStruct;

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

    // Create UserProxy
    const createTx = await gelatoUserProxyFactory.connect(user).create();
    await createTx.wait();
    [userProxyAddress] = await gelatoUserProxyFactory.gelatoProxiesByUser(
      userAddress
    );
    userProxy = await ethers.getContractAt("GelatoUserProxy", userProxyAddress);

    // Register new provider TaskSpec on core with provider #######################
    const ConditionTimeStatefulFactory = await ethers.getContractFactory(
      "ConditionTimeStateful"
    );
    conditionTimeStateful = await ConditionTimeStatefulFactory.deploy(
      gelatoCore.address
    );
    await conditionTimeStateful.deployed();

    conditionTimeStatefulStruct = new Condition({
      inst: conditionTimeStateful.address,
    });

    // Call multiProvide for mockConditionDummy + actionERC20TransferFrom
    // Provider registers new condition
    const MockActionDummy = await ethers.getContractFactory(
      "MockActionDummy",
      sysAdmin
    );

    mockActionDummy = await MockActionDummy.deploy();
    await mockActionDummy.deployed();

    mockActionDummyStruct = new Action({
      addr: mockActionDummy.address,
      operation: Operation.Call,
      termsOkCheck: true,
    });

    gelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: providerModuleGelatoUserProxy.address,
    });

    actionSetRefStruct = new Action({
      addr: conditionTimeStateful.address,
      operation: Operation.Call,
    });

    const taskSpec = new TaskSpec({
      conditions: [conditionTimeStatefulStruct.inst],
      actions: [mockActionDummyStruct, actionSetRefStruct],
      gasPriceCeil: utils.parseUnits("20", "gwei"),
    });

    const interceptTaskSpec = new TaskSpec({
      actions: [mockActionDummyStruct],
      gasPriceCeil: utils.parseUnits("20", "gwei"),
    });

    // Call multiProvide for actionWithdrawBatchExchange
    await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [taskSpec, interceptTaskSpec],
        [providerModuleGelatoUserProxy.address]
      );
  });

  // We test different functionality of the contract as normal Mocha tests.
  it("#1: Succesfully exec and auto-resubmits Task based on refTime", async function () {
    // address _proxy, address _account, address _token, uint256, bool _greaterElseSmaller
    const conditionData = await conditionTimeStateful.getConditionData(
      userProxyAddress
    );

    conditionTimeStatefulStruct.data = conditionData;

    const actionData = await run("abi-encode-withselector", {
      contractname: "MockActionDummy",
      functionname: "action",
      inputs: [true],
    });
    mockActionDummyStruct.data = actionData;

    // Set RefBalance and create task on gelato in one tx
    const refTimeDelta = 3600; // 1 hour in seconds

    const setRefData = await run("abi-encode-withselector", {
      contractname: "ConditionTimeStateful",
      functionname: "setRefTime",
      inputs: [refTimeDelta],
    });

    const actionSetRefStruct = new Action({
      addr: conditionTimeStateful.address,
      data: setRefData,
      operation: Operation.Call,
    });

    const task = new Task({
      conditions: [conditionTimeStatefulStruct],
      actions: [mockActionDummyStruct, actionSetRefStruct],
    });

    await expect(
      userProxy.connect(user).execActionsAndSubmitTaskCycle(
        [actionSetRefStruct],
        gelatoProvider,
        [task],
        [0], // expiryDate
        [0] // cycles
      )
    ).to.emit(gelatoCore, "LogTaskSubmitted");

    const taskReceipt = new TaskReceipt({
      id: 1,
      provider: gelatoProvider,
      userProxy: userProxyAddress,
      tasks: [task],
      cycleId: 1,
      submissionsLeft: 0, // cycles
    });

    let refTime = await conditionTimeStateful.refTime(
      userProxyAddress,
      taskReceipt.id
    );

    let canExecReturn = await gelatoCore
      .connect(executor)
      .canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE);

    expect(canExecReturn).to.equal("ConditionNotOk:NotOkTimestampDidNotPass");

    // Skip forth in time to nextDueDate
    let block = await ethers.provider.getBlock();
    let nextDueDate = block.timestamp + refTimeDelta;
    await ethers.provider.send("evm_mine", [nextDueDate]);

    expect(
      await gelatoCore
        .connect(executor)
        .canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE)
    ).to.equal("OK");

    await expect(
      gelatoCore.connect(executor).exec(taskReceipt, {
        gasPrice: GELATO_GAS_PRICE,
        gasLimit: GELATO_MAX_GAS,
      })
    )
      .to.emit(mockActionDummy, "LogAction")
      .withArgs(true)
      .and.to.emit(gelatoCore, "LogExecSuccess")
      .and.to.emit(gelatoCore, "LogTaskSubmitted");

    // ##################################### First execution DONE

    let nextTaskReceiptId = taskReceipt.id.add(1);

    for (let i = 0; i < 10; i++) {
      taskReceipt.id = nextTaskReceiptId;

      // Intercept to test taskId cycle logic
      if (i === 3 || i === 8) {
        const interceptTask = new Task({
          actions: [mockActionDummyStruct],
        });
        await expect(
          userProxy.connect(user).submitTask(
            gelatoProvider,
            interceptTask,
            0 // expiryDate
          )
        ).to.emit(gelatoCore, "LogTaskSubmitted");

        // Account for interception in nextTaskReceiptId
        nextTaskReceiptId = taskReceipt.id.add(1);
      }

      expect(
        await gelatoCore
          .connect(executor)
          .canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE)
      ).to.equal("ConditionNotOk:NotOkTimestampDidNotPass");

      refTime = await conditionTimeStateful.refTime(
        userProxyAddress,
        taskReceipt.id
      );

      // Skip forth in time to nextDueDate
      block = await ethers.provider.getBlock();
      nextDueDate = block.timestamp + refTimeDelta;
      await ethers.provider.send("evm_mine", [nextDueDate]);

      canExecReturn = await gelatoCore
        .connect(executor)
        .canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE);

      expect(canExecReturn).to.equal("OK");

      await expect(
        gelatoCore.connect(executor).exec(taskReceipt, {
          gasPrice: GELATO_GAS_PRICE,
          gasLimit: GELATO_MAX_GAS,
        })
      )
        .to.emit(mockActionDummy, "LogAction")
        .withArgs(true)
        .and.to.emit(gelatoCore, "LogExecSuccess")
        .and.to.emit(gelatoCore, "LogTaskSubmitted");

      // Update nextTaskReceiptId
      nextTaskReceiptId = nextTaskReceiptId.add(1);

      // ##################################### Next execution DONE
    }
  });
});
