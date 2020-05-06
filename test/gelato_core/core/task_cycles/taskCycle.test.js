// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

const { run } = require("@nomiclabs/buidler");

const GELATO_GAS_PRICE = utils.parseUnits("10", "gwei");

const SALT_NONCE = 42069;

describe("Gelato Actions - TASK CYCLES - ARBITRARY", function () {
  let GelatoCoreFactory;
  let GelatoGasPriceOracleFactory;
  let GelatoUserProxyFactoryFactory;
  let ProviderModuleGelatoUserProxyFactory;
  let ConditionDummyFactory;
  let ActionDummyFactory;

  let gelatoCore;
  let gelatoGasPriceOracle;
  let gelatoUserProxyFactory;
  let conditionDummy;
  let actionDummy;
  let providerModuleGelatoUserProxy;

  let user;
  let provider;
  let executor;

  let userAddress;
  let providerAddress;
  let executorAddress;

  let userProxyAddress;

  let task;
  let secondTaskBase;
  let secondTask;

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
    ConditionDummyFactory = await ethers.getContractFactory(
      "MockConditionDummy"
    );

    gelatoCore = await GelatoCoreFactory.deploy();
    gelatoGasPriceOracle = await GelatoGasPriceOracleFactory.deploy(
      gelatoCore.address,
      GELATO_GAS_PRICE
    );
    gelatoUserProxyFactory = await GelatoUserProxyFactoryFactory.deploy(
      gelatoCore.address
    );
    providerModuleGelatoUserProxy = await ProviderModuleGelatoUserProxyFactory.deploy(
      gelatoUserProxyFactory.address
    );
    actionDummy = await ActionDummyFactory.deploy();
    conditionDummy = await ConditionDummyFactory.deploy();

    await gelatoCore.deployed();
    await gelatoGasPriceOracle.deployed();
    await gelatoUserProxyFactory.deployed();
    await providerModuleGelatoUserProxy.deployed();
    await actionDummy.deployed();
    await conditionDummy.deployed();

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
    const gelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: providerModuleGelatoUserProxy.address,
    });

    // Actions
    const firstActionDummyData = await run("abi-encode-withselector", {
      contractname: "MockActionDummy",
      functionname: "action(bool)",
      inputs: [true],
    });
    const firstActionDummyStruct = new Action({
      addr: actionDummy.address,
      data: firstActionDummyData,
      operation: Operation.Call,
    });

    const secondActionDummyData = await run("abi-encode-withselector", {
      contractname: "MockActionDummy",
      functionname: "action(bool)",
      inputs: [false],
    });

    const secondActionDummyStruct = new Action({
      addr: actionDummy.address,
      data: secondActionDummyData,
      operation: Operation.Call,
    });

    const dummyConditionStruct = new Condition({
      inst: conditionDummy.address,
      data: await run("abi-encode-withselector", {
        contractname: "MockConditionDummy",
        functionname: "ok(bool)",
        inputs: [true],
      }),
    });

    // TaskSpec
    const firstTaskSpec = new TaskSpec({
      actions: [firstActionDummyStruct],
      gasPriceCeil: utils.parseUnits("20", "gwei"),
    });

    const secondTaskSpec = new TaskSpec({
      conditions: [conditionDummy.address],
      actions: [secondActionDummyStruct],
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
        [firstTaskSpec, secondTaskSpec],
        [providerModuleGelatoUserProxy.address],
        { value: utils.parseEther("1") }
      );
    await multiProvideTx.wait();

    // Tasks for cycle
    task = new Task({
      base: new TaskBase({
        provider: gelatoProvider,
        actions: [firstActionDummyStruct],
        autoResubmitSelf: false,
      }),
    });

    secondTaskBase = new TaskBase({
      provider: gelatoProvider,
      conditions: [dummyConditionStruct],
      actions: [secondActionDummyStruct],
      autoResubmitSelf: false,
    });
  });

  it("Should allow to enter an Arbitrary Task Cycle upon creating a GelatoUserProxy", async function () {
    // derive firstTaskReceipt for event checks
    // we derive the complete task as auto-filled by GelatoCore._createTaskCycle
    task.cycle = [task.base, secondTaskBase];
    // secondTask = new Task({
    //   base: secondTaskBase,
    //   next: 0,
    //   cycle: [task.base, secondTaskBase],
    // });

    // let firstTaskReceipt = new TaskReceipt({
    //   id: currentReceiptId,
    //   userProxy: userProxyAddress,
    //   task: task,
    // });
    // let secondTaskReceiptHash = await gelatoCore.hashTaskReceipt(
    //   secondTaskReceipt
    // );

    await expect(gelatoUserProxyFactory.createTwo(SALT_NONCE, [], [task], true))
      .to.emit(gelatoUserProxyFactory, "LogCreation")
      .withArgs(userAddress, userProxyAddress, 0)
      .and.to.emit(gelatoCore, "LogTaskSubmitted");
    // does not work due to ethers-waffle nested structs bug
    // .withArgs(currentReceiptId, firstTaskReceiptHash, firstTaskReceipt);

    // currentReceiptId
    let currentReceiptId = await gelatoCore.currentTaskReceiptId();

    // First Cyclic Task
    let {
      taskReceiptObj: firstTaskReceipt,
      taskReceiptArray: firstTaskReceiptArray,
    } = await run("fetchTaskReceipt", {
      contractaddress: gelatoCore.address,
      taskreceiptid: currentReceiptId.toString(),
    });
    let firstTaskReceiptHash = await gelatoCore.hashTaskReceipt(
      firstTaskReceipt
    );

    // Second Cyclic Task
    let secondTaskReceipt;
    let secondTaskReceiptArray;
    let secondTaskReceiptHash;

    // Flag to switch between 2 tasks.
    let firstTask = true;

    for (let i = 0; i < 10; i++) {
      //console.log("\n", currentReceiptId);
      //console.log("\nFirstTaskReceipt:\n", firstTaskReceipt, "\n");
      // console.log("\nFirstTaskReceiptHash:\n", firstTaskReceiptHash, "\n");
      //console.log("\nSecondTaskReceipt:\n", secondTaskReceipt, "\n");
      // console.log("\nSecondTaskReceiptHash:\n", secondTaskReceiptHash, "\n");

      // canExec
      expect(
        await gelatoCore
          .connect(executor)
          .canExec(
            firstTask ? firstTaskReceipt : secondTaskReceipt,
            gelatoMaxGas,
            GELATO_GAS_PRICE
          )
      ).to.be.equal("OK");

      // Exec ActionDummyTask and expect it to be resubmitted automatically
      if (i > 0) {
        await expect(
          gelatoCore
            .connect(executor)
            .exec(firstTask ? firstTaskReceipt : secondTaskReceipt, {
              gasPrice: GELATO_GAS_PRICE,
              gasLimit: gelatoMaxGas,
            })
        )
          .to.emit(actionDummy, "LogAction")
          .withArgs(firstTask ? true : false)
          .and.to.emit(gelatoCore, "LogExecSuccess")
          .and.to.emit(gelatoCore, "LogTaskSubmitted");
        // .withArgs(
        //   currentReceiptId.add(1),
        //   firstTask
        //     ? secondTaskReceiptHash
        //     : firstTaskReceiptHash,
        //   firstTask
        //     ? secondTaskReceiptArray
        //     : firstTaskReceiptArray
        // );
      } else {
        // First go we do not check Args as hard to convert taskReceipt to Array
        await expect(
          gelatoCore
            .connect(executor)
            .exec(firstTask ? firstTaskReceipt : secondTaskReceipt, {
              gasPrice: GELATO_GAS_PRICE,
              gasLimit: gelatoMaxGas,
            })
        )
          .to.emit(actionDummy, "LogAction")
          .withArgs(firstTask ? true : false)
          .and.to.emit(gelatoCore, "LogExecSuccess")
          .and.to.emit(gelatoCore, "LogTaskSubmitted");
      }

      // check currentReceiptId
      expect(await gelatoCore.currentTaskReceiptId()).to.equal(
        currentReceiptId.add(1)
      );
      // increment currentReceiptId
      currentReceiptId = currentReceiptId.add(1);

      // Update the Task Receipt for Second Go
      if (firstTask) {
        firstTask = false;
        secondTaskReceipt = await run("fetchTaskReceipt", {
          contractaddress: gelatoCore.address,
          taskreceiptid: currentReceiptId.toString(),
          obj: true,
        });
        secondTaskReceiptArray = await run("fetchTaskReceipt", {
          contractaddress: gelatoCore.address,
          taskreceiptid: currentReceiptId.toString(),
          array: true,
        });
        secondTaskReceiptHash = await gelatoCore.hashTaskReceipt(
          secondTaskReceipt
        );
      } else {
        firstTask = true;
        firstTaskReceipt = await run("fetchTaskReceipt", {
          contractaddress: gelatoCore.address,
          taskreceiptid: currentReceiptId.toString(),
          obj: true,
        });
        firstTaskReceiptArray = await run("fetchTaskReceipt", {
          contractaddress: gelatoCore.address,
          taskreceiptid: currentReceiptId.toString(),
          array: true,
        });
        firstTaskReceiptHash = await gelatoCore.hashTaskReceipt(
          firstTaskReceipt
        );
      }
    }
  });
});
