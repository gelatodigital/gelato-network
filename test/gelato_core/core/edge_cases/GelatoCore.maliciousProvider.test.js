// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

const { run } = require("@nomiclabs/buidler");

const GELATO_GAS_PRICE = utils.parseUnits("10", "gwei");

const PROVIDED_FUNDS = utils.parseEther("1");

const SALT_NONCE = 42069;

const SUBMISSIONS_LEFT = 1;

describe("GelatoCore - EdgeCase: Malicious Provider", function () {
  let GelatoCoreFactory;
  let GelatoGasPriceOracleFactory;
  let GelatoUserProxyFactoryFactory;
  let ProviderModuleGelatoUserProxyFactory;
  let MockActionMaliciousProviderFactory;

  let gelatoCore;
  let gelatoGasPriceOracle;
  let gelatoUserProxyFactory;
  let mockActionMaliciousProvider;
  let providerModuleGelatoUserProxy;

  let executor;
  let user;

  let executorAddress;
  let userAddress;

  let userProxyAddress;

  let mockActionMaliciousProviderStruct;

  let gelatoProvider;

  let task;
  let taskReceiptId;
  let taskReceipt;
  let taskReceiptHash;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCoreFactory = await ethers.getContractFactory("GelatoCore");
    GelatoGasPriceOracleFactory = await ethers.getContractFactory(
      "GelatoGasPriceOracle"
    );
    GelatoUserProxyFactoryFactory = await ethers.getContractFactory(
      "GelatoUserProxyFactory"
    );
    ProviderModuleGelatoUserProxyFactory = await ethers.getContractFactory(
      "ProviderModuleGelatoUserProxy"
    );
    MockActionMaliciousProviderFactory = await ethers.getContractFactory(
      "MockActionMaliciousProvider"
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
    mockActionMaliciousProvider = await MockActionMaliciousProviderFactory.deploy(
      gelatoCore.address
    );

    await gelatoCore.deployed();
    await gelatoGasPriceOracle.deployed();
    await gelatoUserProxyFactory.deployed();
    await providerModuleGelatoUserProxy.deployed();
    await mockActionMaliciousProvider.deployed();

    // set GelatoGasPriceOracle
    await gelatoCore.setGelatoGasPriceOracle(gelatoGasPriceOracle.address);

    // set GelatoGasPrice
    await gelatoGasPriceOracle.setGasPrice(GELATO_GAS_PRICE);

    // tx signers
    [_, executor, user] = await ethers.getSigners();
    executorAddress = await executor.getAddress();
    userAddress = await user.getAddress();

    userProxyAddress = await gelatoUserProxyFactory.predictProxyAddress(
      userAddress,
      SALT_NONCE
    );

    // Action
    const actionData = await run("abi-encode-withselector", {
      contractname: "MockActionMaliciousProvider",
      functionname: "action()",
    });
    mockActionMaliciousProviderStruct = new Action({
      addr: mockActionMaliciousProvider.address,
      data: actionData,
      operation: Operation.Call,
    });

    // stakeExecutor
    const stakeTx = await gelatoCore.connect(executor).stakeExecutor({
      value: await gelatoCore.minExecutorStake(),
    });
    await stakeTx.wait();

    // multiProvide: maliciousProvider
    const taskSpec = new TaskSpec({
      actions: [mockActionMaliciousProviderStruct],
      gasPriceCeil: utils.parseUnits("20", "gwei"),
    });

    const taskSpecHash = await gelatoCore.hashTaskSpec(taskSpec);

    await expect(
      mockActionMaliciousProvider.multiProvide(
        executorAddress,
        [taskSpec],
        [providerModuleGelatoUserProxy.address],
        { value: PROVIDED_FUNDS }
      )
    )
      .to.emit(gelatoCore, "LogFundsProvided")
      .withArgs(
        mockActionMaliciousProvider.address,
        PROVIDED_FUNDS,
        PROVIDED_FUNDS
      )
      .and.to.emit(gelatoCore, "LogProviderAssignedExecutor")
      .withArgs(
        mockActionMaliciousProvider.address,
        constants.AddressZero,
        executorAddress
      )
      .and.to.emit(gelatoCore, "LogTaskSpecProvided")
      .withArgs(mockActionMaliciousProvider.address, taskSpecHash)
      .and.to.emit(gelatoCore, "LogProviderModuleAdded")
      .withArgs(
        mockActionMaliciousProvider.address,
        providerModuleGelatoUserProxy.address
      );

    // Gelato Provider
    gelatoProvider = new GelatoProvider({
      addr: mockActionMaliciousProvider.address,
      module: providerModuleGelatoUserProxy.address,
    });

    // task to be submitted by userProxy
    task = new Task({
      actions: [mockActionMaliciousProviderStruct],
    });

    // taskReceipt
    taskReceiptId = (await gelatoCore.currentTaskReceiptId()).add(1);
    taskReceipt = new TaskReceipt({
      id: taskReceiptId,
      userProxy: userProxyAddress,
      provider: gelatoProvider,
      tasks: [task],
      submissionsLeft: SUBMISSIONS_LEFT,
    });
    taskReceiptHash = await gelatoCore.hashTaskReceipt(taskReceipt);

    // create UserProxy and submitTask
    await expect(
      gelatoUserProxyFactory
        .connect(user)
        .createTwoExecActionsSubmitTasks(
          SALT_NONCE,
          [],
          gelatoProvider,
          [task],
          [0]
        )
    )
      .to.emit(gelatoUserProxyFactory, "LogCreation")
      .withArgs(userAddress, userProxyAddress, 0)
      .and.to.emit(gelatoCore, "LogTaskSubmitted");
  });

  it("Should NOT allow Provider to unprovideFunds during execution", async function () {
    await expect(
      gelatoCore
        .connect(executor)
        .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 5000000 })
    ).to.be.revertedWith(
      "GelatoCore._processProviderPayables: providerFunds underflow"
    );
  });
});
