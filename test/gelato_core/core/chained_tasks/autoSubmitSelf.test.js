// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

const { run } = require("@nomiclabs/buidler");

const GELATO_GAS_PRICE = utils.parseUnits("10", "gwei");

const SALT_NONCE = 42069;
const FUNDING = utils.parseEther("1");

describe("Gelato Actions - CHAINED TASKS - GelatoUserProxy", function () {
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

  let chainedTask;

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
    const gelatoProvider = new GelatoProvider({
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

    // TaskSpec
    const taskSpec = new TaskSpec({
      actions: [actionDummyStruct],
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
        [taskSpec],
        [providerModuleGelatoUserProxy.address],
        { value: utils.parseEther("1") }
      );
    await multiProvideTx.wait();

    // Chained Task
    chainedTask = new Task({
      base: new TaskBase({
        provider: gelatoProvider,
        actions: [actionDummyStruct],
        autoResubmitSelf: true,
      }),
    });
  });

  it("Should allow to enter an Infinite Task Chain upon creating a GelatoUserProxy", async function () {
    // chainedTaskReceipt
    let chainedTaskReceiptId = (await gelatoCore.currentTaskReceiptId()).add(1);
    const chainedTaskReceipt = new TaskReceipt({
      id: chainedTaskReceiptId,
      userProxy: userProxyAddress,
      task: chainedTask,
    });
    let chainedTaskReceiptHash = await gelatoCore.hashTaskReceipt(
      chainedTaskReceipt
    );

    await expect(
      gelatoUserProxyFactory.createTwo(SALT_NONCE, [], [chainedTask], false)
    )
      .to.emit(gelatoUserProxyFactory, "LogCreation")
      .withArgs(userAddress, userProxyAddress, 0)
      .and.to.emit(gelatoCore, "LogTaskSubmitted");
    // withArgs not possible: suspect buidlerevm or ethers struct parsing bug
    // .withArgs(
    //   executorAddress,
    //   chainedTaskReceiptId,
    //   chainedTaskReceiptHash,
    //   chainedTaskReceipt
    // )

    for (let i = 0; i < 10; i++) {
      // canExec
      expect(
        await gelatoCore
          .connect(executor)
          .canExec(chainedTaskReceipt, gelatoMaxGas, GELATO_GAS_PRICE)
      ).to.be.equal("OK");

      // Exec ActionDummyTask and expect it to be resubmitted automatically
      await expect(
        gelatoCore.connect(executor).exec(chainedTaskReceipt, {
          gasPrice: GELATO_GAS_PRICE,
          gasLimit: await gelatoCore.gelatoMaxGas(),
        })
      )
        .to.emit(actionDummy, "LogAction")
        .withArgs(true)
        .and.to.emit(gelatoCore, "LogExecSuccess")
        .and.to.emit(gelatoCore, "LogTaskSubmitted");

      // // Update the Task Receipt for Second Go
      chainedTaskReceiptId = chainedTaskReceiptId.add(1);
      chainedTaskReceipt.id = chainedTaskReceiptId;
      chainedTaskReceiptHash = await gelatoCore.hashTaskReceipt(
        chainedTaskReceipt
      );
    }
  });
});
