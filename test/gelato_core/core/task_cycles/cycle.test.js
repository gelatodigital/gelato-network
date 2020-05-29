// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

const { run } = require("@nomiclabs/buidler");

const GELATO_GAS_PRICE = utils.parseUnits("10", "gwei");

const SALT_NONCE = 42069;

const EXPIRY_DATE = 0;

describe("Gelato Actions - TASK CYCLES - ARBITRARY", function () {
  // Tests use for loops that have timed out on coverage (ganache)
  this.timeout(0);

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
  let gelatoUserProxy;

  // Gelato variables
  let currentTaskCycleReceiptId;
  let gelatoMaxGas;

  // Gelato Provider
  let gelatoProvider;

  // Tasks
  let task1;
  let task2;

  // TaskReceipts
  let interceptTaskReceiptAsObj;
  let cyclicTask1ReceiptAsObj;
  let cyclicTask2ReceiptAsObj;

  // For event tests (ethers v4 understands structs as arrays)
  let interceptTaskReceiptAsArray;
  let cyclicTask1ReceiptAsArray;
  let cyclicTask2ReceiptAsArray;

  // TaskReceiptHashes
  let interceptTaskReceiptHash;
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

    gelatoCore = await GelatoCoreFactory.deploy(gelatoSysAdminInitialState);
    gelatoGasPriceOracle = await GelatoGasPriceOracleFactory.deploy(
      GELATO_GAS_PRICE
    );
    gelatoUserProxyFactory = await GelatoUserProxyFactoryFactory.deploy(
      gelatoCore.address
    );

    const GelatoMultiSend = await ethers.getContractFactory("GelatoMultiSend");
    const gelatoMultiSend = await GelatoMultiSend.deploy();
    await gelatoMultiSend.deployed();

    providerModuleGelatoUserProxy = await ProviderModuleGelatoUserProxyFactory.deploy(
      gelatoUserProxyFactory.address,
      gelatoMultiSend.address
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

    // GelatoProvider
    gelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: providerModuleGelatoUserProxy.address,
    });

    // ConditionDummy-1: ok=true
    const firstDummyConditionStruct = new Condition({
      inst: conditionDummy.address,
      data: await run("abi-encode", {
        contractname: "MockConditionDummy",
        functionname: "dummyCheck",
        values: [true],
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

    // Task-1: ActionDummy-1:true
    task1 = new Task({
      actions: [firstActionDummyStruct],
    });

    // Task-2: firstDummyConditionStruct-1:ok=true && actionDummy-2:false
    task2 = new Task({
      conditions: [firstDummyConditionStruct],
      actions: [secondActionDummyStruct],
    });

    // TaskReceipt: InterceptTask
    interceptTaskReceiptAsObj = new TaskReceipt({
      userProxy: userProxyAddress,
      provider: gelatoProvider,
      tasks: [task1],
    });

    // TaskReceipt: CyclicTask1
    cyclicTask1ReceiptAsObj = new TaskReceipt({
      userProxy: userProxyAddress,
      provider: gelatoProvider,
      index: 0, // dynamic: auto-filled by GelatoCore upon tasks creation
      tasks: [task1, task2], // static: auto-filled by GelatoCore upon tasks creation
      submissionsLeft: 0,
    });

    // TaskReceipt: CyclicTask2
    cyclicTask2ReceiptAsObj = new TaskReceipt({
      userProxy: userProxyAddress,
      provider: gelatoProvider,
      index: 1, // After first execution, next will be placed to 0
      tasks: [task1, task2], // static
      submissionsLeft: 0,
    });
  });

  it("Should allow to enter an Arbitrary Task Cycle upon creating a GelatoUserProxy", async function () {
    // console.log("\n INIT \n");

    // CreateTwo userProxy and submit interceptTask in one tx
    await expect(
      gelatoUserProxyFactory.createTwoExecActionsSubmitTaskCycle(
        SALT_NONCE,
        [],
        gelatoProvider,
        [task1, task2],
        EXPIRY_DATE,
        0
      )
    )
      .to.emit(gelatoUserProxyFactory, "LogCreation")
      .withArgs(userAddress, userProxyAddress, 0)
      .and.to.emit(gelatoCore, "LogTaskSubmitted");
    // Doesnt work due to waffle bug
    // .withArgs(interceptTaskReceiptAsObj.id, interceptTaskReceiptHash, interceptTaskReceiptAsArray);

    // GelatoUserProxy Instance to submit interceptant tasks
    gelatoUserProxy = await ethers.getContractAt(
      "GelatoUserProxy",
      userProxyAddress
    );

    // Flag to switch between 2 tasks.
    let cyclicTask1WasSubmitted = true;
    let cyclicTask2WasSubmitted = false;
    let interceptTaskWasSubmitted = false;
    let cyclicTask1WasIntercepted = false;
    let cyclicTask2WasIntercepted = false;

    // Init Task Cycle Id: We initiated tasks in createTwo
    currentTaskCycleReceiptId = await gelatoCore.currentTaskReceiptId();

    // CYCLES + INTERCEPTS
    for (let i = 0; i < 20; i++) {
      // console.log("\n NEW CYCLE \n");

      // INTERCEPT TASK SUBMISSION & Execution
      if (i == 2 || i == 5 || i == 13) {
        // console.log("\nIntercept");

        // Submit normal task1 (ActionDummy-1: true)
        await expect(
          gelatoUserProxy.submitTask(gelatoProvider, task1, EXPIRY_DATE)
        ).to.emit(gelatoCore, "LogTaskSubmitted");

        // Check currentTaskCycleReceiptId
        expect(await gelatoCore.currentTaskReceiptId()).to.equal(
          currentTaskCycleReceiptId.add(1)
        );

        // Update InterceptTaskReceipt.id
        interceptTaskReceiptAsObj.id = await gelatoCore.currentTaskReceiptId();
        interceptTaskReceiptAsArray = convertTaskReceiptObjToArray(
          interceptTaskReceiptAsObj
        );

        // console.log("\n InterceptTask id: " + interceptTaskReceiptAsObj.id);

        // InterceptTaskReceipt event submission check
        const fetchedTaskReceiptAsArray = await run("fetchTaskReceipt", {
          taskreceiptid: interceptTaskReceiptAsObj.id.toString(),
          contractaddress: gelatoCore.address,
          array: true,
        });
        expect(
          nestedArraysAreEqual(
            fetchedTaskReceiptAsArray,
            interceptTaskReceiptAsArray
          )
        ).to.be.true;

        // InterceptTaskReceiptHash Check
        interceptTaskReceiptHash = await gelatoCore.hashTaskReceipt(
          interceptTaskReceiptAsObj
        );
        // console.log("InterceptTask Hash: " + interceptTaskReceiptHash + "\n");

        // gelatoCore.taskReceiptHash: Task
        expect(
          await gelatoCore.taskReceiptHash(interceptTaskReceiptAsObj.id)
        ).to.be.equal(interceptTaskReceiptHash);

        // INTERCEPT Execution
        // canExec
        expect(
          await gelatoCore
            .connect(executor)
            .canExec(interceptTaskReceiptAsObj, gelatoMaxGas, GELATO_GAS_PRICE)
        ).to.be.equal("OK");

        // Exec ActionDummyTask- and expect NO TASK to be auto-submitted
        await expect(
          gelatoCore.connect(executor).exec(interceptTaskReceiptAsObj, {
            gasPrice: GELATO_GAS_PRICE,
            gasLimit: gelatoMaxGas,
          })
        )
          .to.emit(actionDummy, "LogAction")
          .withArgs(true)
          .and.to.emit(gelatoCore, "LogExecSuccess")
          .and.not.to.emit(gelatoCore, "LogTaskSubmitted");

        // Expect currentTaskReceiptId to have no increment
        expect(await gelatoCore.currentTaskReceiptId()).to.equal(
          interceptTaskReceiptAsObj.id
        );

        // Expect interceptTaskReceiptHash to have been cleared
        expect(
          await gelatoCore.taskReceiptHash(interceptTaskReceiptAsObj.id)
        ).to.be.equal(constants.HashZero);

        // Update Task Submission tracking
        interceptTaskWasSubmitted = true;
        if (cyclicTask1WasSubmitted) cyclicTask1WasIntercepted = true;
        else if (cyclicTask2WasSubmitted) cyclicTask2WasIntercepted = true;
        cyclicTask1WasSubmitted = false;
        cyclicTask2WasSubmitted = false;
      }

      // 🚲  CYCLES 🚲

      // Cyclic Task Updates & Checks
      if (cyclicTask1WasSubmitted || cyclicTask1WasIntercepted) {
        // Update CyclicTask1 Id
        cyclicTask1ReceiptAsObj.id = currentTaskCycleReceiptId;
        cyclicTask1ReceiptAsArray = convertTaskReceiptObjToArray(
          cyclicTask1ReceiptAsObj
        );

        // console.log("\n CyclicTask1 id: " + cyclicTask1ReceiptAsObj.id);

        // Event TaskReceipt Emission Check: CyclicTask1
        // Fetch the TaskReceipt of the last submitted Task and compare
        //  with our locally constructed TaskReceipt copy
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

        // HASH CHECK: CylicTask1
        // TaskReceiptHash: CyclicTask1
        cyclicTask1ReceiptHash = await gelatoCore.hashTaskReceipt(
          cyclicTask1ReceiptAsObj
        );
        // gelatoCore.taskReceiptHash: cyclicTask-1
        expect(
          await gelatoCore.taskReceiptHash(cyclicTask1ReceiptAsObj.id)
        ).to.be.equal(cyclicTask1ReceiptHash);

        // console.log("CyclicTask1 Hash: " + cyclicTask1ReceiptHash + "\n");
      } else if (cyclicTask2WasSubmitted || cyclicTask2WasIntercepted) {
        // Update CyclicTask2 Id
        cyclicTask2ReceiptAsObj.id = currentTaskCycleReceiptId;
        cyclicTask2ReceiptAsArray = convertTaskReceiptObjToArray(
          cyclicTask2ReceiptAsObj
        );

        // console.log("\n CyclicTask2 id: " + cyclicTask2ReceiptAsObj.id);

        // Event TaskReceipt Emission Check: CyclicTask2
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

        // HASH CHECK: CylicTask2
        // TaskReceiptHash: CyclicTask2
        cyclicTask2ReceiptHash = await gelatoCore.hashTaskReceipt(
          cyclicTask2ReceiptAsObj
        );
        // gelatoCore.taskReceiptHash: cyclicTask-2
        expect(
          await gelatoCore.taskReceiptHash(cyclicTask2ReceiptAsObj.id)
        ).to.be.equal(cyclicTask2ReceiptHash);

        // console.log("CyclicTask2 Hash: " + cyclicTask2ReceiptHash + "\n");
      }

      // CYCLES EXECUTION + AUTO-SUBMISSION
      // canExec
      expect(
        await gelatoCore
          .connect(executor)
          .canExec(
            cyclicTask1WasSubmitted || cyclicTask1WasIntercepted
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
            cyclicTask1WasSubmitted || cyclicTask1WasIntercepted
              ? cyclicTask1ReceiptAsObj
              : cyclicTask2ReceiptAsObj,
            {
              gasPrice: GELATO_GAS_PRICE,
              gasLimit: gelatoMaxGas,
            }
          )
      )
        .to.emit(actionDummy, "LogAction")
        .withArgs(
          cyclicTask1WasSubmitted || cyclicTask1WasIntercepted ? true : false
        )
        .and.to.emit(gelatoCore, "LogExecSuccess")
        .and.to.emit(gelatoCore, "LogTaskSubmitted");

      // Expect executed cyclic TaskReceiptHash to have been cleared
      expect(
        await gelatoCore.taskReceiptHash(
          cyclicTask1WasSubmitted
            ? cyclicTask1ReceiptAsObj.id
            : cyclicTask2ReceiptAsObj.id
        )
      ).to.be.equal(constants.HashZero);

      // check currentTaskCycleReceiptId
      // Check If Interception took place
      const intercepted =
        cyclicTask1WasIntercepted || cyclicTask2WasIntercepted ? true : false;
      let expectedId = currentTaskCycleReceiptId.add(1);
      expectedId = intercepted ? expectedId.add(1) : expectedId;
      expect(await gelatoCore.currentTaskReceiptId()).to.equal(expectedId);

      // Update TaskReceipt.id from currentTaskCycleReceiptId
      currentTaskCycleReceiptId = await gelatoCore.currentTaskReceiptId();

      // RESET: cyclicTask1WasSubmitted => false because now cyclicTask2 was submitted
      if (cyclicTask1WasSubmitted) {
        cyclicTask1WasSubmitted = false;
        cyclicTask1WasIntercepted = false;
        cyclicTask2WasSubmitted = true;
      } else if (cyclicTask2WasSubmitted) {
        cyclicTask2WasSubmitted = false;
        cyclicTask2WasIntercepted = false;
        cyclicTask1WasSubmitted = true;
      } else if (interceptTaskWasSubmitted) {
        interceptTaskWasSubmitted = false;
        if (cyclicTask1WasIntercepted) {
          cyclicTask1WasSubmitted = false;
          cyclicTask1WasIntercepted = false;
          cyclicTask2WasSubmitted = true;
        } else if (cyclicTask2WasIntercepted) {
          cyclicTask2WasSubmitted = false;
          cyclicTask2WasIntercepted = false;
          cyclicTask1WasSubmitted = true;
        }
      }
    }
  });

  // describe("Advanced Task Cycle Test Cases", function () {});
});
