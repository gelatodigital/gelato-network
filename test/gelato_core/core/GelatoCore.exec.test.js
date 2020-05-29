// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");

import initialStateSysAdmin from "../base/gelato_sys_admin/GelatoSysAdmin.initialState";
import initialStateGasPriceOracle from "../base/gelato_gas_price_oracle/GelatoGasPriceOracle.initialState";

const GELATO_MAX_GAS = initialStateSysAdmin.gelatoMaxGas;
const GELATO_GAS_PRICE = initialStateGasPriceOracle.gasPrice;

const EXPIRY_DATE = 0;
const SUBMISSIONS_LEFT = 1;

// ##### Gnosis Action Test Cases #####
// 1. All sellTokens got converted into buy tokens, sufficient for withdrawal
// 2. All sellTokens got converted into buy tokens, insufficient for withdrawal
// 3. SellTokens got partially converted into buy tokens, insufficient buy tokens for withdrawal
// 4. No sellTokens got converted into buy tokens, sufficient sell tokens for withdrawal
// 5. No sellTokens got converted into buy tokens, insufficient sell tokens for withdrawal
describe("GelatoCore.exec", function () {
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
  let ActionWithdrawBatchExchangeWithFee;
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
  let gelatoCore;
  let gelatoGasPriceOracle;
  let actionERC20TransferFrom;
  let mockConditionDummy;
  let mockConditionDummyRevert;
  let actionERC20TransferFromGelato;
  let feeExtractor;

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
    await gelatoCore.deployed();

    await gelatoCore
      .connect(executor)
      .stakeExecutor({ value: ethers.utils.parseUnits("1", "ether") });

    // Deploy Gelato Gas Price Oracle with SysAdmin and set to GELATO_GAS_PRICE
    const GelatoGasPriceOracle = await ethers.getContractFactory(
      "GelatoGasPriceOracle",
      sysAdmin
    );
    gelatoGasPriceOracle = await GelatoGasPriceOracle.deploy(GELATO_GAS_PRICE);
    await gelatoGasPriceOracle.deployed();

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
    await gelatoUserProxyFactory.deployed();

    // Deploy ProviderModuleGelatoUserProxy with constructorArgs
    const ProviderModuleGelatoUserProxy = await ethers.getContractFactory(
      "ProviderModuleGelatoUserProxy",
      sysAdmin
    );
    providerModuleGelatoUserProxy = await ProviderModuleGelatoUserProxy.deploy(
      gelatoUserProxyFactory.address
    );
    await providerModuleGelatoUserProxy.deployed();

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

    // // #### ActionWithdrawBatchExchangeWithFee Start ####
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
    const FeeExtractor = await ethers.getContractFactory("FeeExtractor");

    // Deploy Test feefinder (Assuming we only hit hard coded tokens, not testing uniswap, kyber or maker oracle)
    feeExtractor = await FeeExtractor.deploy(
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
      medianizer2.address,
      providerAddress
    );
    await feeExtractor.deployed();

    const ActionWithdrawBatchExchangeWithFee = await ethers.getContractFactory(
      "ActionWithdrawBatchExchangeWithFee"
    );
    actionWithdrawBatchExchange = await ActionWithdrawBatchExchangeWithFee.deploy(
      mockBatchExchange.address,
      feeExtractor.address
    );

    await actionWithdrawBatchExchange.deployed();

    // // #### ActionWithdrawBatchExchangeWithFee End ####

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
    const createTx = await gelatoUserProxyFactory.connect(seller).create();
    await createTx.wait();
    [userProxyAddress] = await gelatoUserProxyFactory.gelatoProxiesByUser(
      sellerAddress
    );
    userProxy = await ethers.getContractAt("GelatoUserProxy", userProxyAddress);

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
  describe("GelatoCore.exec: Business As Usual", function () {
    it("#1: Successfully submit and exec ActionWithdrawBatchExchangeWithFee taskReceipt", async function () {
      // Get Action Payload
      const withdrawAmount = 10 * 10 ** buyDecimals;

      // 3. MockBatchExchange Set withdraw amount
      tx = await mockBatchExchange.setWithdrawAmount(
        buyToken.address,
        withdrawAmount
      );
      await tx.wait();

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionWithdrawBatchExchangeWithFee",
        functionname: "action",
        inputs: [sellerAddress, sellToken.address, buyToken.address],
      });

      // Submit Task
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const action = new Action({
        addr: actionWithdrawBatchExchange.address,
        data: actionData,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      const taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      // LogTaskSubmitted(taskReceipt.id, hashedTaskReceipt, taskReceipt);
      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      expect(
        await gelatoCore.canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE)
      ).to.be.equal(
        "ActionTermsNotOk:ActionWithdrawBatchExchangeWithFee: Sell Token not withdrawable yet"
      );

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(
          executorAddress,
          taskReceipt.id,
          "ActionTermsNotOk:ActionWithdrawBatchExchangeWithFee: Sell Token not withdrawable yet"
        );

      // Make TaskReceipt executable
      await mockBatchExchange.setValidWithdrawRequest(userProxyAddress);

      expect(
        await gelatoCore.canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE)
      ).to.be.equal(
        "ActionTermsNotOk:ActionWithdrawBatchExchangeWithFee: Proxy has insufficient credit"
      );

      // Pay Credit
      const feeAmount = await feeExtractor.getFeeAmount(sellToken.address);

      const payFeeData = await run("abi-encode-withselector", {
        contractname: "FeeExtractor",
        functionname: "payFee",
        inputs: [sellToken.address, feeAmount],
      });

      await sellToken.connect(seller).approve(userProxyAddress, feeAmount);

      const approvalData = await run("abi-encode-withselector", {
        contractname: "MockERC20",
        functionname: "approve",
        inputs: [feeExtractor.address, feeAmount],
      });

      const transferFromData = await run("abi-encode-withselector", {
        contractname: "MockERC20",
        functionname: "transferFrom",
        inputs: [sellerAddress, userProxyAddress, feeAmount],
      });

      await sellToken.create(sellerAddress, ethers.utils.parseEther("100"));

      await userProxy.connect(seller).multiExecActions([
        {
          addr: sellToken.address,
          data: transferFromData,
          operation: Operation.Call,
          termsOkCheck: false,
          value: 0,
        },
        {
          addr: sellToken.address,
          data: approvalData,
          operation: Operation.Call,
          termsOkCheck: false,
          value: 0,
        },
        {
          addr: feeExtractor.address,
          data: payFeeData,
          operation: Operation.Call,
          termsOkCheck: false,
          value: 0,
        },
      ]);

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      ).to.emit(gelatoCore, "LogExecSuccess");
    });

    it("#2: Submit Task ActionERC20TransferFrom and revert with LogCanExecFailed in exec due to other string than 'Ok' being returned inside Condition", async function () {
      // Get Action Payload

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [
          sellerAddress,
          sellToken.address,
          providerAddress,
          ethers.utils.parseUnits("1", "ether"),
        ],
      });

      const conditionDataFalse = await run("abi-encode", {
        contractname: "MockConditionDummy",
        functionname: "dummyCheck",
        values: [false],
      });

      // Submit Task
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: mockConditionDummy.address,
        data: conditionDataFalse,
      });

      const action = new Action({
        addr: actionERC20TransferFrom.address,
        data: actionData,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
      });

      const task = new Task({
        conditions: [condition],
        actions: [action],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(executorAddress, taskReceipt.id, "ConditionNotOk:NotOk");
    });

    it("#3: Submit Task ActionERC20TransferFrom and revert with LogCanExecFailed in exec due to Revert Inside Condition", async function () {
      // Get Action Payload

      // Provider registers new condition
      const MockConditionDummyRevert = await ethers.getContractFactory(
        "MockConditionDummyRevert",
        sysAdmin
      );
      mockConditionDummyRevert = await MockConditionDummyRevert.deploy();
      await mockConditionDummyRevert.deployed();

      const newTaskSpec2 = new TaskSpec({
        conditions: [mockConditionDummyRevert.address],
        actions: [actionERC20TransferFromGelato],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      await gelatoCore.connect(provider).provideTaskSpecs([newTaskSpec2]);

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [
          sellerAddress,
          sellToken.address,
          providerAddress,
          ethers.utils.parseUnits("1", "ether"),
        ],
      });

      const conditionDataFalse = await run("abi-encode", {
        contractname: "MockConditionDummyRevert",
        functionname: "revertCheck",
        values: [false],
      });

      // Submit Task
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: mockConditionDummyRevert.address,
        data: conditionDataFalse,
      });

      const action = new Action({
        addr: actionERC20TransferFrom.address,
        data: actionData,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
      });

      const task = new Task({
        conditions: [condition],
        actions: [action],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(
          executorAddress,
          taskReceipt.id,
          "ConditionReverted:MockConditionDummyRevert.ok: test revert"
        );
    });

    it("#4: Submit Task ActionERC20TransferFrom and revert with LogCanExecFailed in exec due to Condition Reverting with no message", async function () {
      // @DEV registering an action as a condition (with no ok function)

      // Provider registers new condition

      const newTaskSpec2 = new TaskSpec({
        conditions: [actionERC20TransferFrom.address],
        actions: [actionERC20TransferFromGelato],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      await gelatoCore.connect(provider).provideTaskSpecs([newTaskSpec2]);

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [
          sellerAddress,
          sellToken.address,
          providerAddress,
          ethers.utils.parseUnits("1", "ether"),
        ],
      });

      const conditionDataFalse = await run("abi-encode", {
        contractname: "MockConditionDummyRevert",
        functionname: "revertCheck",
        values: [false],
      });

      // Submit Task
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: actionERC20TransferFrom.address,
        data: actionData,
      });

      const action = new Action({
        addr: actionERC20TransferFrom.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        conditions: [condition],
        actions: [action],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(
          executorAddress,
          taskReceipt.id,
          "ConditionReverted:undefined"
        );
    });

    it("#5: Submit Task ActionERC20TransferFrom and revert with LogCanExecFailed in exec due to ActionReverted", async function () {
      // @DEV registering an action with reverting termsOk

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

      await gelatoCore.connect(provider).provideTaskSpecs([newTaskSpec2]);

      const encoder = ethers.utils.defaultAbiCoder;
      const actionData = await encoder.encode(["bool"], [false]);

      // Submit Task
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
        actions: [action],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(
          executorAddress,
          taskReceipt.id,
          "ActionReverted:MockActionDummyOutOfGas.termsOk"
        );
    });

    it("#6: Submit Task ActionERC20TransferFrom and revert with LogCanExecFailed in exec due to ActionRevertedNoMessage", async function () {
      // @DEV Use condition contract as an action to see termsOk revert
      const MockConditionDummyRevert = await ethers.getContractFactory(
        "MockConditionDummyRevert",
        sysAdmin
      );
      mockConditionDummyRevert = await MockConditionDummyRevert.deploy();
      await mockConditionDummyRevert.deployed();

      const revertingAction = new Action({
        addr: mockConditionDummyRevert.address,
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const newTaskSpec2 = new TaskSpec({
        actions: [revertingAction],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      await gelatoCore.connect(provider).provideTaskSpecs([newTaskSpec2]);

      const encoder = ethers.utils.defaultAbiCoder;
      const actionData = await encoder.encode(["bool"], [false]);

      // Submit Task
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const action = new Action({
        addr: mockConditionDummyRevert.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(executorAddress, taskReceipt.id, "ActionRevertedNoMessage");
    });

    it("#7: Submit Task ActionERC20TransferFrom and revert with LogCanExecFailed in exec due to Action termsOk failure", async function () {
      // Get Action Payload

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [
          sellerAddress,
          sellToken.address,
          providerAddress,
          ethers.utils.parseUnits("1", "ether"),
        ],
      });

      const conditionDataTrue = await run("abi-encode", {
        contractname: "MockConditionDummy",
        functionname: "dummyCheck",
        values: [true],
      });

      // Submit Task
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: mockConditionDummy.address,
        data: conditionDataTrue,
      });

      const action = new Action({
        addr: actionERC20TransferFrom.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        conditions: [condition],
        actions: [action],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(
          executorAddress,
          taskReceipt.id,
          "ActionTermsNotOk:ActionERC20TransferFrom: NotOkUserProxySendTokenAllowance"
        );
    });

    it("#8: Submit Task revert with InvalidTaskReceiptHash in exec due to TaskReceiptHash not existing", async function () {
      // Get Action Payload

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [
          sellerAddress,
          sellToken.address,
          providerAddress,
          ethers.utils.parseUnits("1", "ether"),
        ],
      });

      const conditionDataFalse = await run("abi-encode", {
        contractname: "MockConditionDummy",
        functionname: "dummyCheck",
        values: [false],
      });

      const conditionDataTrue = await run("abi-encode", {
        contractname: "MockConditionDummy",
        functionname: "dummyCheck",
        values: [true],
      });

      // Submit Task
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: mockConditionDummy.address,
        data: conditionDataFalse,
      });

      const action = new Action({
        addr: actionERC20TransferFrom.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        conditions: [condition],
        actions: [action],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(executorAddress, taskReceipt.id, "InvalidTaskReceiptHash");
    });

    it("#9: Submit Task and revert in exec due to InvalidExecutor", async function () {
      // Get Action Payload

      const MockConditionDummy = await ethers.getContractFactory(
        "MockConditionDummyRevert",
        sysAdmin
      );
      const mockConditionDummy = await MockConditionDummy.deploy();
      await mockConditionDummy.deployed();

      const mockConditionAsAction = new Action({
        addr: mockConditionDummy.address,
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: false,
      });

      const newTaskSpec2 = new TaskSpec({
        actions: [mockConditionAsAction],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      await gelatoCore.connect(provider).provideTaskSpecs([newTaskSpec2]);

      // Submit Task
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const task = new Task({
        actions: [mockConditionAsAction],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      await expect(
        gelatoCore
          .connect(provider)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      ).to.revertedWith("GelatoCore.exec: Invalid Executor");
    });

    it("#10: Submit Task and revert with Expired in exec due to expiry date having passed", async function () {
      // Get Action Payload
      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [
          sellerAddress,
          sellToken.address,
          providerAddress,
          ethers.utils.parseUnits("1", "ether"),
        ],
      });

      const conditionDataFalse = await run("abi-encode", {
        contractname: "MockConditionDummy",
        functionname: "dummyCheck",
        values: [false],
      });

      // Submit Task
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: mockConditionDummy.address,
        data: conditionDataFalse,
      });

      const action = new Action({
        addr: actionERC20TransferFrom.address,
        data: actionData,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
      });

      let oldBlock = await ethers.provider.getBlock();

      const lifespan = 100000;
      const expiryDate = oldBlock.timestamp + lifespan;

      const task = new Task({
        conditions: [condition],
        actions: [action],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
        expiryDate: expiryDate,
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, expiryDate)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      // Get a promise for your call
      await ethers.provider.send("evm_mine", [expiryDate]);

      // Do random Tx to increment time
      await buyToken.create(
        sellerAddress,
        ethers.utils.parseUnits("100", buyDecimals)
      );

      let newBlock = await ethers.provider.getBlock();

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(executorAddress, taskReceipt.id, "TaskReceiptExpired");
    });

    it("#11: Exec good taskReceipt, however revert  with GelatoCore.exec: Insufficient gas sent because insufficient gas was sent", async function () {
      // Get Action Payload
      const withdrawAmount = 10 * 10 ** buyDecimals;

      // 3. MockBatchExchange Set withdraw amount
      tx = await mockBatchExchange.setWithdrawAmount(
        buyToken.address,
        withdrawAmount
      );
      await tx.wait();

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionWithdrawBatchExchangeWithFee",
        functionname: "action",
        inputs: [sellerAddress, sellToken.address, buyToken.address],
      });

      // Submit Task
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const action = new Action({
        addr: actionWithdrawBatchExchange.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      const taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      // LogTaskSubmitted(taskReceipt.id, hashedTaskReceipt, taskReceipt);

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      expect(
        await gelatoCore.canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE)
      ).to.be.equal(
        "ActionTermsNotOk:ActionWithdrawBatchExchangeWithFee: Sell Token not withdrawable yet"
      );

      await gelatoCore
        .connect(executor)
        .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 5000000 });

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(
          executorAddress,
          taskReceipt.id,
          "ActionTermsNotOk:ActionWithdrawBatchExchangeWithFee: Sell Token not withdrawable yet"
        );

      // Make TaskReceipt executable
      await mockBatchExchange.setValidWithdrawRequest(userProxyAddress);

      const internalGasRequirement = await gelatoCore.internalGasRequirement();

      await expect(
        gelatoCore.connect(executor).exec(taskReceipt, {
          gasPrice: GELATO_GAS_PRICE,
          gasLimit: internalGasRequirement,
        })
      ).to.revertedWith("GelatoCore.exec: Insufficient gas sent");
    });

    it("#12a: Exec good taskReceipt, however revert with LogExecReverted because insufficient gas was sent", async function () {
      // Get Action Payload
      const withdrawAmount = 10 * 10 ** buyDecimals;

      // 3. MockBatchExchange Set withdraw amount
      tx = await mockBatchExchange.setWithdrawAmount(
        buyToken.address,
        withdrawAmount
      );
      await tx.wait();

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionWithdrawBatchExchangeWithFee",
        functionname: "action",
        inputs: [sellerAddress, sellToken.address, buyToken.address],
      });

      // Submit Task
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const action = new Action({
        addr: actionWithdrawBatchExchange.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      const taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      // LogTaskSubmitted(taskReceipt.id, hashedTaskReceipt, taskReceipt);

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      expect(
        await gelatoCore.canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE)
      ).to.be.equal(
        "ActionTermsNotOk:ActionWithdrawBatchExchangeWithFee: Sell Token not withdrawable yet"
      );

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(
          executorAddress,
          taskReceipt.id,
          "ActionTermsNotOk:ActionWithdrawBatchExchangeWithFee: Sell Token not withdrawable yet"
        );

      // Make TaskReceipt executable
      await mockBatchExchange.setValidWithdrawRequest(userProxyAddress);

      const internalGasRequirement = await gelatoCore.internalGasRequirement();

      await expect(
        gelatoCore.connect(executor).exec(taskReceipt, {
          gasPrice: GELATO_GAS_PRICE,
          gasLimit: ethers.utils
            .bigNumberify(internalGasRequirement)
            .add(ethers.utils.bigNumberify("50000")),
        })
      ).to.emit(gelatoCore, "LogExecReverted");
    });

    it("#12b: Exec good taskReceipt, however revert with LogCanExecFailed because EVEN LESS insufficient gas was sent", async function () {
      // Get Action Payload
      const withdrawAmount = 10 * 10 ** buyDecimals;

      // 3. MockBatchExchange Set withdraw amount
      tx = await mockBatchExchange.setWithdrawAmount(
        buyToken.address,
        withdrawAmount
      );
      await tx.wait();

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionWithdrawBatchExchangeWithFee",
        functionname: "action",
        inputs: [sellerAddress, sellToken.address, buyToken.address],
      });

      // Submit Task
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const action = new Action({
        addr: actionWithdrawBatchExchange.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      const taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      // LogTaskSubmitted(taskReceipt.id, hashedTaskReceipt, taskReceipt);

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      expect(
        await gelatoCore.canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE)
      ).to.be.equal(
        "ActionTermsNotOk:ActionWithdrawBatchExchangeWithFee: Sell Token not withdrawable yet"
      );

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(
          executorAddress,
          taskReceipt.id,
          "ActionTermsNotOk:ActionWithdrawBatchExchangeWithFee: Sell Token not withdrawable yet"
        );

      // Make TaskReceipt executable
      await mockBatchExchange.setValidWithdrawRequest(userProxyAddress);

      const internalGasRequirement = await gelatoCore.internalGasRequirement();

      await expect(
        gelatoCore.connect(executor).exec(taskReceipt, {
          gasPrice: GELATO_GAS_PRICE,
          gasLimit: ethers.utils
            .bigNumberify(internalGasRequirement)
            .add(ethers.utils.bigNumberify("35000")),
        })
      ).to.emit(gelatoCore, "LogCanExecFailed");
    });

    it("#13: Successfully submit and exec ActionWithdrawBatchExchangeWithFee taskReceipt (self-provider)", async function () {
      // Get Action Payload
      const withdrawAmount = 10 * 10 ** buyDecimals;

      // 3. MockBatchExchange Set withdraw amount
      tx = await mockBatchExchange.setWithdrawAmount(
        buyToken.address,
        withdrawAmount
      );
      await tx.wait();

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionWithdrawBatchExchangeWithFee",
        functionname: "action",
        inputs: [sellerAddress, sellToken.address, buyToken.address],
      });

      // Submit Task
      const gelatoProvider = new GelatoProvider({
        addr: userProxyAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const action = new Action({
        addr: actionWithdrawBatchExchange.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      const taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      const provideFundsPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "provideFunds",
        inputs: [userProxyAddress],
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

      // LogTaskSubmitted(taskReceipt.id, hashedTaskReceipt, taskReceipt);
      await expect(
        userProxy.multiExecActions(actions, {
          value: ethers.utils.parseUnits("1", "ether"),
        })
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      // Make TaskReceipt executable
      await mockBatchExchange.setValidWithdrawRequest(userProxyAddress);

      expect(
        await gelatoCore.canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE)
      ).to.be.equal(
        "ActionTermsNotOk:ActionWithdrawBatchExchangeWithFee: Proxy has insufficient credit"
      );

      // Pay Credit
      const feeAmount = await feeExtractor.getFeeAmount(sellToken.address);

      const payFeeData = await run("abi-encode-withselector", {
        contractname: "FeeExtractor",
        functionname: "payFee",
        inputs: [sellToken.address, feeAmount],
      });

      await sellToken.connect(seller).approve(userProxyAddress, feeAmount);

      const approvalData = await run("abi-encode-withselector", {
        contractname: "MockERC20",
        functionname: "approve",
        inputs: [feeExtractor.address, feeAmount],
      });

      const transferFromData = await run("abi-encode-withselector", {
        contractname: "MockERC20",
        functionname: "transferFrom",
        inputs: [sellerAddress, userProxyAddress, feeAmount],
      });

      await sellToken.create(sellerAddress, ethers.utils.parseEther("100"));

      await userProxy.connect(seller).multiExecActions([
        {
          addr: sellToken.address,
          data: transferFromData,
          operation: Operation.Call,
          termsOkCheck: false,
          value: 0,
        },
        {
          addr: sellToken.address,
          data: approvalData,
          operation: Operation.Call,
          termsOkCheck: false,
          value: 0,
        },
        {
          addr: feeExtractor.address,
          data: payFeeData,
          operation: Operation.Call,
          termsOkCheck: false,
          value: 0,
        },
      ]);

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      ).to.emit(gelatoCore, "LogExecSuccess");
    });

    it("#14: Create Gelato User Proxy, approve it to move tokens, sell on batch exchange and create gelato task in one transaction", async function () {
      // 1. Determine new proxy address
      const saltnonce = "420";
      const sysProxyAddress = await gelatoUserProxyFactory.predictProxyAddress(
        sysAdminAddress,
        saltnonce
      );

      await sellToken.create(sysAdminAddress, ethers.utils.parseEther("100"));

      /// Get Action Payload
      const withdrawAmount = 10 * 10 ** buyDecimals;

      // 3. MockBatchExchange Set withdraw amount
      tx = await mockBatchExchange.setWithdrawAmount(
        buyToken.address,
        withdrawAmount
      );
      await tx.wait();

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionWithdrawBatchExchangeWithFee",
        functionname: "action",
        inputs: [sellerAddress, sellToken.address, buyToken.address],
      });

      // Submit Task
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const action = new Action({
        addr: actionWithdrawBatchExchange.address,
        data: actionData,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      const taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: sysProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      const stakeAmount = ethers.utils.parseEther("1");

      const stakeEthPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "provideFunds",
        inputs: [sysProxyAddress],
      });

      const stakeEthAction = new Action({
        addr: gelatoCore.address,
        data: stakeEthPayload,
        operation: Operation.Call,
        value: stakeAmount,
        termsOkCheck: false,
      });

      // Pay Credit
      const feeAmount = await feeExtractor.getFeeAmount(sellToken.address);
      await sellToken.connect(sysAdmin).approve(sysProxyAddress, feeAmount);

      const payFeeData = await run("abi-encode-withselector", {
        contractname: "FeeExtractor",
        functionname: "payFee",
        inputs: [sellToken.address, feeAmount],
      });

      const approvalData = await run("abi-encode-withselector", {
        contractname: "MockERC20",
        functionname: "approve",
        inputs: [feeExtractor.address, feeAmount],
      });

      const transferFromData = await run("abi-encode-withselector", {
        contractname: "MockERC20",
        functionname: "transferFrom",
        inputs: [sysAdminAddress, sysProxyAddress, feeAmount],
      });

      await expect(
        gelatoUserProxyFactory.createTwoExecActionsSubmitTasks(
          saltnonce,
          [
            stakeEthAction,
            {
              addr: sellToken.address,
              data: transferFromData,
              operation: Operation.Call,
              termsOkCheck: false,
              value: 0,
            },
            {
              addr: sellToken.address,
              data: approvalData,
              operation: Operation.Call,
              termsOkCheck: false,
              value: 0,
            },
            {
              addr: feeExtractor.address,
              data: payFeeData,
              operation: Operation.Call,
              termsOkCheck: false,
              value: 0,
            },
          ],
          gelatoProvider,
          [task],
          [0],
          {
            value: stakeAmount,
          }
        )
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      expect(
        await gelatoCore.canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE)
      ).to.be.equal(
        "ActionTermsNotOk:ActionWithdrawBatchExchangeWithFee: Sell Token not withdrawable yet"
      );

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(
          executorAddress,
          taskReceipt.id,
          "ActionTermsNotOk:ActionWithdrawBatchExchangeWithFee: Sell Token not withdrawable yet"
        );

      // Make TaskReceipt executable
      await mockBatchExchange.setValidWithdrawRequest(sysProxyAddress);

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      ).to.emit(gelatoCore, "LogExecSuccess");
    });

    it("#15: Successfully submit and exec ActionWithdrawBatchExchangeWithFee taskReceipt WITH ONLY .calls", async function () {
      // Set up Batch Exchange
      const withdrawAmount = 10 * 10 ** buyDecimals;
      const sellerBalanceBefore = await buyToken.balanceOf(sellerAddress);
      tx = await mockBatchExchange.setWithdrawAmount(
        buyToken.address,
        withdrawAmount
      );
      await tx.wait();

      // Deploy BatchExchange Condition
      const ConditionBatchExchangeFundsWithdrawable = await ethers.getContractFactory(
        "ConditionBatchExchangeFundsWithdrawable"
      );

      const conditionBatchExchangeFundsWithdrawable = await ConditionBatchExchangeFundsWithdrawable.deploy(
        mockBatchExchange.address
      );
      await conditionBatchExchangeFundsWithdrawable.deployed();

      const conditionPayload = await run("abi-encode", {
        contractname: "ConditionBatchExchangeFundsWithdrawable",
        functionname: "withdrawableCheck",
        values: [userProxyAddress, sellToken.address, buyToken.address],
      });

      const condition = new Condition({
        inst: conditionBatchExchangeFundsWithdrawable.address,
        data: conditionPayload,
      });

      const withdrawBatchExchangeDataSellToken = await run(
        "abi-encode-withselector",
        {
          contractname: "MockBatchExchange",
          functionname: "withdraw",
          inputs: [userProxyAddress, sellToken.address],
        }
      );

      const withdrawBatchExchangeDataBuyToken = await run(
        "abi-encode-withselector",
        {
          contractname: "MockBatchExchange",
          functionname: "withdraw",
          inputs: [userProxyAddress, buyToken.address],
        }
      );

      const actionWithdrawBatchExchangeSellToken = new Action({
        addr: mockBatchExchange.address,
        data: withdrawBatchExchangeDataSellToken,
        operation: Operation.Call,
        value: 0,
        termsOkCheck: false,
      });

      const actionWithdrawBatchExchangeBuyToken = new Action({
        addr: mockBatchExchange.address,
        data: withdrawBatchExchangeDataBuyToken,
        operation: Operation.Call,
        value: 0,
        termsOkCheck: false,
      });

      const taskSpec = new TaskSpec({
        conditions: [conditionBatchExchangeFundsWithdrawable.address],
        actions: [
          actionWithdrawBatchExchangeSellToken,
          actionWithdrawBatchExchangeBuyToken,
        ],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      //  IGelatoCondition condition Action[] actions; uint256 gasPriceCeil;
      await gelatoCore.connect(provider).provideTaskSpecs([taskSpec]);

      // Submit Task
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const task = new Task({
        conditions: [condition],
        actions: [
          actionWithdrawBatchExchangeSellToken,
          actionWithdrawBatchExchangeBuyToken,
        ],
      });

      const taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      expect(
        await gelatoCore.canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE)
      ).to.be.equal("ConditionNotOk:SellTokenNotWithdrawable");

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(
          executorAddress,
          taskReceipt.id,
          "ConditionNotOk:SellTokenNotWithdrawable"
        );

      // Make TaskReceipt executable
      await mockBatchExchange.setValidWithdrawRequest(userProxyAddress);

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      ).to.emit(gelatoCore, "LogExecSuccess");
    });
  });

  describe("GelatoCore.exec: EDGE CASES", function () {
    it("#1: Should revert, if tx.gasprice is below gelatoGasPrice, but not if above", async function () {
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
        termsOkCheck: true,
      });

      // Provider registers new acttion

      const taskSpec = new TaskSpec({
        actions: [mockActionDummyGelato],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      await gelatoCore
        .connect(provider)
        .multiProvide(constants.AddressZero, [taskSpec], []);
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
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      await expect(
        gelatoCore.connect(executor).exec(taskReceipt, {
          gasPrice: GELATO_GAS_PRICE.sub(1),
          gasLimit: GELATO_MAX_GAS,
        })
      ).to.be.revertedWith("GelatoCore.exec: tx.gasprice below gelatoGasPrice");

      await expect(
        gelatoCore.connect(executor).exec(taskReceipt, {
          gasPrice: GELATO_GAS_PRICE.add(1),
          gasLimit: GELATO_MAX_GAS,
        })
      ).to.not.be.reverted;
    });

    it("#2: Should revert, if executor tries to call executionWrapper directly", async function () {
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
        termsOkCheck: true,
      });

      // Provider registers new acttion

      const taskSpec = new TaskSpec({
        actions: [mockActionDummyGelato],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      await gelatoCore
        .connect(provider)
        .multiProvide(constants.AddressZero, [taskSpec], []);
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
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      await expect(
        gelatoCore
          .connect(executor)
          .executionWrapper(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE, {
            gasPrice: GELATO_GAS_PRICE,
            gasLimit: GELATO_MAX_GAS,
          })
      ).to.be.revertedWith("GelatoCore.executionWrapper:onlyGelatoCore");
    });

    it("#3: Faulty GelatoGasPriceOracle data ", async function () {
      const taskSpec = new TaskSpec({
        actions: [actionERC20TransferFromGelato],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      taskSpec.actions[0].termsOkCheck = false;

      await gelatoCore.connect(provider).provideTaskSpecs([taskSpec]);

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [
          sellerAddress,
          sellToken.address,
          providerAddress,
          ethers.utils.parseUnits("1", "ether"),
        ],
      });

      const action = new Action({
        addr: actionERC20TransferFrom.address,
        data: actionData,
        operation: Operation.Delegatecall,
      });

      // Submit Task
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const task = new Task({
        actions: [action],
      });

      const taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      expect(
        await gelatoCore
          .connect(executor)
          .canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE)
      ).to.be.equal("OK");

      // Set Oracle gasPrice to 0
      await gelatoGasPriceOracle.setGasPrice(0);

      await expect(
        gelatoCore.connect(executor).exec(taskReceipt, {
          gasPrice: GELATO_GAS_PRICE,
          gasLimit: GELATO_MAX_GAS - 1000,
        })
      ).to.be.revertedWith("GelatoSysAdmin._getGelatoGasPrice:0orBelow");

      // // Set nonsense oracle request data
      await gelatoCore.connect(sysAdmin).setOracleRequestData("0xdeadbeef");

      await expect(
        gelatoCore.connect(executor).exec(taskReceipt, {
          gasPrice: GELATO_GAS_PRICE,
          gasLimit: GELATO_MAX_GAS - 1000,
        })
      ).to.be.revertedWith(
        "GelatoSysAdmin._getGelatoGasPrice:UnexpectedReturndata"
      );
    });

    it("#4: Submitting malicious task that withdraws funds as an action should revert)", async function () {
      const provideFundsAmount = ethers.utils.parseEther("1");

      // Instantiate ProviderModule that reverts in execPayload()

      const multiProvideData = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "multiProvide",
        inputs: [executorAddress, [], [providerModuleGelatoUserProxy.address]],
      });

      await userProxy.execAction(
        {
          addr: gelatoCore.address,
          data: multiProvideData,
          termsOkCheck: false,
          value: provideFundsAmount,
          operation: Operation.Call,
        },
        { value: provideFundsAmount }
      );

      const unProvideFundsData = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "unprovideFunds",
        inputs: [ethers.utils.parseUnits("1", "ether")],
      });

      const unProvideFundsAction = new Action({
        addr: gelatoCore.address,
        data: unProvideFundsData,
        operation: Operation.Call,
        termsOkCheck: false,
      });

      // Provider batch providers dummy action and revertinng module

      const gelatoProvider = new GelatoProvider({
        addr: userProxyAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const task = new Task({
        actions: [unProvideFundsAction],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      ).to.revertedWith(
        "GelatoCore._processProviderPayables: providerFunds underflow"
      );
    });

    it("#5: Submit Task DummyAction and revert with LogExecReverted in exec due execPayload reverting (due to revert in ProviderModule)", async function () {
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
        termsOkCheck: true,
      });

      // Provider registers new acttion

      const newTaskSpec2 = new TaskSpec({
        actions: [mockActionDummyGelato],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      // Instantiate ProviderModule that reverts in execPayload()

      const MockProviderModuleExecPayloadRevert = await ethers.getContractFactory(
        "MockProviderModuleExecPayloadRevert",
        sysAdmin
      );

      const mockProviderModuleExecPayloadRevert = await MockProviderModuleExecPayloadRevert.deploy();
      await mockProviderModuleExecPayloadRevert.deployed();

      await gelatoCore
        .connect(provider)
        .multiProvide(
          constants.AddressZero,
          [newTaskSpec2],
          [mockProviderModuleExecPayloadRevert.address]
        );
      // Provider batch providers dummy action and revertinng module

      const abi = ["function action(bool)"];
      const interFace = new utils.Interface(abi);

      const actionData = interFace.functions.action.encode([true]);

      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: mockProviderModuleExecPayloadRevert.address,
      });

      const action = new Action({
        addr: mockActionDummy.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogExecReverted")
        .withArgs(
          executorAddress,
          1,
          0,
          "GelatoCore._exec.execPayload:MockProviderModuleExecPayloadRevert.execPayload: test revert"
        );
    });

    it("#6: GelatoDebug LogExecReverted UnexpectedReturndata due to wrong execPayload", async function () {
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
        termsOkCheck: true,
      });

      // Provider registers new acttion

      const taskSpec = new TaskSpec({
        actions: [mockActionDummyGelato],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      // Instantiate ProviderModule that reverts in execPayload()

      const MockProviderModuleExecPayloadWrongFactory = await ethers.getContractFactory(
        "MockProviderModuleExecPayloadWrong",
        sysAdmin
      );

      const mockProviderModule = await MockProviderModuleExecPayloadWrongFactory.deploy();
      await mockProviderModule.deployed();

      await gelatoCore
        .connect(provider)
        .multiProvide(
          constants.AddressZero,
          [taskSpec],
          [mockProviderModule.address]
        );
      // Provider batch providers dummy action and revertinng module

      const abi = ["function action(bool)"];
      const interFace = new utils.Interface(abi);

      const actionData = interFace.functions.action.encode([true]);

      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: mockProviderModule.address,
      });

      const action = new Action({
        addr: mockActionDummy.address,
        data: actionData,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogExecReverted")
        .withArgs(
          executorAddress,
          taskReceipt.id,
          0,
          "GelatoCore._exec:UnexpectedReturndata"
        );
    });

    it("#7: Should conduct execRevertCheck, if specified by ProviderModule", async function () {
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
        termsOkCheck: true,
      });

      const taskSpec = new TaskSpec({
        actions: [mockActionDummyGelato],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      // Instantiate ProviderModule that reverts in execPayload()

      const MockProviderModuleGelatoUserProxyExecRevertCheckOkFactory = await ethers.getContractFactory(
        "MockProviderModuleGelatoUserProxyExecRevertCheckOk",
        sysAdmin
      );

      const mockProviderModule = await MockProviderModuleGelatoUserProxyExecRevertCheckOkFactory.deploy();
      await mockProviderModule.deployed();

      await gelatoCore
        .connect(provider)
        .multiProvide(
          constants.AddressZero,
          [taskSpec],
          [mockProviderModule.address]
        );
      // Provider batch providers dummy action and revertinng module

      const abi = ["function action(bool)"];
      const interFace = new utils.Interface(abi);

      const actionData = interFace.functions.action.encode([true]);

      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: mockProviderModule.address,
      });

      const action = new Action({
        addr: mockActionDummy.address,
        data: actionData,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        userProxy: userProxyAddress,
        provider: gelatoProvider,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      await expect(
        gelatoCore.connect(executor).exec(taskReceipt, {
          gasPrice: GELATO_GAS_PRICE,
          gasLimit: GELATO_MAX_GAS,
        })
      ).emit(gelatoCore, "LogExecSuccess");
    });

    it("#8: Should revert from execRevertCheck, if specified by ProviderModule", async function () {
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
        termsOkCheck: true,
      });

      const taskSpec = new TaskSpec({
        actions: [mockActionDummyGelato],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      // Instantiate ProviderModule that reverts in execPayload()

      const MockProviderModuleGelatoUserProxyExecRevertCheckRevertFactory = await ethers.getContractFactory(
        "MockProviderModuleGelatoUserProxyExecRevertCheckRevert",
        sysAdmin
      );

      const mockProviderModule = await MockProviderModuleGelatoUserProxyExecRevertCheckRevertFactory.deploy();
      await mockProviderModule.deployed();

      await gelatoCore
        .connect(provider)
        .multiProvide(
          constants.AddressZero,
          [taskSpec],
          [mockProviderModule.address]
        );
      // Provider batch providers dummy action and revertinng module

      const abi = ["function action(bool)"];
      const interFace = new utils.Interface(abi);

      const actionData = interFace.functions.action.encode([true]);

      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: mockProviderModule.address,
      });

      const action = new Action({
        addr: mockActionDummy.address,
        data: actionData,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        userProxy: userProxyAddress,
        provider: gelatoProvider,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      await expect(
        gelatoCore.connect(executor).exec(taskReceipt, {
          gasPrice: GELATO_GAS_PRICE,
          gasLimit: GELATO_MAX_GAS - 10000,
        })
      )
        .to.emit(gelatoCore, "LogExecReverted")
        .withArgs(
          executorAddress,
          taskReceipt.id,
          0,
          "GelatoCore._exec.execRevertCheck:MockProviderModuleGelatoUserProxyExecRevertCheck.execRevertCheck"
        );
    });

    it("#9: Should catch errors during execRevertCheck", async function () {
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
        termsOkCheck: true,
      });

      const taskSpec = new TaskSpec({
        actions: [mockActionDummyGelato],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      // Instantiate ProviderModule that reverts in execPayload()

      const MockProviderModuleGelatoUserProxyExecRevertCheckErrorFactory = await ethers.getContractFactory(
        "MockProviderModuleGelatoUserProxyExecRevertCheckError",
        sysAdmin
      );

      const mockProviderModule = await MockProviderModuleGelatoUserProxyExecRevertCheckErrorFactory.deploy();
      await mockProviderModule.deployed();

      await gelatoCore
        .connect(provider)
        .multiProvide(
          constants.AddressZero,
          [taskSpec],
          [mockProviderModule.address]
        );
      // Provider batch providers dummy action and revertinng module

      const abi = ["function action(bool)"];
      const interFace = new utils.Interface(abi);

      const actionData = interFace.functions.action.encode([true]);

      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: mockProviderModule.address,
      });

      const action = new Action({
        addr: mockActionDummy.address,
        data: actionData,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action],
      });

      let taskReceipt = new TaskReceipt({
        id: 1,
        userProxy: userProxyAddress,
        provider: gelatoProvider,
        tasks: [task],
        submissionsLeft: SUBMISSIONS_LEFT,
      });

      await expect(
        userProxy.submitTask(gelatoProvider, task, EXPIRY_DATE)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      await expect(
        gelatoCore.connect(executor).exec(taskReceipt, {
          gasPrice: GELATO_GAS_PRICE,
          gasLimit: GELATO_MAX_GAS - 10000,
        })
      )
        .to.emit(gelatoCore, "LogExecReverted")
        .withArgs(
          executorAddress,
          taskReceipt.id,
          0,
          "GelatoCore._exec.execRevertCheck:undefined"
        );
    });
  });
});
