// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");

import initialStateSysAdmin from "../../base/gelato_sys_admin/GelatoSysAdmin.initialState";
import initialStateGasPriceOracle from "../../base/gelato_gas_price_oracle/GelatoGasPriceOracle.initialState";

const GELATO_MAX_GAS = initialStateSysAdmin.gelatoMaxGas;
const GELATO_GAS_PRICE = initialStateGasPriceOracle.gasPrice;

describe("Condition Balance Stateful: Balanced based Condition integration test with 10x auto resubmissions", function () {
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
  let MockERC20;
  let sellToken;
  let sellDecimals;
  let conditionBalanceStateful;
  let conditionBalanceStatefulStruct;
  let mockActionDummy;
  let mockActionDummyStruct;
  let actionSetRefStruct;

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
    const createTx = await gelatoUserProxyFactory.connect(seller).create();
    await createTx.wait();
    [userProxyAddress] = await gelatoUserProxyFactory.gelatoProxiesByUser(
      sellerAddress
    );
    userProxy = await ethers.getContractAt("GelatoUserProxy", userProxyAddress);

    MockERC20 = await ethers.getContractFactory("MockERC20");

    // DEPLOY DUMMY ERC20s
    // // Deploy Sell Token
    sellDecimals = 18;
    sellToken = await MockERC20.deploy("DAI", 0, sellerAddress, sellDecimals);
    await sellToken.deployed();

    // Register new provider TaskSpec on core with provider #######################
    const ConditionBalanceStateful = await ethers.getContractFactory(
      "ConditionBalanceStateful"
    );

    conditionBalanceStateful = await ConditionBalanceStateful.deploy(
      gelatoCore.address
    );
    await conditionBalanceStateful.deployed();

    conditionBalanceStatefulStruct = new Condition({
      inst: conditionBalanceStateful.address,
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
      addr: conditionBalanceStateful.address,
      operation: Operation.Call,
    });

    const taskSpec = new TaskSpec({
      provider: gelatoProvider,
      conditions: [conditionBalanceStatefulStruct.inst],
      actions: [mockActionDummyStruct, actionSetRefStruct],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
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
  it("#1: Succesfully exec and auto-resubmits Task based on refBalance delta increase", async function () {
    // address _proxy, address _account, address _token, uint256, bool _greaterElseSmaller
    const conditionData = await run("abi-encode", {
      contractname: "ConditionBalanceStateful",
      functionname: "refBalanceCheck",
      values: [0, userProxyAddress, sellerAddress, sellToken.address, true],
    });
    conditionBalanceStatefulStruct.data = conditionData;

    const actionData = await run("abi-encode-withselector", {
      contractname: "MockActionDummy",
      functionname: "action",
      inputs: [true],
    });
    mockActionDummyStruct.data = actionData;

    // Set RefBalance and create task on gelato in one tx
    const refBalanceDelta = ethers.utils.parseUnits("1", sellDecimals);

    const setRefData = await run("abi-encode-withselector", {
      contractname: "ConditionBalanceStateful",
      functionname: "setRefBalanceDeltaForNextTaskInCycle",
      inputs: [sellerAddress, sellToken.address, refBalanceDelta],
    });

    const actionSetRefStruct = new Action({
      addr: conditionBalanceStateful.address,
      data: setRefData,
      operation: Operation.Call,
    });

    const task = new Task({
      conditions: [conditionBalanceStatefulStruct],
      actions: [mockActionDummyStruct, actionSetRefStruct],
    });

    await expect(
      userProxy.connect(seller).execActionsAndSubmitTaskCycle(
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
      submissionsLeft: 0, // cycles
    });

    let canExecReturn = await gelatoCore
      .connect(executor)
      .canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE);

    expect(canExecReturn).to.equal(
      "ConditionNotOk:NotOkERC20BalanceIsNotGreaterThanRefBalance"
    );

    await sellToken.create(sellerAddress, refBalanceDelta);

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
          userProxy.connect(seller).submitTask(
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
      ).to.equal("ConditionNotOk:NotOkERC20BalanceIsNotGreaterThanRefBalance");

      await sellToken.create(sellerAddress, refBalanceDelta);

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

      // Update nextTaskReceiptId
      nextTaskReceiptId = nextTaskReceiptId.add(1);

      // ##################################### Next execution DONE
    }
  });

  // We test different functionality of the contract as normal Mocha tests.
  it("#2: Succesfully exec and auto-resubmits Task based on refBalance delta decrease", async function () {
    // address _proxy, address _account, address _token, uint256, bool _greaterElseSmaller
    const conditionData = await run("abi-encode", {
      contractname: "ConditionBalanceStateful",
      functionname: "refBalanceCheck",
      values: [0, userProxyAddress, sellerAddress, sellToken.address, false],
    });
    conditionBalanceStatefulStruct.data = conditionData;

    const actionData = await run("abi-encode-withselector", {
      contractname: "MockActionDummy",
      functionname: "action",
      inputs: [false],
    });
    mockActionDummyStruct.data = actionData;

    // Set RefBalance and create task on gelato in one tx
    const refBalanceDeltaAbs = ethers.utils.parseUnits("10", sellDecimals);
    const refBalanceDeltaDecrease = ethers.utils.parseUnits(
      "-10",
      sellDecimals
    );

    const setRefData = await run("abi-encode-withselector", {
      contractname: "ConditionBalanceStateful",
      functionname: "setRefBalanceDeltaForNextTaskInCycle",
      inputs: [sellerAddress, sellToken.address, refBalanceDeltaDecrease],
    });

    const actionSetRefStruct = new Action({
      addr: conditionBalanceStateful.address,
      data: setRefData,
      operation: Operation.Call,
    });

    const task = new Task({
      conditions: [conditionBalanceStatefulStruct],
      actions: [mockActionDummyStruct, actionSetRefStruct],
    });

    const taskReceipt = new TaskReceipt({
      id: 1,
      provider: gelatoProvider,
      userProxy: userProxyAddress,
      tasks: [task],
      submissionsLeft: 0, // cycles
    });

    await expect(
      userProxy.connect(seller).execActionsAndSubmitTaskCycle(
        [actionSetRefStruct],
        gelatoProvider,
        [task],
        [0], // expiryDate
        [0] // cycles
      )
    ).to.be.revertedWith(
      "ConditionBalanceStateful.setRefBalanceDelta: underflow"
    );

    const initialSellTokenBalance = utils.bigNumberify(
      (100 * 10 ** sellDecimals).toString()
    );

    await sellToken.create(sellerAddress, initialSellTokenBalance);

    await expect(
      userProxy.connect(seller).execActionsAndSubmitTaskCycle(
        [actionSetRefStruct],
        gelatoProvider,
        [task],
        [0], // expiryDate
        [0] // cycles
      )
    ).to.emit(gelatoCore, "LogTaskSubmitted");

    expect(
      await conditionBalanceStateful.refBalance(
        userProxyAddress,
        taskReceipt.id
      )
    ).to.be.equal(initialSellTokenBalance.sub(refBalanceDeltaAbs));

    expect(
      await gelatoCore
        .connect(executor)
        .canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE)
    ).to.equal("ConditionNotOk:NotOkERC20BalanceIsNotSmallerThanRefBalance");

    await expect(sellToken.burn(refBalanceDeltaAbs)).to.not.be.reverted;

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
      .withArgs(false)
      .and.to.emit(gelatoCore, "LogExecSuccess")
      .and.to.emit(gelatoCore, "LogTaskSubmitted");

    // ##################################### First execution DONE
    let currentSellTokenBalance;
    let nextTaskReceiptId = taskReceipt.id.add(1);

    for (let i = 0; i < 11; i++) {
      taskReceipt.id = nextTaskReceiptId;

      // Intercept to test taskId cycle logic
      if (i === 3 || i === 8) {
        const interceptTask = new Task({
          actions: [mockActionDummyStruct],
        });
        await expect(
          userProxy.connect(seller).submitTask(
            gelatoProvider,
            interceptTask,
            0 // expiryDate
          )
        ).to.emit(gelatoCore, "LogTaskSubmitted");

        // Account for interception in nextTaskReceiptId
        nextTaskReceiptId = taskReceipt.id.add(1);
      }

      currentSellTokenBalance = await sellToken.balanceOf(sellerAddress);

      expect(
        await conditionBalanceStateful.refBalance(
          userProxyAddress,
          taskReceipt.id
        )
      ).to.be.equal(currentSellTokenBalance.sub(refBalanceDeltaAbs));

      expect(
        await gelatoCore
          .connect(executor)
          .canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE)
      ).to.equal("ConditionNotOk:NotOkERC20BalanceIsNotSmallerThanRefBalance");

      // We burn sellTokens
      await expect(sellToken.burn(refBalanceDeltaAbs)).to.not.be.reverted;

      currentSellTokenBalance = await sellToken.balanceOf(sellerAddress);

      if (currentSellTokenBalance.lt(refBalanceDeltaAbs)) {
        await expect(
          gelatoCore.connect(executor).exec(taskReceipt, {
            gasPrice: GELATO_GAS_PRICE,
            gasLimit: GELATO_MAX_GAS,
          })
        ).to.emit(gelatoCore, "LogExecReverted");
        break;
      } else {
        expect(
          await conditionBalanceStateful.refBalance(
            userProxyAddress,
            taskReceipt.id
          )
        ).to.equal(currentSellTokenBalance);

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
          .withArgs(false)
          .and.to.emit(gelatoCore, "LogExecSuccess")
          .and.to.emit(gelatoCore, "LogTaskSubmitted");

        // Update nextTaskReceiptId
        nextTaskReceiptId = nextTaskReceiptId.add(1);

        // ##################################### Next execution DONE
      }
    }
  });
});
