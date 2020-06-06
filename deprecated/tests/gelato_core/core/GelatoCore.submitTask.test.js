// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");

const GELATO_GAS_PRICE = ethers.utils.parseUnits("8", "gwei");

const EXPIRY_DATE = 0;
const SUBMISSIONS_LEFT = 1;

describe("Gelato Core - Task Submission ", function () {
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
  let user2;
  let user2address;
  let actionERC20TransferFrom;
  let actionERC20TransferFromGelato;
  let gelatoProvider;

  beforeEach(async function () {
    // Get signers
    [seller, provider, executor, sysAdmin, user2] = await ethers.getSigners();
    sellerAddress = await seller.getAddress();
    providerAddress = await provider.getAddress();
    executorAddress = await executor.getAddress();
    sysAdminAddress = await sysAdmin.getAddress();
    user2address = await user2.getAddress();

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
    gelatoUserProxyFactory = await GelatoUserProxyFactory.deploy(
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
      mockBatchExchange.address
    );

    await actionWithdrawBatchExchange.deployed();
    // // #### ActionWithdrawBatchExchange End ####

    // Call provideFunds(value) with provider on core
    await gelatoCore.connect(provider).provideFunds(providerAddress, {
      value: ethers.utils.parseUnits("1", "ether"),
    });

    // Register new provider TaskSpec on core with provider EDITS NEED ä#######################

    actionERC20TransferFromGelato = new Action({
      addr: actionERC20TransferFrom.address,
      data: constants.HashZero,
      operation: Operation.Delegatecall,
      termsOkCheck: true,
    });

    const actionWithdrawBatchExchangeGelato = new Action({
      addr: actionWithdrawBatchExchange.address,
      data: constants.HashZero,
      operation: Operation.Delegatecall,
      termsOkCheck: true,
    });

    const newTaskSpec = new TaskSpec({
      actions: [actionWithdrawBatchExchangeGelato],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    // Call multiProvideexecutor, TaskSpecs[], providerModules[])
    await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [newTaskSpec],
        [providerModuleGelatoUserProxy.address]
      );

    // Create UserProxy
    const createTx = await gelatoUserProxyFactory.connect(seller).create();
    await createTx.wait();
    [userProxyAddress] = await gelatoUserProxyFactory.gelatoProxiesByUser(
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

  describe("GelatoCore.submitTask Tests", function () {
    it("#1: Successfully submit whitelisted taskReceipt", async function () {
      const actionInputs = [
        sellerAddress,
        sellToken.address,
        ethers.utils.parseUnits("1", "ether"),
        sellerAddress,
      ];

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: actionInputs,
      });

      gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const action = new Action({
        addr: actionWithdrawBatchExchange.address,
        data: actionPayload,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");
      // .withArgs(executorAddress, 1, taskReceiptHash, taskReceiptArray);
    });

    it("#2: Submitting reverts => Action not whitelisted", async function () {
      const notWhitelistedAction = actionERC20TransferFrom.address;
      const actionInputs = [
        sellerAddress,
        sellToken.address,
        ethers.utils.parseUnits("1", "ether"),
        sellerAddress,
      ];

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: actionInputs,
      });

      gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const action = new Action({
        addr: notWhitelistedAction,
        data: actionPayload,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.be.revertedWith(
        "GelatoUserProxy.submitTask:GelatoCore.canSubmitTask.isProvided:TaskSpecNotProvided"
      );

      // CouldNt get the taskReceiptHash to be computed off-chain
      // .withArgs(executorAddress, 1, taskReceiptHash, taskReceipt);
    });

    it("#3: Submitting reverts => Condition not whitelisted", async function () {
      const notWhitelistedCondition = actionERC20TransferFrom.address;

      const actionInputs = [
        sellerAddress,
        sellToken.address,
        ethers.utils.parseUnits("1", "ether"),
        sellerAddress,
      ];

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: actionInputs,
      });

      gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: notWhitelistedCondition,
        data: constants.HashZero,
      });

      const action = new Action({
        addr: actionWithdrawBatchExchange.address,
        data: actionPayload,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        conditions: [condition],
        actions: [action],
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.be.revertedWith(
        "GelatoUserProxy.submitTask:GelatoCore.canSubmitTask.isProvided:TaskSpecNotProvided"
      );
    });

    it("#4: Submitting reverts => Selected Provider with Executor that is not min staked", async function () {
      const revertingProviderAddress = sellerAddress;

      const actionInputs = [
        sellerAddress,
        sellToken.address,
        ethers.utils.parseUnits("1", "ether"),
        sellerAddress,
      ];

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: actionInputs,
      });

      gelatoProvider = new GelatoProvider({
        addr: revertingProviderAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const action = new Action({
        addr: actionWithdrawBatchExchange.address,
        data: actionPayload,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.be.revertedWith("GelatoCore.canSubmitTask: executorStake");
    });

    it("#5: Submitting reverts => Invalid expiryDate", async function () {
      const expiryDateInPast = 1586776139;

      const actionInputs = [
        sellerAddress,
        sellToken.address,
        ethers.utils.parseUnits("1", "ether"),
        sellerAddress,
      ];

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: actionInputs,
      });

      gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const action = new Action({
        addr: actionWithdrawBatchExchange.address,
        data: actionPayload,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, expiryDateInPast)
      ).to.be.revertedWith("GelatoCore.canSubmitTask: expiryDate");
    });

    it("#6: Submitting reverts => InvalidProviderModule", async function () {
      const revertingProviderMouleAddress = sellerAddress;

      const actionInputs = [
        sellerAddress,
        sellToken.address,
        ethers.utils.parseUnits("1", "ether"),
        sellerAddress,
      ];

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: actionInputs,
      });

      gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: revertingProviderMouleAddress,
      });

      const action = new Action({
        addr: actionWithdrawBatchExchange.address,
        data: actionPayload,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      // GelatoCore.canSubmitTask.isProvided:InvalidProviderModule
      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.be.revertedWith(
        "GelatoCore.canSubmitTask.isProvided:InvalidProviderModule"
      );
    });

    it("#7: Submitting successful => No action Payload", async function () {
      const noActionPayload = constants.HashZero;

      // Submit Task
      gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const action = new Action({
        addr: actionWithdrawBatchExchange.address,
        data: noActionPayload,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      // GelatoCore.canSubmitTask.isProvided:InvalidProviderModule
      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");
    });

    it("#8: create success (Self-provider), not whitelisted action, assigning new executor and staking", async function () {
      const actionInputs = [
        providerAddress,
        sellToken.address,
        ethers.utils.parseUnits("1", "ether"),
        sellerAddress,
      ];

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: actionInputs,
      });

      // 2. Create Proxy for Provider
      const createTx = await gelatoUserProxyFactory.connect(provider).create();
      await createTx.wait();

      const [
        providerProxyAddress,
      ] = await gelatoUserProxyFactory.gelatoProxiesByUser(providerAddress);
      const providerProxy = await ethers.getContractAt(
        "GelatoUserProxy",
        providerProxyAddress
      );

      const gelatoProvider = new GelatoProvider({
        addr: providerProxyAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const action = new Action({
        addr: actionWithdrawBatchExchange.address,
        data: actionPayload,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
      });

      const action2 = new Action({
        addr: constants.AddressZero,
        data: constants.HashZero,
        operation: Operation.Call,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action, action2],
      });

      // Fund Ether to Core with providerProxy
      const provideFundsPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "provideFunds",
        inputs: [providerProxyAddress],
      });

      // Assign Executor
      const providerAssignsExecutorPayload = await run(
        "abi-encode-withselector",
        {
          contractname: "GelatoCore",
          functionname: "providerAssignsExecutor",
          inputs: [executorAddress],
        }
      );

      // Submit Task
      const submitTaskPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "submitTask",
        inputs: [gelatoProvider, task, EXPIRY_DATE],
      });

      // addProviderModules
      const addProviderModulePayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "addProviderModules",
        inputs: [[providerModuleGelatoUserProxy.address]],
      });

      const actions = [];

      const provideFundsAction = new Action({
        addr: gelatoCore.address,
        data: provideFundsPayload,
        operation: Operation.Call,
        value: ethers.utils.parseUnits("1", "ether"),
      });
      actions.push(provideFundsAction);

      const assignExecutorAction = new Action({
        addr: gelatoCore.address,
        data: providerAssignsExecutorPayload,
        operation: Operation.Call,
      });
      actions.push(assignExecutorAction);

      const addProviderModuleAction = new Action({
        addr: gelatoCore.address,
        data: addProviderModulePayload,
        operation: Operation.Call,
      });
      actions.push(addProviderModuleAction);

      const submitTaskAction = new Action({
        addr: gelatoCore.address,
        data: submitTaskPayload,
        operation: Operation.Call,
      });
      actions.push(submitTaskAction);

      await expect(
        providerProxy.connect(provider).multiExecActions(actions, {
          value: ethers.utils.parseUnits("1", "ether"),
        })
      )
        .to.emit(gelatoCore, "LogTaskSubmitted")
        .to.emit(gelatoCore, "LogProviderAssignedExecutor")
        .to.emit(gelatoCore, "LogFundsProvided");

      // GelatoCore.canSubmitTask.isProvided:InvalidProviderModule
    });

    it("#9: submitTask reverts (Self-provider), inputting other address as provider that has not whitelisted action", async function () {
      const actionInputs = [
        providerAddress,
        sellToken.address,
        ethers.utils.parseUnits("1", "ether"),
        sellerAddress,
      ];

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: actionInputs,
      });

      // 2. Create Proxy for Provider
      const createTx = await gelatoUserProxyFactory.connect(provider).create();
      await createTx.wait();

      const [
        providerProxyAddress,
      ] = await gelatoUserProxyFactory.gelatoProxiesByUser(providerAddress);
      const providerProxy = await ethers.getContractAt(
        "GelatoUserProxy",
        providerProxyAddress
      );

      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const action = new Action({
        addr: actionWithdrawBatchExchange.address,
        data: actionPayload,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
      });

      const action2 = new Action({
        addr: actionWithdrawBatchExchange.address,
        data: constants.HashZero,
        operation: Operation.Call,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action, action2],
      });

      const provideFundsPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "provideFunds",
        inputs: [providerProxyAddress],
      });

      // Assign Executor
      const providerAssignsExecutorPayload = await run(
        "abi-encode-withselector",
        {
          contractname: "GelatoCore",
          functionname: "providerAssignsExecutor",
          inputs: [executorAddress],
        }
      );

      // Submit Task
      const submitTaskPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "submitTask",
        inputs: [gelatoProvider, task, EXPIRY_DATE],
      });

      // addProviderModules
      const addProviderModulePayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "addProviderModules",
        inputs: [[providerModuleGelatoUserProxy.address]],
      });

      const actions = [];

      const provideFundsAction = new Action({
        addr: gelatoCore.address,
        data: provideFundsPayload,
        operation: Operation.Call,
        value: ethers.utils.parseUnits("1", "ether"),
      });
      actions.push(provideFundsAction);

      const assignExecutorAction = new Action({
        addr: gelatoCore.address,
        data: providerAssignsExecutorPayload,
        operation: Operation.Call,
      });
      actions.push(assignExecutorAction);

      const addProviderModuleAction = new Action({
        addr: gelatoCore.address,
        data: addProviderModulePayload,
        operation: Operation.Call,
      });
      actions.push(addProviderModuleAction);

      const submitTaskAction = new Action({
        addr: gelatoCore.address,
        data: submitTaskPayload,
        operation: Operation.Call,
      });
      actions.push(submitTaskAction);

      // GelatoCore.canSubmitTask.isProvided:InvalidProviderModule
      await expect(
        providerProxy.connect(provider).multiExecActions(actions, {
          value: ethers.utils.parseUnits("1", "ether"),
        })
      ).to.revertedWith(
        "GelatoUserProxy._callAction:GelatoCore.canSubmitTask.isProvided:TaskSpecNotProvided"
      );
    });
  });
});
