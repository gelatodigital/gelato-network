// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect, assert } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");
//
const GELATO_GAS_PRICE = ethers.utils.parseUnits("8", "gwei");

const EXPIRY_DATE = 0;
const SUBMISSIONS_LEFT = 1;

// ##### Gnosis Action Test Cases #####
// 1. All sellTokens got converted into buy tokens, sufficient for withdrawal
// 2. All sellTokens got converted into buy tokens, insufficient for withdrawal
// 3. SellTokens got partially converted into buy tokens, insufficient buy tokens for withdrawal
// 4. No sellTokens got converted into buy tokens, sufficient sell tokens for withdrawal
// 5. No sellTokens got converted into buy tokens, insufficient sell tokens for withdrawal
describe("GelatoCore.processProviderPayables", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
  let actionWithdrawBatchExchange;
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
  let sellToken; //DAI
  let buyToken; //USDC
  let testToken; //GUSD
  let ActionWithdrawBatchExchange;
  let MockERC20;
  let MockBatchExchange;
  let mockBatchExchange;
  let WETH;
  let GelatoUserProxyFactory;
  let gelatoUserProxyFactory;
  let sellDecimals;
  let buyDecimals;
  let wethDecimals;
  let testDecimals;
  let tx;
  let txResponse;
  let providerModuleGelatoUserProxy;
  let providerModuleGelatoUserProxyAddress;
  let gelatoCore;
  let actionERC20TransferFrom;
  let mockConditionDummy;
  let mockConditionDummyRevert;
  let actionERC20TransferFromGelato;

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
    await gelatoCore
      .connect(executor)
      .stakeExecutor({ value: ethers.utils.parseUnits("1", "ether") });

    // Deploy Gelato Gas Price Oracle with SysAdmin and set to GELATO_GAS_PRICE
    const GelatoGasPriceOracle = await ethers.getContractFactory(
      "GelatoGasPriceOracle",
      sysAdmin
    );
    const gelatoGasPriceOracle = await GelatoGasPriceOracle.deploy(
      GELATO_GAS_PRICE
    );

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

    // Deploy ProviderModuleGelatoUserProxy with constructorArgs
    const ProviderModuleGelatoUserProxy = await ethers.getContractFactory(
      "ProviderModuleGelatoUserProxy",
      sysAdmin
    );
    providerModuleGelatoUserProxy = await ProviderModuleGelatoUserProxy.deploy(
      gelatoUserProxyFactory.address
    );

    // Deploy Condition (if necessary)
    const MockConditionDummy = await ethers.getContractFactory(
      "MockConditionDummy",
      sysAdmin
    );
    mockConditionDummy = await MockConditionDummy.deploy();
    await mockConditionDummy.deployed();

    // Deploy Actions
    // // ERCTransferFROM
    const ActionERC20TransferFrom = await ethers.getContractFactory(
      "ActionERC20TransferFrom",
      sysAdmin
    );
    actionERC20TransferFrom = await ActionERC20TransferFrom.deploy();
    await actionERC20TransferFrom.deployed();

    // // #### ActionWithdrawBatchExchange Start ####
    const MockBatchExchange = await ethers.getContractFactory(
      "MockBatchExchange"
    );
    mockBatchExchange = await MockBatchExchange.deploy();
    await mockBatchExchange.deployed();

    MockERC20 = await ethers.getContractFactory("MockERC20");
    wethDecimals = 18;
    WETH = await MockERC20.deploy(
      "WETH",
      (100 * 10 ** wethDecimals).toString(),
      sellerAddress,
      wethDecimals
    );
    await WETH.deployed();

    // DEPLOY DUMMY ERC20s
    // // Deploy Sell Token
    sellDecimals = 18;
    sellToken = await MockERC20.deploy(
      "DAI",
      (100 * 10 ** sellDecimals).toString(),
      sellerAddress,
      sellDecimals
    );
    await sellToken.deployed();

    // //  Deploy Buy Token
    buyDecimals = 6;
    buyToken = await MockERC20.deploy(
      "USDC",
      (100 * 10 ** buyDecimals).toString(),
      sellerAddress,
      buyDecimals
    );
    await buyToken.deployed();

    // //  Deploy Test Token
    testDecimals = 6;
    testToken = await MockERC20.deploy(
      "GUSD",
      (100 * 10 ** testDecimals).toString(),
      sellerAddress,
      buyDecimals
    );
    await testToken.deployed();

    // Pre-fund batch Exchange
    await buyToken.create(
      mockBatchExchange.address,
      ethers.utils.parseUnits("100", buyDecimals)
    );
    await sellToken.create(
      mockBatchExchange.address,
      ethers.utils.parseUnits("100", sellDecimals)
    );
    await WETH.create(
      mockBatchExchange.address,
      ethers.utils.parseUnits("100", wethDecimals)
    );

    const Medianizer2 = await ethers.getContractFactory("Medianizer2");
    const medianizer2 = await Medianizer2.deploy();
    await medianizer2.deployed();

    // Deploy Fee Finder
    const FeeFinder = await ethers.getContractFactory("FeeFinder");

    // Deploy Test feefinder (Assuming we only hit hard coded tokens, not testing uniswap, kyber or maker oracle)
    const feeFinder = await FeeFinder.deploy(
      sellToken.address,
      buyToken.address,
      testToken.address,
      sellToken.address,
      buyToken.address,
      sellToken.address,
      sellToken.address,
      WETH.address,
      medianizer2.address,
      medianizer2.address,
      medianizer2.address,
      medianizer2.address
    );
    await feeFinder.deployed();

    const ActionWithdrawBatchExchange = await ethers.getContractFactory(
      "ActionWithdrawBatchExchange"
    );
    actionWithdrawBatchExchange = await ActionWithdrawBatchExchange.deploy(
      mockBatchExchange.address,
      feeFinder.address
    );
    await actionWithdrawBatchExchange.deployed();

    // // #### ActionWithdrawBatchExchange End ####

    // Call provideFunds(value) with provider on core
    await gelatoCore.connect(provider).provideFunds(providerAddress, {
      value: ethers.utils.parseUnits("1", "ether"),
    });

    // Register new provider TaskSpec on core with provider EDITS NEED ä#######################

    const condition = new Condition({
      inst: constants.AddressZero,
      data: constants.HashZero,
    });

    actionERC20TransferFromGelato = new Action({
      addr: actionERC20TransferFrom.address,
      data: constants.HashZero,
      operation: Operation.Delegatecall,
      value: 0,
      termsOkCheck: true,
    });

    const actionWithdrawBatchExchangeGelato = new Action({
      addr: actionWithdrawBatchExchange.address,
      data: constants.HashZero,
      operation: Operation.Delegatecall,
      value: 0,
      termsOkCheck: true,
    });

    const newTaskSpec = new TaskSpec({
      conditions: [condition.inst],
      actions: [actionWithdrawBatchExchangeGelato],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    // Call multiProvide for actionWithdrawBatchExchange
    await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [newTaskSpec],
        [providerModuleGelatoUserProxy.address]
      );

    // Call multiProvide for mockConditionDummy + actionERC20TransferFrom
    const newTaskSpec2 = new TaskSpec({
      conditions: [mockConditionDummy.address],
      actions: [actionERC20TransferFromGelato],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    await gelatoCore.connect(provider).provideTaskSpecs([newTaskSpec2]);

    // Create UserProxy
    const createTx = await gelatoUserProxyFactory
      .connect(seller)
      .create([], [], []);
    await createTx.wait();
    userProxyAddress = await gelatoUserProxyFactory.gelatoProxyByUser(
      sellerAddress
    );
    userProxy = await ethers.getContractAt("GelatoUserProxy", userProxyAddress);

    // DEPLOY DUMMY ERC20s
    // // Deploy Sell Token
    sellDecimals = 18;
    sellToken = await MockERC20.deploy(
      "DAI",
      (100 * 10 ** sellDecimals).toString(),
      sellerAddress,
      sellDecimals
    );
    await sellToken.deployed();

    // //  Deploy Buy Token
    buyDecimals = 6;
    buyToken = await MockERC20.deploy(
      "USDC",
      (100 * 10 ** buyDecimals).toString(),
      sellerAddress,
      buyDecimals
    );
    await buyToken.deployed();

    // Pre-fund batch Exchange
    await buyToken.create(
      mockBatchExchange.address,
      ethers.utils.parseUnits("100", buyDecimals)
    );
    await sellToken.create(
      mockBatchExchange.address,
      ethers.utils.parseUnits("100", sellDecimals)
    );
    await WETH.create(
      mockBatchExchange.address,
      ethers.utils.parseUnits("100", wethDecimals)
    );
  });

  // We test different functionality of the contract as normal Mocha tests.
  describe("GelatoCore._processProviderPayables", function () {
    it("#1: Executor has a higher balance and gelato Stake after successful execution compared to before", async function () {
      // Provider registers new condition
      const MockActionDummy = await ethers.getContractFactory(
        "MockActionDummy",
        sysAdmin
      );

      const mockActionDummy = await MockActionDummy.deploy();
      await mockActionDummy.deployed();

      const mockActionDummyGelato = new Action({
        addr: mockActionDummy.address,
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      // Provider registers new acttion

      const newTaskSpec2 = new TaskSpec({
        actions: [mockActionDummyGelato],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      // Instantiate ProviderModule that reverts in execPayload()

      await gelatoCore
        .connect(provider)
        .multiProvide(
          constants.AddressZero,
          [newTaskSpec2],
          [constants.AddressZero]
        );
      // Provider batch providers dummy action and revertinng module

      const abi = ["function action(bool)"];
      const interFace = new utils.Interface(abi);

      const actionData = interFace.functions.action.encode([true]);

      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const action = new Action({
        addr: mockActionDummy.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider: gelatoProvider,
        actions: [action],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      const submitTaskTx = await userProxy.submitTask(task, EXPIRY_DATE);
      await submitTaskTx.wait();

      const executorBalanceBefore = await ethers.provider.getBalance(
        executorAddress
      );

      const executorStakeBefore = await gelatoCore.executorStake(
        executorAddress
      );

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      ).to.emit(gelatoCore, "LogExecSuccess");

      const executorStakeAfter = await gelatoCore.executorStake(
        executorAddress
      );

      await gelatoCore
        .connect(executor)
        .withdrawExcessExecutorStake(executorStakeAfter - executorStakeBefore);

      const executorBalanceAfter = await ethers.provider.getBalance(
        executorAddress
      );

      assert.isAbove(
        executorStakeAfter,
        executorStakeBefore,
        "Executor Stake on gelato should have increased"
      );

      assert.isAbove(
        executorBalanceAfter,
        executorBalanceBefore,
        "Executor should have make a profit from the execution"
      );
    });

    it("#2: Executor has a higher gelato stake after unsuccessfull execution compared to its ETH balance before, when overMaxGas was sent", async function () {
      // Provider registers new condition
      const MockActionDummyRevert = await ethers.getContractFactory(
        "MockActionDummyRevert",
        sysAdmin
      );

      const mockActionDummyRevert = await MockActionDummyRevert.deploy();
      await mockActionDummyRevert.deployed();

      const mockActionDummyRevertGelato = new Action({
        addr: mockActionDummyRevert.address,
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      // Provider registers new acttion

      const newTaskSpec2 = new TaskSpec({
        actions: [mockActionDummyRevertGelato],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      // Instantiate ProviderModule that reverts in execPayload()

      await gelatoCore
        .connect(provider)
        .multiProvide(
          constants.AddressZero,
          [newTaskSpec2],
          [constants.AddressZero]
        );
      // Provider batch providers dummy action and revertinng module

      const abi = ["function action(bool)"];
      const interFace = new utils.Interface(abi);

      const actionData = interFace.functions.action.encode([true]);

      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const action = new Action({
        addr: mockActionDummyRevert.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider: gelatoProvider,
        actions: [action],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      const submitTaskTx = await userProxy.submitTask(task, EXPIRY_DATE);
      await submitTaskTx.wait();

      const executorBalanceBefore = await ethers.provider.getBalance(
        executorAddress
      );

      const executorStakeBefore = await gelatoCore.executorStake(
        executorAddress
      );

      const gelatoMaxGas = await gelatoCore.gelatoMaxGas();

      await expect(
        gelatoCore.connect(executor).exec(taskReceipt, {
          gasPrice: GELATO_GAS_PRICE,
          gasLimit: ethers.utils
            .bigNumberify(gelatoMaxGas)
            .add(ethers.utils.bigNumberify("50000")),
        })
      ).to.emit(gelatoCore, "LogExecReverted");

      const executorStakeAfter = await gelatoCore.executorStake(
        executorAddress
      );

      const executorBalanceAfter = await ethers.provider.getBalance(
        executorAddress
      );

      assert.isAbove(
        executorStakeAfter,
        executorStakeBefore,
        "Executor Stake on gelato should have increased"
      );

      assert.isAbove(
        ethers.utils
          .bigNumberify(executorBalanceAfter)
          .add(ethers.utils.bigNumberify(executorStakeAfter))
          .sub(ethers.utils.bigNumberify(executorStakeBefore)),
        ethers.utils.bigNumberify(executorBalanceBefore),
        "Executor's Stake on gelato should have increased by more than the decrease in its Balance"
      );
    });

    it("#3: Executor's stake on gelato REMAINS UNCHANGED after unsuccessfull execution from an out of gas revert (LogExecReverted) with gas sent being LESS than gelatoMaxGas", async function () {
      // Provider registers new condition
      const MockActionDummyOutOfGas = await ethers.getContractFactory(
        "MockActionDummyOutOfGas",
        sysAdmin
      );

      const mockActionDummyOutOfGas = await MockActionDummyOutOfGas.deploy();
      await mockActionDummyOutOfGas.deployed();

      const mockActionDummyOutOfGasGelato = new Action({
        addr: mockActionDummyOutOfGas.address,
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: false,
      });

      const mockActionDummyOutOfGasGelato2 = new Action({
        addr: mockActionDummyOutOfGas.address,
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      // Provider registers new acttion

      const newTaskSpec2 = new TaskSpec({
        actions: [
          mockActionDummyOutOfGasGelato,
          mockActionDummyOutOfGasGelato2,
        ],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      // Instantiate ProviderModule that reverts in execPayload()

      await gelatoCore
        .connect(provider)
        .multiProvide(
          constants.AddressZero,
          [newTaskSpec2],
          [constants.AddressZero]
        );
      // Provider batch providers dummy action and revertinng module

      const abi = ["function action(bool)"];
      const interFace = new utils.Interface(abi);

      const actionData = interFace.functions.action.encode([true]);

      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const action = new Action({
        addr: mockActionDummyOutOfGas.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: false,
      });

      const action2 = new Action({
        addr: mockActionDummyOutOfGas.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider: gelatoProvider,
        actions: [action, action2],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      const submitTaskTx = await userProxy.submitTask(task, EXPIRY_DATE);
      await submitTaskTx.wait();

      const executorBalanceBefore = await ethers.provider.getBalance(
        executorAddress
      );

      const executorStakeBefore = await gelatoCore.executorStake(
        executorAddress
      );

      await expect(
        gelatoCore.connect(executor).exec(taskReceipt, {
          gasPrice: GELATO_GAS_PRICE,
          gasLimit: ethers.utils
            .bigNumberify("600000")
            // .bigNumberify(gelatoMaxGas)
            .add(ethers.utils.bigNumberify("50000")),
        })
      ).to.emit(gelatoCore, "LogExecReverted");
      // ).to.emit(gelatoCore, "LogExecReverted");

      const executorStakeAfter = await gelatoCore.executorStake(
        executorAddress
      );

      const executorBalanceAfter = await ethers.provider.getBalance(
        executorAddress
      );

      expect(executorStakeAfter).to.equal(
        executorStakeBefore,
        "Executor Stake on gelato should remain unchanged"
      );

      assert.isBelow(
        executorBalanceAfter,
        executorBalanceBefore,
        "Executor's Balance should decrease due to Tx costs"
      );
    });

    it("#4: Executor's stake on gelato INCREASES after unsuccessfull execution from an out of gas revert (LogExecReverted) with gas sent being MORE than gelatoMaxGas", async function () {
      // Provider registers new condition
      const MockActionDummyOutOfGas = await ethers.getContractFactory(
        "MockActionDummyOutOfGas",
        sysAdmin
      );

      const mockActionDummyOutOfGas = await MockActionDummyOutOfGas.deploy();
      await mockActionDummyOutOfGas.deployed();

      const mockActionDummyOutOfGasGelato = new Action({
        addr: mockActionDummyOutOfGas.address,
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      // Provider registers new acttion

      const newTaskSpec2 = new TaskSpec({
        actions: [mockActionDummyOutOfGasGelato, mockActionDummyOutOfGasGelato],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      // Instantiate ProviderModule that reverts in execPayload()

      await gelatoCore
        .connect(provider)
        .multiProvide(
          constants.AddressZero,
          [newTaskSpec2],
          [constants.AddressZero]
        );
      // Provider batch providers dummy action and revertinng module

      const abi = ["function action(bool)"];
      const interFace = new utils.Interface(abi);

      const actionData = interFace.functions.action.encode([true]);

      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const action = new Action({
        addr: mockActionDummyOutOfGas.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider: gelatoProvider,
        actions: [action, action],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      const submitTaskTx = await userProxy.submitTask(task, EXPIRY_DATE);
      await submitTaskTx.wait();

      const executorBalanceBefore = await ethers.provider.getBalance(
        executorAddress
      );

      const executorStakeBefore = await gelatoCore.executorStake(
        executorAddress
      );

      const gelatoMaxGas = await gelatoCore.gelatoMaxGas();

      await expect(
        gelatoCore.connect(executor).exec(taskReceipt, {
          gasPrice: GELATO_GAS_PRICE,
          gasLimit: ethers.utils
            .bigNumberify(gelatoMaxGas)
            .add(ethers.utils.bigNumberify("50000")),
        })
      ).to.emit(gelatoCore, "LogExecReverted");
      // ).to.emit(gelatoCore, "LogExecReverted");

      const executorStakeAfter = await gelatoCore.executorStake(
        executorAddress
      );

      const executorBalanceAfter = await ethers.provider.getBalance(
        executorAddress
      );

      assert.isAbove(
        ethers.utils
          .bigNumberify(executorBalanceAfter)
          .add(ethers.utils.bigNumberify(executorStakeAfter))
          .sub(ethers.utils.bigNumberify(executorStakeBefore)),
        ethers.utils.bigNumberify(executorBalanceBefore),
        "Executor's Stake on gelato should have increased by more than the decrease in its Balance"
      );

      assert.isBelow(
        executorBalanceAfter,
        executorBalanceBefore,
        "Executor's Stake on gelato should have increased by more than the decrease in its Balance"
      );
    });
  });
});
