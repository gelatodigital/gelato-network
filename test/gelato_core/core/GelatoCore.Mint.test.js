// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");

const GELATO_GAS_PRICE = ethers.utils.parseUnits("8", "gwei");

describe("Gelato Core - Creating ", function () {
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
  let tx;
  let txResponse;
  let providerModuleGelatoUserProxy;
  let providerModuleGelatoUserProxyAddress;
  let gelatoCore;
  let user2;
  let user2address;
  let actionERC20TransferFrom;
  let actionERC20TransferFromGelato;

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
    gelatoCore = await GelatoCore.deploy();
    await gelatoCore
      .connect(executor)
      .stakeExecutor({ value: ethers.utils.parseUnits("1", "ether") });

    // Deploy Gelato Gas Price Oracle with SysAdmin and set to GELATO_GAS_PRICE
    const GelatoGasPriceOracle = await ethers.getContractFactory(
      "GelatoGasPriceOracle",
      sysAdmin
    );
    const gelatoGasPriceOracle = await GelatoGasPriceOracle.deploy(
      gelatoCore.address,
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

    const ActionWithdrawBatchExchange = await ethers.getContractFactory(
      "ActionWithdrawBatchExchange"
    );
    actionWithdrawBatchExchange = await ActionWithdrawBatchExchange.deploy(
      mockBatchExchange.address,
      WETH.address,
      providerAddress
    );
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
      inst: actionERC20TransferFrom.address,
      data: constants.HashZero,
      operation: Operation.Delegatecall,
      value: 0,
      termsOkCheck: true,
    });

    const actionWithdrawBatchExchangeGelato = new Action({
      inst: actionWithdrawBatchExchange.address,
      data: constants.HashZero,
      operation: Operation.Delegatecall,
      value: 0,
      termsOkCheck: true,
    });

    const newTaskSpec = new TaskSpec({
      condition: condition.inst,
      actions: [actionWithdrawBatchExchangeGelato],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    // Call batchProvider(executor, TaskSpecs[], providerModules[])
    await gelatoCore
      .connect(provider)
      .batchProvide(
        executorAddress,
        [newTaskSpec],
        [providerModuleGelatoUserProxy.address]
      );

    // Create UserProxy
    const createTx = await gelatoUserProxyFactory
      .connect(seller)
      .create([], []);
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

  describe("GelatoCore.Create Tests", function () {
    it("#1: Successfully create whitelisted executionClaim", async function () {
      const actionInputs = {
        user: sellerAddress,
        userProxy: userProxyAddress,
        sendToken: sellToken.address,
        destination: sellerAddress,
        sendAmount: ethers.utils.parseUnits("1", "ether"),
      };

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [actionInputs],
      });

      const provider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: constants.AddressZero,
        data: constants.HashZero,
      });

      const action = new Action({
        inst: actionWithdrawBatchExchange.address,
        data: actionPayload,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider,
        condition,
        actions: [action],
        expiryDate: ethers.utils.bigNumberify("0"),
      });

      await expect(userProxy.createExecClaim(task)).to.emit(
        gelatoCore,
        "LogCreateExecClaim"
      );
      // .withArgs(executorAddress, 1, execClaimHash, execClaimArray);
    });

    it("#2: Creating reverts => Action not whitelisted", async function () {
      const notWhitelistedAction = actionERC20TransferFrom.address;
      const actionInputs = {
        user: sellerAddress,
        userProxy: userProxyAddress,
        sendToken: sellToken.address,
        destination: sellerAddress,
        sendAmount: ethers.utils.parseUnits("1", "ether"),
      };

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [actionInputs],
      });

      const provider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: constants.AddressZero,
        data: constants.HashZero,
      });

      const action = new Action({
        inst: notWhitelistedAction,
        data: actionPayload,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      await expect(userProxy.createExecClaim(task)).to.be.revertedWith(
        "GelatoUserProxy.createExecClaim:GelatoCore.createExecClaim.isProvided:TaskSpecNotProvided"
      );

      // CouldNt get the execClaimHash to be computed off-chain
      // .withArgs(executorAddress, 1, execClaimHash, execClaim);
    });

    it("#3: Creating reverts => Condition not whitelisted", async function () {
      const notWhitelistedCondition = actionERC20TransferFrom.address;

      const actionInputs = {
        user: sellerAddress,
        userProxy: userProxyAddress,
        sendToken: sellToken.address,
        destination: sellerAddress,
        sendAmount: ethers.utils.parseUnits("1", "ether"),
      };

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [actionInputs],
      });

      const provider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: notWhitelistedCondition,
        data: constants.HashZero,
      });

      const action = new Action({
        inst: actionWithdrawBatchExchange.address,
        data: actionPayload,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      await expect(userProxy.createExecClaim(task)).to.be.revertedWith(
        "GelatoUserProxy.createExecClaim:GelatoCore.createExecClaim.isProvided:TaskSpecNotProvided"
      );
    });

    it("#4: Creating reverts => Selected Provider with Executor that is not min staked", async function () {
      const revertingProviderAddress = sellerAddress;

      const actionInputs = {
        user: sellerAddress,
        userProxy: userProxyAddress,
        sendToken: sellToken.address,
        destination: sellerAddress,
        sendAmount: ethers.utils.parseUnits("1", "ether"),
      };

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [actionInputs],
      });

      const provider = new GelatoProvider({
        addr: revertingProviderAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: constants.AddressZero,
        data: constants.HashZero,
      });

      const action = new Action({
        inst: actionWithdrawBatchExchange.address,
        data: actionPayload,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      await expect(userProxy.createExecClaim(task)).to.be.revertedWith(
        "GelatoCore.createExecClaim: executorByProvider's stake is insufficient"
      );
    });

    it("#5: Creating reverts => Invalid expiryDate", async function () {
      const expiryDateInPast = 1586776139;

      const actionInputs = {
        user: sellerAddress,
        userProxy: userProxyAddress,
        sendToken: sellToken.address,
        destination: sellerAddress,
        sendAmount: ethers.utils.parseUnits("1", "ether"),
      };

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [actionInputs],
      });

      const provider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: constants.AddressZero,
        data: constants.HashZero,
      });

      const action = new Action({
        inst: actionWithdrawBatchExchange.address,
        data: actionPayload,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider,
        condition,
        actions: [action],
        expiryDate: expiryDateInPast,
      });

      await expect(userProxy.createExecClaim(task)).to.be.revertedWith(
        "GelatoCore.createExecClaim: Invalid expiryDate"
      );
    });

    it("#6: Creating reverts => InvalidProviderModule", async function () {
      const revertingProviderMouleAddress = sellerAddress;

      const actionInputs = {
        user: sellerAddress,
        userProxy: userProxyAddress,
        sendToken: sellToken.address,
        destination: sellerAddress,
        sendAmount: ethers.utils.parseUnits("1", "ether"),
      };

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [actionInputs],
      });

      const provider = new GelatoProvider({
        addr: providerAddress,
        module: revertingProviderMouleAddress,
      });

      const condition = new Condition({
        inst: constants.AddressZero,
        data: constants.HashZero,
      });

      const action = new Action({
        inst: actionWithdrawBatchExchange.address,
        data: actionPayload,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      // GelatoCore.createExecClaim.isProvided:InvalidProviderModule
      await expect(userProxy.createExecClaim(task)).to.be.revertedWith(
        "GelatoCore.createExecClaim.isProvided:InvalidProviderModule"
      );
    });

    it("#7: Creating successful => No action Payload", async function () {
      const noActionPayload = constants.HashZero;

      // Create ExexClaim
      const provider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: constants.AddressZero,
        data: constants.HashZero,
      });

      const action = new Action({
        inst: actionWithdrawBatchExchange.address,
        data: noActionPayload,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      // GelatoCore.createExecClaim.isProvided:InvalidProviderModule
      await expect(userProxy.createExecClaim(task)).to.emit(
        gelatoCore,
        "LogCreateExecClaim"
      );
    });

    it("#8: create success (Self-provider), not whitelisted action, assigning new executor and staking", async function () {
      const actionInputs = {
        user: providerAddress,
        userProxy: userProxyAddress,
        sendToken: sellToken.address,
        destination: sellerAddress,
        sendAmount: ethers.utils.parseUnits("1", "ether"),
      };

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [actionInputs],
      });

      // 2. Create Proxy for Provider
      const createTx = await gelatoUserProxyFactory
        .connect(provider)
        .create([], []);
      await createTx.wait();

      const providerProxyAddress = await gelatoUserProxyFactory.gelatoProxyByUser(
        providerAddress
      );
      const providerProxy = await ethers.getContractAt(
        "GelatoUserProxy",
        providerProxyAddress
      );

      const gelatoProvider = new GelatoProvider({
        addr: providerProxyAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: constants.AddressZero,
        data: constants.HashZero,
      });

      const action = new Action({
        inst: actionWithdrawBatchExchange.address,
        data: actionPayload,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
      });

      const action2 = new Action({
        inst: constants.AddressZero,
        data: constants.HashZero,
        operation: Operation.Call,
        termsOkCheck: true,
      });

      const task = new Task({
        provider: gelatoProvider,
        condition,
        actions: [action, action2],
        expiryDate: constants.HashZero,
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

      // Create Claim
      const createPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "createExecClaim",
        inputs: [task],
      });

      // addProviderModules
      const addProviderModulePayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "addProviderModules",
        inputs: [[providerModuleGelatoUserProxy.address]],
      });

      const actions = [];

      const provideFundsAction = new Action({
        inst: gelatoCore.address,
        data: provideFundsPayload,
        operation: Operation.Call,
        value: ethers.utils.parseUnits("1", "ether"),
      });
      actions.push(provideFundsAction);

      const assignExecutorAction = new Action({
        inst: gelatoCore.address,
        data: providerAssignsExecutorPayload,
        operation: Operation.Call,
      });
      actions.push(assignExecutorAction);

      const addProviderModuleAction = new Action({
        inst: gelatoCore.address,
        data: addProviderModulePayload,
        operation: Operation.Call,
      });
      actions.push(addProviderModuleAction);

      const createAction = new Action({
        inst: gelatoCore.address,
        data: createPayload,
        operation: Operation.Call,
      });
      actions.push(createAction);

      await expect(
        providerProxy.connect(provider).multiExecActions(actions, {
          value: ethers.utils.parseUnits("1", "ether"),
        })
      )
        .to.emit(gelatoCore, "LogCreateExecClaim")
        .to.emit(gelatoCore, "LogProviderAssignsExecutor")
        .to.emit(gelatoCore, "LogProvideFunds");

      // GelatoCore.createExecClaim.isProvided:InvalidProviderModule
    });

    it("#9: createExecClaim reverts (Self-provider), inputting other address as provider that has not whitelisted action", async function () {
      const actionInputs = {
        user: providerAddress,
        userProxy: userProxyAddress,
        sendToken: sellToken.address,
        destination: sellerAddress,
        sendAmount: ethers.utils.parseUnits("1", "ether"),
      };

      const actionPayload = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [actionInputs],
      });

      // 2. Create Proxy for Provider
      const createTx = await gelatoUserProxyFactory
        .connect(provider)
        .create([], []);
      await createTx.wait();

      const providerProxyAddress = await gelatoUserProxyFactory.gelatoProxyByUser(
        providerAddress
      );
      const providerProxy = await ethers.getContractAt(
        "GelatoUserProxy",
        providerProxyAddress
      );

      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: constants.AddressZero,
        data: constants.HashZero,
      });

      const action = new Action({
        inst: actionWithdrawBatchExchange.address,
        data: actionPayload,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
      });

      const action2 = new Action({
        inst: actionWithdrawBatchExchange.address,
        data: constants.HashZero,
        operation: Operation.Call,
        termsOkCheck: true,
      });

      const task = new Task({
        provider: gelatoProvider,
        condition,
        actions: [action, action2],
        expiryDate: constants.HashZero,
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

      // Create Claim
      const createPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "createExecClaim",
        inputs: [task],
      });

      // addProviderModules
      const addProviderModulePayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "addProviderModules",
        inputs: [[providerModuleGelatoUserProxy.address]],
      });

      const actions = [];

      const provideFundsAction = new Action({
        inst: gelatoCore.address,
        data: provideFundsPayload,
        operation: Operation.Call,
        value: ethers.utils.parseUnits("1", "ether"),
      });
      actions.push(provideFundsAction);

      const assignExecutorAction = new Action({
        inst: gelatoCore.address,
        data: providerAssignsExecutorPayload,
        operation: Operation.Call,
      });
      actions.push(assignExecutorAction);

      const addProviderModuleAction = new Action({
        inst: gelatoCore.address,
        data: addProviderModulePayload,
        operation: Operation.Call,
      });
      actions.push(addProviderModuleAction);

      const createAction = new Action({
        inst: gelatoCore.address,
        data: createPayload,
        operation: Operation.Call,
      });
      actions.push(createAction);

      // GelatoCore.createExecClaim.isProvided:InvalidProviderModule
      await expect(
        providerProxy.connect(provider).multiExecActions(actions, {
          value: ethers.utils.parseUnits("1", "ether"),
        })
      ).to.revertedWith(
        "GelatoUserProxy.callAction:GelatoCore.createExecClaim.isProvided:TaskSpecNotProvided"
      );
    });
  });
});
