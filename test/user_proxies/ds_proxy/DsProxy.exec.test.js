// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");

import initialStateSysAdmin from "../../gelato_core/base/gelato_sys_admin/GelatoSysAdmin.initialState";
import initialStateGasPriceOracle from "../../gelato_core/base/gelato_gas_price_oracle/GelatoGasPriceOracle.initialState";

const GELATO_MAX_GAS = initialStateSysAdmin.gelatoMaxGas;
const GELATO_GAS_PRICE = initialStateGasPriceOracle.gasPrice;

describe("Testing DS Proxy Module delpoyment and ds proxy execution with gelato", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
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
  let MockERC20;
  let DsProxyFactory;
  let dsProxyFactory;
  let sellDecimals;
  let providerModuleDsProxy;
  let gelatoCore;
  let actionERC20TransferFrom;
  let actionERC20TransferFromGelato;
  let submitTaskScript;

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
    const gelatoGasPriceOracle = await GelatoGasPriceOracle.deploy(
      GELATO_GAS_PRICE
    );
    await gelatoGasPriceOracle.deployed();

    // Set gas price oracle on core
    await gelatoCore
      .connect(sysAdmin)
      .setGelatoGasPriceOracle(gelatoGasPriceOracle.address);

    // ####################### DS PROXY MODULE DEPLOYMENT ########################
    DsProxyFactory = await ethers.getContractFactory(
      "DSProxyFactory",
      sysAdmin
    );
    dsProxyFactory = await DsProxyFactory.deploy();
    await dsProxyFactory.deployed();

    // Deploy Multisend contract
    const Multisend = await ethers.getContractFactory("Multisend", sysAdmin);
    const multisend = await Multisend.deploy();

    // Deploy ProviderModuleDSProxy with constructorArgs
    const ProviderModuleDSProxy = await ethers.getContractFactory(
      "ProviderModuleDSProxy",
      sysAdmin
    );
    providerModuleDsProxy = await ProviderModuleDSProxy.deploy(
      dsProxyFactory.address,
      gelatoCore.address,
      multisend.address
    );
    await providerModuleDsProxy.deployed();

    // ####################### DS PROXY MODULE DEPLOYMENT END ########################

    // Deploy Actions
    // // ERCTransferFROM
    const ActionERC20TransferFrom = await ethers.getContractFactory(
      "ActionERC20TransferFrom",
      sysAdmin
    );
    actionERC20TransferFrom = await ActionERC20TransferFrom.deploy();
    await actionERC20TransferFrom.deployed();

    // DEPLOY DUMMY ERC20s
    // // Deploy Sell Token
    MockERC20 = await ethers.getContractFactory("MockERC20");
    sellDecimals = 18;
    sellToken = await MockERC20.deploy(
      "DAI",
      (100 * 10 ** sellDecimals).toString(),
      sellerAddress,
      sellDecimals
    );
    await sellToken.deployed();
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

    // Call multiProvide for mockConditionDummy + actionERC20TransferFrom
    const newTaskSpec = new TaskSpec({
      actions: [actionERC20TransferFromGelato],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    // Call multiProvide for actionWithdrawBatchExchange
    await gelatoCore
      .connect(provider)
      .multiProvide(
        executorAddress,
        [newTaskSpec],
        [providerModuleDsProxy.address]
      );

    // Create UserProxy
    const createTx = await dsProxyFactory.connect(seller).build();
    await createTx.wait();
    // console.log(dsProxyFactory);
    const filter = {
      address: dsProxyFactory.address,
      blockHash: createTx.blockhash,
      topics: [dsProxyFactory.interface.events["Created"].topic],
    };

    const filteredLogs = await ethers.provider.getLogs(filter);
    const logWithTxHash = filteredLogs[0];

    const parsedLog = dsProxyFactory.interface.parseLog(logWithTxHash);

    userProxyAddress = parsedLog.values.proxy;

    userProxy = await ethers.getContractAt("DSProxy", userProxyAddress);

    // Deploy Authority for user and set Gelato Core as guard!!!

    // Deploy GuardFactory
    const DSGuard = await ethers.getContractFactory("DSGuard", seller);
    const dsGuard = await DSGuard.deploy();
    await dsGuard.deployed();

    // permit gelatoCore to call multisend
    // bytes32 src, bytes32 dst, bytes32 sig
    let executeSigHash = userProxy.interface.functions.execute.sighash;
    while (executeSigHash.length < 66) {
      executeSigHash += "0";
    }

    //await dsGuard.permit(gelatoCore.address, multisend.address, executeSigHash);
    await dsGuard.permit(gelatoCore.address, userProxyAddress, executeSigHash);

    // Register guard as authority on user proxy
    await userProxy.setAuthority(dsGuard.address);

    await sellToken.create(
      sellerAddress,
      ethers.utils.parseUnits("100", sellDecimals)
    );

    // Deploy Create Task Script
    const SubmitTaskScript = await ethers.getContractFactory(
      "SubmitTaskScript",
      sysAdmin
    );
    submitTaskScript = await SubmitTaskScript.deploy(gelatoCore.address);
    await submitTaskScript.deployed();
  });

  // We test different functionality of the contract as normal Mocha tests.
  describe("DsProxy.exec", function () {
    it("#1:Testing successfull executution of a single action with gelato", async function () {
      const sendAmount = "100";
      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [
          {
            user: sellerAddress,
            sendToken: sellToken.address,
            destination: executorAddress,
            sendAmount,
          },
        ],
      });
      // Submit Task
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleDsProxy.address,
      });

      const action = new Action({
        addr: actionERC20TransferFrom.address,
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
        submissionsLeft: 1,
      });

      // Submit Task Data encoded
      // Mint through minting script
      const submitTaskData = await run("abi-encode-withselector", {
        contractname: "SubmitTaskScript",
        functionname: "submitTask",
        inputs: [gelatoProvider, task, 0],
      });

      // LogTaskSubmitted(taskReceipt.id, hashedTaskReceipt, taskReceipt);
      await expect(
        userProxy.execute(submitTaskScript.address, submitTaskData)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      let canExecResult = await gelatoCore.canExec(
        taskReceipt,
        GELATO_MAX_GAS,
        GELATO_GAS_PRICE
      );

      await sellToken.connect(seller).approve(userProxyAddress, sendAmount);

      canExecResult = await gelatoCore
        .connect(executor)
        .canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE);

      const executorBalanceBefore = await sellToken.balanceOf(executorAddress);
      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      ).to.emit(gelatoCore, "LogExecSuccess");
      const executorBalanceAfter = await sellToken.balanceOf(executorAddress);

      expect(executorBalanceAfter).to.be.equal(
        executorBalanceBefore.add(sendAmount)
      );
    });

    it("#2:Testing successfull executution of a triple action with gelato", async function () {
      const sendAmount = "100";
      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [
          {
            user: sellerAddress,
            sendToken: sellToken.address,
            destination: executorAddress,
            sendAmount,
          },
        ],
      });
      // Submit Task
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleDsProxy.address,
      });

      const action = new Action({
        addr: actionERC20TransferFrom.address,
        data: actionData,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
      });

      const task = new Task({
        actions: [action, action, action],
      });

      const taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: 1,
      });

      // Submit new task spec as provider
      const newTaskSpec = new TaskSpec({
        actions: [action, action, action],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      // Call multiProvide for actionWithdrawBatchExchange
      await gelatoCore.connect(provider).provideTaskSpecs([newTaskSpec]);

      // Submit Task Data encoded
      // Mint through minting script
      const submitTaskData = await run("abi-encode-withselector", {
        contractname: "SubmitTaskScript",
        functionname: "submitTask",
        inputs: [gelatoProvider, task, 0],
      });

      // LogTaskSubmitted(taskReceipt.id, hashedTaskReceipt, taskReceipt);
      await expect(
        userProxy.execute(submitTaskScript.address, submitTaskData)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      let canExecResult = await gelatoCore.canExec(
        taskReceipt,
        GELATO_MAX_GAS,
        GELATO_GAS_PRICE
      );

      await sellToken.connect(seller).approve(userProxyAddress, 3 * sendAmount);

      canExecResult = await gelatoCore
        .connect(executor)
        .canExec(taskReceipt, GELATO_MAX_GAS, GELATO_GAS_PRICE);

      const executorBalanceBefore = await sellToken.balanceOf(executorAddress);
      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      ).to.emit(gelatoCore, "LogExecSuccess");
      const executorBalanceAfter = await sellToken.balanceOf(executorAddress);

      expect(executorBalanceAfter).to.be.equal(
        executorBalanceBefore.add(sendAmount * 3)
      );
    });

    it("#3:Testing successfull executution of a .call action using gelato", async function () {
      const sendAmount = "100";
      const actionData = await run("abi-encode-withselector", {
        contractname: "ERC20",
        functionname: "transferFrom",
        inputs: [sellerAddress, executorAddress, sendAmount],
      });
      // Submit Task
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleDsProxy.address,
      });

      const action = new Action({
        addr: sellToken.address,
        data: actionData,
        operation: Operation.Call,
      });

      const task = new Task({
        actions: [action],
      });
      const taskReceipt = new TaskReceipt({
        id: 1,
        provider: gelatoProvider,
        userProxy: userProxyAddress,
        tasks: [task],
        submissionsLeft: 1,
      });

      // Submit new task spec as provider
      const newTaskSpec = new TaskSpec({
        actions: [action],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      // Call multiProvide for actionWithdrawBatchExchange
      await gelatoCore.connect(provider).provideTaskSpecs([newTaskSpec]);

      // Submit Task Data encoded
      // Mint through minting script
      const submitTaskData = await run("abi-encode-withselector", {
        contractname: "SubmitTaskScript",
        functionname: "submitTask",
        inputs: [gelatoProvider, task, 0],
      });

      // LogTaskSubmitted(taskReceipt.id, hashedTaskReceipt, taskReceipt);
      await expect(
        userProxy.execute(submitTaskScript.address, submitTaskData)
      ).to.emit(gelatoCore, "LogTaskSubmitted");

      await sellToken.connect(seller).approve(userProxyAddress, sendAmount);

      await expect(
        gelatoCore
          .connect(executor)
          .exec(taskReceipt, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      ).to.emit(gelatoCore, "LogExecSuccess");
    });
  });
});
