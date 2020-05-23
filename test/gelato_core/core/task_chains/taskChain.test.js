// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

const { run } = require("@nomiclabs/buidler");

const GELATO_GAS_PRICE = utils.parseUnits("10", "gwei");

const SALT_NONCE = 42069;

const EXPIRY_DATE = 0;

const REQUESTED_SUBMITS = 21;

describe("Gelato Actions - TASK CHAINS - ARBITRARY", function () {
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
  let currentTaskChainReceiptId;
  let gelatoMaxGas;

  // Gelato Provider
  let gelatoProvider;

  // Tasks
  let task1;
  let task2;

  // TaskReceipts
  let interceptTaskReceiptAsObj;
  let chainedTask1ReceiptAsObj;
  let chainedTask2ReceiptAsObj;

  // For event tests (ethers v4 understands structs as arrays)
  let interceptTaskReceiptAsArray;
  let chainedTask1ReceiptAsArray;
  let chainedTask2ReceiptAsArray;

  // TaskReceiptHashes
  let interceptTaskReceiptHash;
  let chainedTask1ReceiptHash;
  let chainedTask2ReceiptHash;

  // submissionsLeft
  let taskChainSubmissionsCounter;
  let submissionsLeft = REQUESTED_SUBMITS;

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
    gelatoProvider = new GelatoProvider({
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

    // TaskReceipt: ChainedTask1
    chainedTask1ReceiptAsObj = new TaskReceipt({
      userProxy: userProxyAddress,
      provider: gelatoProvider,
      index: 0, // dynamic: auto-filled by GelatoCore upon tasks creation
      tasks: [task1, task2], // static: auto-filled by GelatoCore upon tasks creation
      submissionsLeft: REQUESTED_SUBMITS,
    });

    // TaskReceipt: ChainedTask2
    chainedTask2ReceiptAsObj = new TaskReceipt({
      userProxy: userProxyAddress,
      provider: gelatoProvider,
      index: 1, // After first execution, next will be placed to 0
      tasks: [task1, task2], // static
      submissionsLeft: REQUESTED_SUBMITS - 1,
    });
  });

  it("Should revert when requesting an invalid number of submits", async function () {
    // console.log("\n INIT \n");

    // CreateTwo userProxy and submit interceptTask in one tx
    await expect(
      gelatoUserProxyFactory.createTwoExecActionsSubmitTaskChain(
        SALT_NONCE,
        [],
        gelatoProvider,
        [task1, task2],
        EXPIRY_DATE,
        1
      )
    ).to.be.revertedWith(
      "GelatoCore.submitTaskChain: less requested submits than tasks"
    );
  });

  it("Should allow to enter an Arbitrary Task Chain upon creating a GelatoUserProxy", async function () {
    // console.log("\n INIT \n");

    // CreateTwo userProxy and submit interceptTask in one tx
    await expect(
      gelatoUserProxyFactory.createTwoExecActionsSubmitTaskChain(
        SALT_NONCE,
        [],
        gelatoProvider,
        [task1, task2],
        EXPIRY_DATE,
        REQUESTED_SUBMITS
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
    let chainedTask1WasSubmitted = true;
    let chainedTask2WasSubmitted = false;
    let interceptTaskWasSubmitted = false;
    let chainedTask1WasIntercepted = false;
    let chainedTask2WasIntercepted = false;

    // Init Task Chain Id: We initiated tasks in createTwo
    currentTaskChainReceiptId = await gelatoCore.currentTaskReceiptId();

    // We need to keep track of this during interceptions
    taskChainSubmissionsCounter = 1;

    // SUBMISSIONS_LEFT + INTERCEPTS
    for (let i = 1; i <= REQUESTED_SUBMITS + 1; i++) {
      // Case: ALL CHAINED TASKS EXECUTED
      if (i == REQUESTED_SUBMITS + 1) {
        expect(
          await gelatoCore
            .connect(executor)
            .canExec(
              chainedTask1WasSubmitted || chainedTask1WasIntercepted
                ? chainedTask1ReceiptAsObj
                : chainedTask2ReceiptAsObj,
              gelatoMaxGas,
              GELATO_GAS_PRICE
            )
        ).to.be.equal("InvalidTaskReceiptHash");
        break;
      }

      // console.log("\n NEW CHAIN  \n");
      // console.log(`EXECUTING: ${i % 2 == 0 ? "B" : "A"}`);
      // console.log(
      // `\n TaskChain Submission Counter: ${taskChainSubmissionsCounter} \n`
      // );
      // console.log(`\n submissionsLeft: ${submissionsLeft} \n`);

      // INTERCEPT TASK SUBMISSION & Execution
      if (i == 2 || i == 5 || i == 13) {
        // console.log("\nIntercept");

        // Submit normal task1 (ActionDummy-1: true)
        await expect(
          gelatoUserProxy.submitTask(gelatoProvider, task1, EXPIRY_DATE)
        ).to.emit(gelatoCore, "LogTaskSubmitted");

        // Check currentTaskChainReceiptId
        expect(await gelatoCore.currentTaskReceiptId()).to.equal(
          currentTaskChainReceiptId.add(1)
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
        if (chainedTask1WasSubmitted) chainedTask1WasIntercepted = true;
        else if (chainedTask2WasSubmitted) chainedTask2WasIntercepted = true;
        chainedTask1WasSubmitted = false;
        chainedTask2WasSubmitted = false;
      }

      // 🚲  SUBMISSIONS_LEFT 🚲

      // Chained Task Updates & Checks
      if (chainedTask1WasSubmitted || chainedTask1WasIntercepted) {
        // Update ChainedTask1Receipt Id
        chainedTask1ReceiptAsObj.id = currentTaskChainReceiptId;

        // Update ChainedTask1Receipt submissionsLeft
        chainedTask1ReceiptAsObj.submissionsLeft = submissionsLeft;

        // Convert ChainedTask1Receipt to Array for event log comparison
        chainedTask1ReceiptAsArray = convertTaskReceiptObjToArray(
          chainedTask1ReceiptAsObj
        );

        // console.log("\n ChainedTask1 id: " + chainedTask1ReceiptAsObj.id);

        // Event TaskReceipt Emission Check: ChainedTask1
        // Fetch the TaskReceipt of the last submitted Task and compare
        //  with our locally constructed TaskReceipt copy
        const fetchedChainedTask1ReceiptAsArray = await run(
          "fetchTaskReceipt",
          {
            taskreceiptid: chainedTask1ReceiptAsObj.id.toString(),
            contractaddress: gelatoCore.address,
            array: true,
          }
        );
        expect(
          nestedArraysAreEqual(
            fetchedChainedTask1ReceiptAsArray,
            chainedTask1ReceiptAsArray
          )
        ).to.be.true;

        // HASH CHECK: CylicTask1
        // TaskReceiptHash: ChainedTask1
        chainedTask1ReceiptHash = await gelatoCore.hashTaskReceipt(
          chainedTask1ReceiptAsObj
        );
        // gelatoCore.taskReceiptHash: chainedTask-1
        expect(
          await gelatoCore.taskReceiptHash(chainedTask1ReceiptAsObj.id)
        ).to.be.equal(chainedTask1ReceiptHash);

        // console.log("ChainedTask1 Hash: " + chainedTask1ReceiptHash + "\n");
      } else if (chainedTask2WasSubmitted || chainedTask2WasIntercepted) {
        // Update ChainedTask2 Id
        chainedTask2ReceiptAsObj.id = currentTaskChainReceiptId;

        // Update ChainedTask2Receipt submissionsLeft
        chainedTask2ReceiptAsObj.submissionsLeft = submissionsLeft;

        // Convert ChainedTask2Receipt to Array for event log comparison
        chainedTask2ReceiptAsArray = convertTaskReceiptObjToArray(
          chainedTask2ReceiptAsObj
        );

        // console.log("\n ChainedTask2 id: " + chainedTask2ReceiptAsObj.id);

        // Event TaskReceipt Emission Check: ChainedTask2
        const fetchedChainedTask2ReceiptAsArray = await run(
          "fetchTaskReceipt",
          {
            taskreceiptid: chainedTask2ReceiptAsObj.id.toString(),
            contractaddress: gelatoCore.address,
            array: true,
          }
        );
        expect(
          nestedArraysAreEqual(
            fetchedChainedTask2ReceiptAsArray,
            chainedTask2ReceiptAsArray
          )
        ).to.be.true;

        // HASH CHECK: CylicTask2
        // TaskReceiptHash: ChainedTask2
        chainedTask2ReceiptHash = await gelatoCore.hashTaskReceipt(
          chainedTask2ReceiptAsObj
        );
        // gelatoCore.taskReceiptHash: chainedTask-2
        expect(
          await gelatoCore.taskReceiptHash(chainedTask2ReceiptAsObj.id)
        ).to.be.equal(chainedTask2ReceiptHash);

        // console.log("ChainedTask2 Hash: " + chainedTask2ReceiptHash + "\n");
      }

      // Case: LAST CHAINED TASK EXECUTION
      if (submissionsLeft == 1) {
        expect(
          await gelatoCore
            .connect(executor)
            .canExec(
              chainedTask1WasSubmitted || chainedTask1WasIntercepted
                ? chainedTask1ReceiptAsObj
                : chainedTask2ReceiptAsObj,
              gelatoMaxGas,
              GELATO_GAS_PRICE
            )
        ).to.be.equal("OK");

        // Exec ActionDummyTask-X and expect ActionDummyTask-Y to be automitically submitted
        await expect(
          gelatoCore
            .connect(executor)
            .exec(
              chainedTask1WasSubmitted || chainedTask1WasIntercepted
                ? chainedTask1ReceiptAsObj
                : chainedTask2ReceiptAsObj,
              {
                gasPrice: GELATO_GAS_PRICE,
                gasLimit: gelatoMaxGas,
              }
            )
        )
          .to.emit(actionDummy, "LogAction")
          .withArgs(
            chainedTask1WasSubmitted || chainedTask1WasIntercepted
              ? true
              : false
          )
          .and.to.emit(gelatoCore, "LogExecSuccess")
          .and.not.to.emit(gelatoCore, "LogTaskSubmitted");

        // Expect executed chained TaskReceiptHash to have been cleared
        expect(
          await gelatoCore.taskReceiptHash(
            chainedTask1WasSubmitted
              ? chainedTask1ReceiptAsObj.id
              : chainedTask2ReceiptAsObj.id
          )
        ).to.be.equal(constants.HashZero);

        // WE ARE DONE!
        continue;
      }

      // SUBMISSIONS_LEFT EXEXECUTION + AUTO-SUBMISSION
      // canExec
      expect(
        await gelatoCore
          .connect(executor)
          .canExec(
            chainedTask1WasSubmitted || chainedTask1WasIntercepted
              ? chainedTask1ReceiptAsObj
              : chainedTask2ReceiptAsObj,
            gelatoMaxGas,
            GELATO_GAS_PRICE
          )
      ).to.be.equal("OK");

      // Exec ActionDummyTask-X and expect ActionDummyTask-Y to be automitically submitted
      await expect(
        gelatoCore
          .connect(executor)
          .exec(
            chainedTask1WasSubmitted || chainedTask1WasIntercepted
              ? chainedTask1ReceiptAsObj
              : chainedTask2ReceiptAsObj,
            {
              gasPrice: GELATO_GAS_PRICE,
              gasLimit: gelatoMaxGas,
            }
          )
      )
        .to.emit(actionDummy, "LogAction")
        .withArgs(
          chainedTask1WasSubmitted || chainedTask1WasIntercepted ? true : false
        )
        .and.to.emit(gelatoCore, "LogExecSuccess")
        .and.to.emit(gelatoCore, "LogTaskSubmitted");

      // Expect executed chained TaskReceiptHash to have been cleared
      expect(
        await gelatoCore.taskReceiptHash(
          chainedTask1WasSubmitted
            ? chainedTask1ReceiptAsObj.id
            : chainedTask2ReceiptAsObj.id
        )
      ).to.be.equal(constants.HashZero);

      // check currentTaskChainReceiptId
      // Check If Interception took place
      const intercepted =
        chainedTask1WasIntercepted || chainedTask2WasIntercepted ? true : false;
      let expectedId = currentTaskChainReceiptId.add(1);
      expectedId = intercepted ? expectedId.add(1) : expectedId;
      expect(await gelatoCore.currentTaskReceiptId()).to.equal(expectedId);

      // Update TaskReceipt.id from currentTaskChainReceiptId
      currentTaskChainReceiptId = await gelatoCore.currentTaskReceiptId();

      // Update Submissions Trackers
      submissionsLeft = REQUESTED_SUBMITS - taskChainSubmissionsCounter;
      taskChainSubmissionsCounter++;

      // RESET: chainedTask1WasSubmitted => false because now chainedTask2 was submitted
      if (chainedTask1WasSubmitted) {
        chainedTask1WasSubmitted = false;
        chainedTask1WasIntercepted = false;
        chainedTask2WasSubmitted = true;
      } else if (chainedTask2WasSubmitted) {
        chainedTask2WasSubmitted = false;
        chainedTask2WasIntercepted = false;
        chainedTask1WasSubmitted = true;
      } else if (interceptTaskWasSubmitted) {
        interceptTaskWasSubmitted = false;
        if (chainedTask1WasIntercepted) {
          chainedTask1WasSubmitted = false;
          chainedTask1WasIntercepted = false;
          chainedTask2WasSubmitted = true;
        } else if (chainedTask2WasIntercepted) {
          chainedTask2WasSubmitted = false;
          chainedTask2WasIntercepted = false;
          chainedTask1WasSubmitted = true;
        }
      }
    }
  });

  // describe("Advanced Task Chain Test Cases", function () {});
});
