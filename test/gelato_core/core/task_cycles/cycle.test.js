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
  let gelatoUserProxy;

  // Gelato variables
  let currentTaskCycleReceiptId;
  let gelatoMaxGas;

  // TaskBases
  let taskBase1;
  let taskBase2;

  // Tasks
  let interceptTask;
  let cyclicTask1;
  let cyclicTask2;

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
    interceptTask = new Task({ base: taskBase1, next: "1" });

    // CyclicTask:
    cyclicTask1 = new Task({
      base: taskBase1, // dynamic
      next: 1, // static: auto-filled by GelatoCore upon cycle creation
      cycle: [taskBase1, taskBase2], // static: auto-filled by GelatoCore upon cycle creation
    });
    // Always auto-submitted by GelatoCore after cyclicTask1
    cyclicTask2 = new Task({
      base: taskBase2, // dynamic
      next: 2, // static: auto-filled by GelatoCore upon cycle creation
      cycle: [taskBase1, taskBase2], // static
    });

    // TaskReceipt: Task
    interceptTaskReceiptAsObj = new TaskReceipt({
      userProxy: userProxyAddress,
      task: interceptTask,
    });
    interceptTaskReceiptAsArray = convertTaskReceiptObjToArray(
      interceptTaskReceiptAsObj
    );

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
    // console.log("\n INIT \n");

    // CreateTwo userProxy and submit interceptTask in one tx
    await expect(
      gelatoUserProxyFactory.createTwo(SALT_NONCE, [], [cyclicTask1], false)
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

    // Init Task Cycle Id: We initiated cycle in createTwo
    currentTaskCycleReceiptId = await gelatoCore.currentTaskReceiptId();

    // CYCLE + INTERCEPTS
    for (let i = 0; i < 20; i++) {
      if (i != 0)
        if (i == 2 || i == 5 || i == 13) {
          // console.log("\n NEW ROUND \n");

          // INTERCEPT TASK SUBMISSION & Execution
          // console.log("\nIntercept");

          // Submit normal interceptTask (ActionDummy-1: true)
          await expect(gelatoUserProxy.submitTask(interceptTask)).to.emit(
            gelatoCore,
            "LogTaskSubmitted"
          );

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
              .canExec(
                interceptTaskReceiptAsObj,
                gelatoMaxGas,
                GELATO_GAS_PRICE
              )
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

      // 🚲  CYCLE 🚲

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

      // CYCLE EXEXECUTION + AUTO-SUBMISSION
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
