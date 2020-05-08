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
  let userProxy;
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
  let task1;
  let task2;

  // Tasks
  let taskReceipt;
  let cyclicTaskReceipt1;
  let cyclicTaskReceipt2;

  // TaskReceipts
  let taskReceiptAsObj;
  let cyclicTaskReceipt1ReceiptAsObj;
  let cyclicTaskReceipt2ReceiptAsObj;

  // For event tests (ethers v4 understands structs as arrays)
  let taskReceiptAsArray;
  let cyclicTaskReceipt1ReceiptAsArray;
  let cyclicTaskReceipt2ReceiptAsArray;

  // TaskReceiptHashes
  let taskReceipt1Hash;
  let cyclicTaskReceipt1ReceiptHash;
  let cyclicTaskReceipt2ReceiptHash;

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

    // Task-1: ActionDummy-1:true
    task1 = new Task({
      provider: gelatoProvider,
      actions: [firstActionDummyStruct],
    });

    // Task-2: firstDummyConditionStruct-1:ok=true && actionDummy-2:false
    task2 = new Task({
      provider: gelatoProvider,
      conditions: [firstDummyConditionStruct],
      actions: [secondActionDummyStruct],
    });

    // Task:
    // taskReceipt = new TaskReceipt({
    //   userProxy: userProxyAddress,
    //   task: task1,
    //   next: "1",
    // });
    // CyclicTask:
    cyclicTaskReceipt1 = new TaskReceipt({
      id: 1,
      userProxy: userProxyAddress,
      task: task1, // dynamic
      next: 1, // dynamic: auto-filled by GelatoCore upon cycle creation
      cycle: [task1, task2], // static: auto-filled by GelatoCore upon cycle creation
    });

    // Always auto-submitted by GelatoCore after cyclicTaskReceipt1
    cyclicTaskReceipt2 = new TaskReceipt({
      id: 1,
      userProxy: userProxyAddress,
      task: task2, // dynamic
      next: 2, // dynamic
      cycle: [task1, task2], // static
    });

    taskReceiptAsArray = convertTaskReceiptObjToArray(cyclicTaskReceipt1);

    // cyclicTaskReceipt1ReceiptAsArray = convertTaskReceiptObjToArray(
    //   cyclicTaskReceipt1ReceiptAsObj
    // );

    // cyclicTaskReceipt2ReceiptAsArray = convertTaskReceiptObjToArray(
    //   cyclicTaskReceipt2ReceiptAsObj
    // );

    // TaskReceiptHash: Task
    taskReceipt1Hash = await gelatoCore.hashTaskReceipt(cyclicTaskReceipt1);

    // // TaskReceiptHash: CyclicTask2
    // cyclicTaskReceipt2ReceiptHash = await gelatoCore.hashTaskReceipt(
    //   cyclicTaskReceipt2ReceiptAsObj
    // );

    // Create UserProxy
    const createTx = await gelatoUserProxyFactory
      .connect(user)
      .createTwo(SALT_NONCE, [], [], false);
    await createTx.wait();

    userProxy = await ethers.getContractAt("GelatoUserProxy", userProxyAddress);
  });

  it("Should allow to enter an Arbitrary Task Cycle upon creating a GelatoUserProxy", async function () {
    // check if task1 can be submitted
    const canSubmitTask1 = await gelatoCore.canSubmitTask(
      userProxyAddress,
      task1
    );
    console.log(canSubmitTask1);

    // Submit Task: cyclicTaskReceipt1 (task1 and task2)
    await expect(userProxy.connect(user).submitTaskCycle([task1, task2]))
      .to.emit(gelatoCore, "LogTaskSubmitted")
      .withArgs(cyclicTaskReceipt1.id, taskReceipt1Hash, taskReceiptAsArray);

    // // CreateTwo userProxy and submit task in one tx
    // await expect(
    //   gelatoUserProxyFactory.createTwo(SALT_NONCE, [], [cyclicTaskReceipt1], false)
    // )
    //   .to.emit(gelatoUserProxyFactory, "LogCreation")
    //   .withArgs(userAddress, userProxyAddress, 0)
    // .and.to.emit(gelatoCore, "LogTaskSubmitted");
    // .withArgs(taskReceiptAsObj.id, taskReceipt1Hash, taskReceiptAsArray);

    // let fetchedCyclicTask1ReceiptAsArray = await run("fetchTaskReceipt", {
    //   taskreceiptid: "1",
    //   contractaddress: gelatoCore.address,
    //   array: true,
    // });

    // // Flag to switch between 2 tasks.
    // let cyclicTaskReceipt1WasSubmitted = true;
    // for (let i = 0; i < 10; i++) {
    //   // Update currentTaskReceiptId
    //   currentTaskReceiptId = await gelatoCore.currentTaskReceiptId();
    //   if (cyclicTaskReceipt1WasSubmitted)
    //     cyclicTaskReceipt1ReceiptAsObj.id = currentTaskReceiptId;
    //   else cyclicTaskReceipt2ReceiptAsObj.id = currentTaskReceiptId;

    //   let fetchedCyclicTask2ReceiptAsArray;
    //   if (!cyclicTaskReceipt1WasSubmitted) {
    //     fetchedCyclicTask2ReceiptAsArray = await run("fetchTaskReceipt", {
    //       taskreceiptid: "2",
    //       contractaddress: gelatoCore.address,
    //       array: true,
    //     });
    //   }

    //   // canExec
    //   expect(
    //     await gelatoCore
    //       .connect(executor)
    //       .canExec(
    //         cyclicTaskReceipt1WasSubmitted
    //           ? cyclicTaskReceipt1ReceiptAsObj
    //           : cyclicTaskReceipt2ReceiptAsObj,
    //         gelatoMaxGas,
    //         GELATO_GAS_PRICE
    //       )
    //   ).to.be.equal("OK");

    //   // Exec ActionDummyTask and expect it to be resubmitted automatically
    //   await expect(
    //     gelatoCore
    //       .connect(executor)
    //       .exec(
    //         cyclicTaskReceipt1WasSubmitted
    //           ? cyclicTaskReceipt1ReceiptAsObj
    //           : cyclicTaskReceipt2ReceiptAsObj,
    //         {
    //           gasPrice: GELATO_GAS_PRICE,
    //           gasLimit: gelatoMaxGas,
    //         }
    //       )
    //   )
    //     .to.emit(actionDummy, "LogAction")
    //     .withArgs(cyclicTaskReceipt1WasSubmitted ? true : false)
    //     .and.to.emit(gelatoCore, "LogExecSuccess")
    //     .and.to.emit(gelatoCore, "LogTaskSubmitted");

    //   // check currentTaskReceiptId
    //   expect(await gelatoCore.currentTaskReceiptId()).to.equal(
    //     currentTaskReceiptId.add(1)
    //   );

    //   // Update the Task Receipt for Second Go
    //   if (cyclicTaskReceipt1WasSubmitted) cyclicTaskReceipt1WasSubmitted = false;
    //   else cyclicTaskReceipt1WasSubmitted = true;
    // }
  });
});

function nestedArraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;

  for (var i = 0; i < a.length; ++i) {
    // console.log(
    //   `${a[i]} !== ${b[i]}  ? : ${a[i].toString() !== b[i].toString()}`
    // );
    if (Array.isArray(a[i])) return nestedArraysEqual(a[i], b[i]);
    if (a[i].toString() !== b[i].toString()) return false;
  }
  return true;
}
