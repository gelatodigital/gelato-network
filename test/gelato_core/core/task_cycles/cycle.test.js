// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

const { run } = require("@nomiclabs/buidler");

const GELATO_GAS_PRICE = utils.parseUnits("10", "gwei");

const SALT_NONCE = 42069;

describe("Gelato Actions - TASK CYCLES - ARBITRARY", function () {
  // Tests use for loops that have timed out on coverage (ganache)
  this.timeout(30000);

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

  // Gelato variables
  let currentTaskReceiptId;
  let gelatoMaxGas;

  // TaskBases
  let taskBase1;
  let taskBase2;

  // Tasks
  let task;
  let cyclicTask1;
  let cyclicTask2;

  // TaskReceipts
  let taskReceiptAsObj;
  let cyclicTask1ReceiptAsObj;
  let cyclicTask2ReceiptAsObj;

  // For event tests (ethers v4 understands structs as arrays)
  let taskReceiptAsArray;
  let cyclicTask1ReceiptAsArray;
  let cyclicTask2ReceiptAsArray;

  // TaskReceiptHashes
  let taskReceiptHash;
  let cyclicTask1ReceiptHash;
  let cyclicTask2ReceiptHash;

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

    // tx signers
    [user, provider, executor] = await ethers.getSigners();
    userAddress = await user.getAddress();
    providerAddress = await provider.getAddress();
    executorAddress = await executor.getAddress();

    userProxyAddress = await gelatoUserProxyFactory.predictProxyAddress(
      userAddress,
      SALT_NONCE
    );

    // Gelato variables
    gelatoMaxGas = await gelatoCore.gelatoMaxGas();
    currentTaskReceiptId = await gelatoCore.currentTaskReceiptId();

    // GelatoProvider
    const gelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: providerModuleGelatoUserProxy.address,
    });

    // ConditionDummy-1: ok=true
    const firstDummyConditionStruct = new Condition({
      inst: conditionDummy.address,
      data: await run("abi-encode-withselector", {
        contractname: "MockConditionDummy",
        functionname: "ok(bool)",
        inputs: [true],
      }),
    });

    // ActionDummy-1: true
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

    // ActionDummy-2: false
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

    // TaskSpec-1: actionDummy-1:true
    const firstTaskSpec = new TaskSpec({
      actions: [firstActionDummyStruct],
      gasPriceCeil: utils.parseUnits("20", "gwei"),
    });

    // TaskSpec-2: conditionDummy-1:ok=true + actionDummy-2:false
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

    // multiProvide: executor, TaskSpec-1, TaskSpec-2, providerModule, 1 ETH funding
    const multiProvideTx = await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [firstTaskSpec, secondTaskSpec],
        [providerModuleGelatoUserProxy.address],
        { value: utils.parseEther("1") }
      );
    await multiProvideTx.wait();

    // TaskBase-1: ActionDummy-1:true
    taskBase1 = new TaskBase({
      provider: gelatoProvider,
      actions: [firstActionDummyStruct],
    });

    // Base-2: firstDummyConditionStruct-1:ok=true && actionDummy-2:false
    taskBase2 = new TaskBase({
      provider: gelatoProvider,
      conditions: [firstDummyConditionStruct],
      actions: [secondActionDummyStruct],
    });

    // Task:
    task = new Task({ base: taskBase1, next: "1" });

    // CyclicTask:
    cyclicTask1 = new Task({
      base: taskBase1, // dynamic
      next: 1, // dynamic: auto-filled by GelatoCore upon cycle creation
      cycle: [taskBase1, taskBase2], // static: auto-filled by GelatoCore upon cycle creation
    });
    // Always auto-submitted by GelatoCore after cyclicTask1
    cyclicTask2 = new Task({
      base: taskBase2, // dynamic
      next: 2, // dynamic
      cycle: [taskBase1, taskBase2], // static
    });

    // TaskReceipt: Task
    taskReceiptAsObj = new TaskReceipt({
      userProxy: userProxyAddress,
      task,
    });
    taskReceiptAsArray = convertTaskReceiptObjToArray(taskReceiptAsObj);

    // TaskReceipt: CyclicTask-1
    cyclicTask1ReceiptAsObj = new TaskReceipt({
      userProxy: userProxyAddress,
      task: cyclicTask1,
    });

    cyclicTask1ReceiptAsArray = convertTaskReceiptObjToArray(
      cyclicTask1ReceiptAsObj
    );

    // TaskReceipt: CyclicTask-2
    cyclicTask2ReceiptAsObj = new TaskReceipt({
      userProxy: userProxyAddress,
      task: cyclicTask2,
    });
    cyclicTask2ReceiptAsArray = convertTaskReceiptObjToArray(
      cyclicTask2ReceiptAsObj
    );
  });

  it("Should allow to enter an Arbitrary Task Cycle upon creating a GelatoUserProxy", async function () {
    // CreateTwo userProxy and submit task in one tx
    await expect(
      gelatoUserProxyFactory.createTwo(SALT_NONCE, [], [cyclicTask1], false)
    )
      .to.emit(gelatoUserProxyFactory, "LogCreation")
      .withArgs(userAddress, userProxyAddress, 0)
      .and.to.emit(gelatoCore, "LogTaskSubmitted");
    // Doesnt work due to waffle bug
    // .withArgs(taskReceiptAsObj.id, taskReceiptHash, taskReceiptAsArray);

    // Flag to switch between 2 tasks.
    let cyclicTask1WasSubmitted = true;
    for (let i = 0; i < 10; i++) {
      // Update TaskReceipt.id from currentTaskReceiptId
      currentTaskReceiptId = await gelatoCore.currentTaskReceiptId();
      if (cyclicTask1WasSubmitted) {
        cyclicTask1ReceiptAsObj.id = currentTaskReceiptId;
        cyclicTask1ReceiptAsArray = convertTaskReceiptObjToArray(
          cyclicTask1ReceiptAsObj
        );
      } else {
        cyclicTask2ReceiptAsObj.id = currentTaskReceiptId;
        cyclicTask2ReceiptAsArray = convertTaskReceiptObjToArray(
          cyclicTask2ReceiptAsObj
        );
      }

      // Fetch the TaskReceipt of the last submitted Task and compare
      //  with our locally constructed TaskReceipt copy
      if (cyclicTask1WasSubmitted) {
        const fetchedCyclicTask1ReceiptAsArray = await run("fetchTaskReceipt", {
          taskreceiptid: cyclicTask1ReceiptAsObj.id.toString(),
          contractaddress: gelatoCore.address,
          array: true,
        });
        expect(
          nestedArraysAreEqual(
            fetchedCyclicTask1ReceiptAsArray,
            cyclicTask1ReceiptAsArray
          )
        ).to.be.true;
      } else {
        const fetchedCyclicTask2ReceiptAsArray = await run("fetchTaskReceipt", {
          taskreceiptid: cyclicTask2ReceiptAsObj.id.toString(),
          contractaddress: gelatoCore.address,
          array: true,
        });
        expect(
          nestedArraysAreEqual(
            fetchedCyclicTask2ReceiptAsArray,
            cyclicTask2ReceiptAsArray
          )
        ).to.be.true;
      }

      // Make sure The TaskHashes are correct
      if (cyclicTask1WasSubmitted) {
        // TaskReceiptHash: CyclicTask1
        cyclicTask1ReceiptHash = await gelatoCore.hashTaskReceipt(
          cyclicTask1ReceiptAsObj
        );
        // gelatoCore.taskReceiptHash: cyclicTask-1
        expect(
          await gelatoCore.taskReceiptHash(cyclicTask1ReceiptAsObj.id)
        ).to.be.equal(cyclicTask1ReceiptHash);
      } else {
        // TaskReceiptHash: CyclicTask2
        cyclicTask2ReceiptHash = await gelatoCore.hashTaskReceipt(
          cyclicTask2ReceiptAsObj
        );
        // gelatoCore.taskReceiptHash: cyclicTask-2
        expect(
          await gelatoCore.taskReceiptHash(cyclicTask2ReceiptAsObj.id)
        ).to.be.equal(cyclicTask2ReceiptHash);
      }

      // canExec
      expect(
        await gelatoCore
          .connect(executor)
          .canExec(
            cyclicTask1WasSubmitted
              ? cyclicTask1ReceiptAsObj
              : cyclicTask2ReceiptAsObj,
            gelatoMaxGas,
            GELATO_GAS_PRICE
          )
      ).to.be.equal("OK");

      // Exec ActionDummyTask-X and expect ActionDummyTask-Y to be automitically submitted
      await expect(
        gelatoCore
          .connect(executor)
          .exec(
            cyclicTask1WasSubmitted
              ? cyclicTask1ReceiptAsObj
              : cyclicTask2ReceiptAsObj,
            {
              gasPrice: GELATO_GAS_PRICE,
              gasLimit: gelatoMaxGas,
            }
          )
      )
        .to.emit(actionDummy, "LogAction")
        .withArgs(cyclicTask1WasSubmitted ? true : false)
        .and.to.emit(gelatoCore, "LogExecSuccess")
        .and.to.emit(gelatoCore, "LogTaskSubmitted");

      // check currentTaskReceiptId
      expect(await gelatoCore.currentTaskReceiptId()).to.equal(
        currentTaskReceiptId.add(1)
      );

      // If cyclicTask1WasSubmitted => false because now cyclicTask2 was submitted
      cyclicTask1WasSubmitted = cyclicTask1WasSubmitted ? false : true;
    }
  });
});
