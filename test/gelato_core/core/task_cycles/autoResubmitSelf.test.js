// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

const { run } = require("@nomiclabs/buidler");

const GELATO_GAS_PRICE = utils.parseUnits("10", "gwei");

const SALT_NONCE = 42069;

describe("Gelato Actions - TASK CYCLES - AUTO-RESUBMIT-SELF", function () {
  let GelatoCoreFactory;
  let GelatoGasPriceOracleFactory;
  let GelatoUserProxyFactoryFactory;
  let ProviderModuleGelatoUserProxyFactory;
  let ActionDummyFactory;

  let gelatoCore;
  let gelatoGasPriceOracle;
  let gelatoUserProxyFactory;
  let actionDummy;
  let providerModuleGelatoUserProxy;

  let user;
  let provider;
  let executor;

  let userAddress;
  let providerAddress;
  let executorAddress;

  let userProxyAddress;

  let gelatoProvider;

  let task1;
  let task2;
  let taskSpec1;
  let taskSpec2;

  let gelatoMaxGas;
  let executorSuccessFee;
  let sysAdminSuccessFee;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCoreFactory = await ethers.getContractFactory("GelatoCore");
    GelatoGasPriceOracleFactory = await ethers.getContractFactory(
      "GelatoGasPriceOracle"
    );
    GelatoUserProxyFactoryFactory = await ethers.getContractFactory(
      "GelatoUserProxyFactory"
    );
    // Get the ContractFactory, contract instance, and Signers here.
    ProviderModuleGelatoUserProxyFactory = await ethers.getContractFactory(
      "ProviderModuleGelatoUserProxy"
    );
    ActionDummyFactory = await ethers.getContractFactory("MockActionDummy");

    gelatoCore = await GelatoCoreFactory.deploy(gelatoSysAdminInitialState);
    gelatoGasPriceOracle = await GelatoGasPriceOracleFactory.deploy(
      GELATO_GAS_PRICE
    );
    gelatoUserProxyFactory = await GelatoUserProxyFactoryFactory.deploy(
      gelatoCore.address
    );

    const GelatoActionPipeline = await ethers.getContractFactory(
      "GelatoActionPipeline"
    );
    const gelatoActionPipeline = await GelatoActionPipeline.deploy();
    await gelatoActionPipeline.deployed();

    providerModuleGelatoUserProxy = await ProviderModuleGelatoUserProxyFactory.deploy(
      gelatoUserProxyFactory.address,
      gelatoActionPipeline.address
    );
    actionDummy = await ActionDummyFactory.deploy();

    await gelatoCore.deployed();
    await gelatoGasPriceOracle.deployed();
    await gelatoUserProxyFactory.deployed();
    await providerModuleGelatoUserProxy.deployed();
    await actionDummy.deployed();

    await gelatoCore.setGelatoGasPriceOracle(gelatoGasPriceOracle.address);

    gelatoMaxGas = await gelatoCore.gelatoMaxGas();
    executorSuccessFee = await gelatoCore.executorSuccessFee(
      await gelatoCore.gelatoMaxGas(),
      GELATO_GAS_PRICE
    );
    sysAdminSuccessFee = await gelatoCore.sysAdminSuccessFee(
      await gelatoCore.gelatoMaxGas(),
      GELATO_GAS_PRICE
    );

    // tx signers
    [user, provider, executor] = await ethers.getSigners();
    userAddress = await user.getAddress();
    providerAddress = await provider.getAddress();
    executorAddress = await executor.getAddress();

    userProxyAddress = await gelatoUserProxyFactory.predictProxyAddress(
      userAddress,
      SALT_NONCE
    );

    // GelatoProvider
    gelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: providerModuleGelatoUserProxy.address,
    });

    // Action
    const actionDummyData = await run("abi-encode-withselector", {
      contractname: "MockActionDummy",
      functionname: "action(bool)",
      inputs: [true],
    });
    const actionDummyStruct = new Action({
      addr: actionDummy.address,
      data: actionDummyData,
      operation: Operation.Call,
    });

    // TaskSpec 1
    taskSpec1 = new TaskSpec({
      actions: [actionDummyStruct],
      gasPriceCeil: utils.parseUnits("20", "gwei"),
    });

    // TaskSpec 1
    taskSpec2 = new TaskSpec({
      actions: [actionDummyStruct, actionDummyStruct],
      gasPriceCeil: utils.parseUnits("20", "gwei"),
    });

    // stakeExecutor
    const stakeTx = await gelatoCore.connect(executor).stakeExecutor({
      value: await gelatoCore.minExecutorStake(),
    });
    await stakeTx.wait();

    // multiProvide: provider
    const multiProvideTx = await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [taskSpec1, taskSpec2],
        [providerModuleGelatoUserProxy.address],
        { value: utils.parseEther("1") }
      );
    await multiProvideTx.wait();

    // Task 1
    task1 = new Task({
      actions: [actionDummyStruct],
    });

    // Task 2
    task2 = new Task({
      actions: [actionDummyStruct, actionDummyStruct],
    });
  });

  it("#1 Should allow to enter an Infinite Task Chain upon creating a GelatoUserProxy", async function () {
    // taskReceipt
    let taskReceiptId = (await gelatoCore.currentTaskReceiptId()).add(1);
    const taskReceipt = new TaskReceipt({
      id: taskReceiptId,
      userProxy: userProxyAddress,
      provider: gelatoProvider,
      tasks: [task1],
      cycleId: 1,
      submissionsLeft: 0,
    });
    let taskReceiptHash = await gelatoCore.hashTaskReceipt(taskReceipt);

    await expect(
      gelatoUserProxyFactory.createTwoExecActionsSubmitTaskCycle(
        SALT_NONCE,
        [],
        gelatoProvider,
        [task1],
        0,
        0
      )
    )
      .to.emit(gelatoUserProxyFactory, "LogCreation")
      .withArgs(userAddress, userProxyAddress, 0)
      .and.to.emit(gelatoCore, "LogTaskSubmitted");
    // withArgs not possible: suspect buidlerevm or ethers struct parsing bug
    // .withArgs(
    //   executorAddress,
    //   taskReceiptId,
    //   taskReceiptHash,
    //   taskReceipt
    // )

    for (let i = 0; i < 10; i++) {
      // canExec
      expect(
        await gelatoCore
          .connect(executor)
          .canExec(taskReceipt, gelatoMaxGas, GELATO_GAS_PRICE)
      ).to.be.equal("OK");

      // Exec ActionDummyTask and expect it to be resubmitted automatically
      await expect(
        gelatoCore.connect(executor).exec(taskReceipt, {
          gasPrice: GELATO_GAS_PRICE,
          gasLimit: await gelatoCore.gelatoMaxGas(),
        })
      )
        .to.emit(actionDummy, "LogAction")
        .withArgs(true)
        .and.to.emit(gelatoCore, "LogExecSuccess")
        .and.to.emit(gelatoCore, "LogTaskSubmitted");

      // // Update the Task Receipt for Second Go
      taskReceipt.id++;
      taskReceiptHash = await gelatoCore.hashTaskReceipt(taskReceipt);
    }
  });

  it("#2 Execute Task Cycle only 5 times => 10 executions in total", async function () {
    const cycles = 5;

    // taskReceipt
    let taskReceiptId = (await gelatoCore.currentTaskReceiptId()).add(1);
    const taskReceipt = new TaskReceipt({
      id: taskReceiptId,
      userProxy: userProxyAddress,
      provider: gelatoProvider,
      tasks: [task1, task1],
      cycleId: 1,
      submissionsLeft: cycles * 2,
    });
    let taskReceiptHash = await gelatoCore.hashTaskReceipt(taskReceipt);

    await expect(
      gelatoUserProxyFactory.createTwoExecActionsSubmitTaskCycle(
        SALT_NONCE,
        [],
        gelatoProvider,
        [task1, task1],
        0,
        cycles
      )
    )
      .to.emit(gelatoUserProxyFactory, "LogCreation")
      .withArgs(userAddress, userProxyAddress, 0)
      .and.to.emit(gelatoCore, "LogTaskSubmitted");
    // withArgs not possible: suspect buidlerevm or ethers struct parsing bug
    // .withArgs(
    //   executorAddress,
    //   taskReceiptId,
    //   taskReceiptHash,
    //   taskReceipt
    // )

    for (let i = 0; i < cycles; i++) {
      // canExec
      expect(
        await gelatoCore
          .connect(executor)
          .canExec(taskReceipt, gelatoMaxGas, GELATO_GAS_PRICE)
      ).to.be.equal("OK");

      // Exec ActionDummyTask and expect it to be resubmitted automatically
      await expect(
        gelatoCore.connect(executor).exec(taskReceipt, {
          gasPrice: GELATO_GAS_PRICE,
          gasLimit: await gelatoCore.gelatoMaxGas(),
        })
      )
        .to.emit(actionDummy, "LogAction")
        .withArgs(true)
        .and.to.emit(gelatoCore, "LogExecSuccess")
        .and.to.emit(gelatoCore, "LogTaskSubmitted");

      // // Update the Task Receipt for Second Go
      taskReceipt.id++;
      taskReceipt.index++;
      taskReceipt.submissionsLeft--;

      expect(
        await gelatoCore
          .connect(executor)
          .canExec(taskReceipt, gelatoMaxGas, GELATO_GAS_PRICE)
      ).to.be.equal("OK");

      if (i !== cycles - 1) {
        // New tasks will be submitted
        await expect(
          gelatoCore.connect(executor).exec(taskReceipt, {
            gasPrice: GELATO_GAS_PRICE,
            gasLimit: await gelatoCore.gelatoMaxGas(),
          })
        )
          .to.emit(actionDummy, "LogAction")
          .withArgs(true)
          .and.to.emit(gelatoCore, "LogExecSuccess")
          .and.to.emit(gelatoCore, "LogTaskSubmitted");
      } else {
        // No new task will be submitted
        await expect(
          gelatoCore.connect(executor).exec(taskReceipt, {
            gasPrice: GELATO_GAS_PRICE,
            gasLimit: await gelatoCore.gelatoMaxGas(),
          })
        )
          .to.emit(actionDummy, "LogAction")
          .withArgs(true)
          .and.to.emit(gelatoCore, "LogExecSuccess");
      }

      taskReceipt.id++;
      taskReceipt.index = 0;
      taskReceipt.submissionsLeft--;
    }

    // 11th execution should fail
    expect(
      await gelatoCore
        .connect(executor)
        .canExec(taskReceipt, gelatoMaxGas, GELATO_GAS_PRICE)
    ).to.be.equal("InvalidTaskReceiptHash");
  });
});
