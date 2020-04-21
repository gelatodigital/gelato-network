// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");

import initialStateSysAdmin from "../gelato_sys_admin/GelatoSysAdmin.initialState";
import initialStateGasPriceOracle from "../gelato_gas_price_oracle/GelatoGasPriceOracle.initialState";

const FEE_USD = 3;
const FEE_ETH = 17000000000000000;
//

const GELATO_MAX_GAS = initialStateSysAdmin.gelatoMaxGas;
const GELATO_GAS_PRICE = initialStateGasPriceOracle.gasPrice;

// ##### Gnosis Action Test Cases #####
// 1. All sellTokens got converted into buy tokens, sufficient for withdrawal
// 2. All sellTokens got converted into buy tokens, insufficient for withdrawal
// 3. SellTokens got partially converted into buy tokens, insufficient buy tokens for withdrawal
// 4. No sellTokens got converted into buy tokens, sufficient sell tokens for withdrawal
// 5. No sellTokens got converted into buy tokens, insufficient sell tokens for withdrawal
describe("GelatoCore.Execute", function () {
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
    gelatoCore = await GelatoCore.deploy();
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
      gelatoCore.address,
      GELATO_GAS_PRICE
    );
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
    const gelatoUserProxyFactory = await GelatoUserProxyFactory.deploy(
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

    // Register new provider IceCream on core with provider EDITS NEED ä#######################

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

    const newIceCream = new IceCream({
      condition: condition.inst,
      actions: [actionWithdrawBatchExchangeGelato],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    // Call batchProvider( for actionWithdrawBatchExchange
    await gelatoCore
      .connect(provider)
      .batchProvide(
        executorAddress,
        [newIceCream],
        [providerModuleGelatoUserProxy.address]
      );

    // Call batchProvider( for mockConditionDummy + actionERC20TransferFrom
    const newIceCream2 = new IceCream({
      condition: mockConditionDummy.address,
      actions: [actionERC20TransferFromGelato],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    await gelatoCore.connect(provider).provideIceCreams([newIceCream2]);

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
    await buyToken.mint(
      mockBatchExchange.address,
      ethers.utils.parseUnits("100", buyDecimals)
    );
    await sellToken.mint(
      mockBatchExchange.address,
      ethers.utils.parseUnits("100", sellDecimals)
    );
    await WETH.mint(
      mockBatchExchange.address,
      ethers.utils.parseUnits("100", wethDecimals)
    );
  });

  // We test different functionality of the contract as normal Mocha tests.
  describe("GelatoCore.Exec", function () {
    it("#1: Successfully mint and execute ActionWithdrawBatchExchange execClaim", async function () {
      // Get Action Payload
      const withdrawAmount = 10 * 10 ** buyDecimals;

      const sellerBalanceBefore = await buyToken.balanceOf(sellerAddress);

      // 3. MockBatchExchange Set withdraw amount
      tx = await mockBatchExchange.setWithdrawAmount(
        buyToken.address,
        withdrawAmount
      );
      await tx.wait();

      // 4. Withdraw Funds from BatchExchange with withdraw action

      // const abiCoder = ethers.utils.defaultAbiCoder;
      // const withdrawPayload = abiCoder.encode(
      //   ["address", "address", "address", "address"],
      //   [sellerAddress, userProxyAddress, sellToken.address, buyToken.address]
      // );

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionWithdrawBatchExchange",
        functionname: "action",
        inputs: [
          sellerAddress,
          userProxyAddress,
          sellToken.address,
          buyToken.address,
        ],
      });

      // Mint ExexClaim
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
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider: gelatoProvider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      const execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      // Should return "OK"

      //const isProvided = await gelatoCore.isIceCreamProvided(execClaim);

      // LogExecClaimMinted(executor, execClaim.id, hashedExecClaim, execClaim);

      await expect(userProxy.mintExecClaim(task)).to.emit(
        gelatoCore,
        "LogExecClaimMinted"
      );

      expect(
        await gelatoCore.canExec(execClaim, GELATO_MAX_GAS, GELATO_GAS_PRICE)
      ).to.be.equal(
        "ActionTermsNotOk:ActionWithdrawBatchExchange: Sell Token not withdrawable yet"
      );

      await expect(
        gelatoCore
          .connect(executor)
          .exec(execClaim, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(
          executorAddress,
          execClaim.id,
          "ActionTermsNotOk:ActionWithdrawBatchExchange: Sell Token not withdrawable yet"
        );

      // Make ExecClaim executable
      await mockBatchExchange.setValidWithdrawRequest(userProxyAddress);

      await expect(
        gelatoCore
          .connect(executor)
          .exec(execClaim, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      ).to.emit(gelatoCore, "LogExecSuccess");

      const feeAmount = FEE_USD * 10 ** buyDecimals;

      const providerBalance = await buyToken.balanceOf(providerAddress);
      expect(providerBalance).to.be.equal(ethers.utils.bigNumberify(feeAmount));
      const sellerBalanceAfter = await buyToken.balanceOf(sellerAddress);

      expect(ethers.utils.bigNumberify(sellerBalanceAfter)).to.be.equal(
        ethers.utils
          .bigNumberify(sellerBalanceBefore)
          .add(ethers.utils.bigNumberify(withdrawAmount))
          .sub(ethers.utils.bigNumberify(feeAmount))
      );
    });

    it("#2: Mint ActionERC20TransferFrom and revert with LogCanExecFailed in exec due to other string than 'Ok' being returned inside Condition", async function () {
      // Get Action Payload

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [
          {
            user: sellerAddress,
            userProxy: userProxyAddress,
            sendToken: sellToken.address,
            destination: providerAddress,
            sendAmount: ethers.utils.parseUnits("1", "ether"),
          },
        ],
      });

      const conditionDataFalse = await run("abi-encode-withselector", {
        contractname: "MockConditionDummy",
        functionname: "ok",
        inputs: [false],
      });

      // Mint ExexClaim
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: mockConditionDummy.address,
        data: conditionDataFalse,
      });

      const action = new Action({
        inst: actionERC20TransferFrom.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider: gelatoProvider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      let execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      // Should return "OK"
      // const isProvided = await gelatoCore.isIceCreamProvided(execClaim);

      await expect(userProxy.mintExecClaim(task)).to.emit(
        gelatoCore,
        "LogExecClaimMinted"
      );

      await expect(
        gelatoCore
          .connect(executor)
          .exec(execClaim, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(executorAddress, execClaim.id, "ConditionNotOk:NotOk");
    });

    it("#3: Mint ActionERC20TransferFrom and revert with LogCanExecFailed in exec due to Revert Inside Condition", async function () {
      // Get Action Payload

      // Provider registers new condition
      const MockConditionDummyRevert = await ethers.getContractFactory(
        "MockConditionDummyRevert",
        sysAdmin
      );
      mockConditionDummyRevert = await MockConditionDummyRevert.deploy();
      await mockConditionDummyRevert.deployed();

      const newIceCream2 = new IceCream({
        condition: mockConditionDummyRevert.address,
        actions: [actionERC20TransferFromGelato],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      await gelatoCore.connect(provider).provideIceCreams([newIceCream2]);

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [
          {
            user: sellerAddress,
            userProxy: userProxyAddress,
            sendToken: sellToken.address,
            destination: providerAddress,
            sendAmount: ethers.utils.parseUnits("1", "ether"),
          },
        ],
      });

      const conditionDataFalse = await run("abi-encode-withselector", {
        contractname: "MockConditionDummyRevert",
        functionname: "ok",
        inputs: [false],
      });

      // Mint ExexClaim
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: mockConditionDummyRevert.address,
        data: conditionDataFalse,
      });

      const action = new Action({
        inst: actionERC20TransferFrom.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider: gelatoProvider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      let execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      // Should return "OK"
      // const isProvided = await gelatoCore.isIceCreamProvided(execClaim);

      await expect(userProxy.mintExecClaim(task)).to.emit(
        gelatoCore,
        "LogExecClaimMinted"
      );

      await expect(
        gelatoCore
          .connect(executor)
          .exec(execClaim, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(
          executorAddress,
          execClaim.id,
          "ConditionReverted:Condition Reverted"
        );
    });

    it("#4: Mint ActionERC20TransferFrom and revert with LogCanExecFailed in exec due to Condition Reverting with no message", async function () {
      // @DEV registering an action as a condition (with no ok function)

      // Provider registers new condition

      const newIceCream2 = new IceCream({
        condition: actionERC20TransferFrom.address,
        actions: [actionERC20TransferFromGelato],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      await gelatoCore.connect(provider).provideIceCreams([newIceCream2]);

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [
          {
            user: sellerAddress,
            userProxy: userProxyAddress,
            sendToken: sellToken.address,
            destination: providerAddress,
            sendAmount: ethers.utils.parseUnits("1", "ether"),
          },
        ],
      });

      const conditionDataFalse = await run("abi-encode-withselector", {
        contractname: "MockConditionDummyRevert",
        functionname: "ok",
        inputs: [false],
      });

      // Mint ExexClaim
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: actionERC20TransferFrom.address,
        data: actionData,
      });

      const action = new Action({
        inst: actionERC20TransferFrom.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider: gelatoProvider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      let execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      // Should return "OK"
      // const isProvided = await gelatoCore.isIceCreamProvided(execClaim);

      await expect(userProxy.mintExecClaim(task)).to.emit(
        gelatoCore,
        "LogExecClaimMinted"
      );

      await expect(
        gelatoCore
          .connect(executor)
          .exec(execClaim, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(executorAddress, execClaim.id, "ConditionRevertedNoMessage");
    });

    it("#5: Mint ActionERC20TransferFrom and revert with LogCanExecFailed in exec due to ActionReverted", async function () {
      // @DEV registering an action with reverting termsOk

      // Provider registers new condition
      const MockActionDummyRevert = await ethers.getContractFactory(
        "MockActionDummyRevert",
        sysAdmin
      );

      const mockActionDummyRevert = await MockActionDummyRevert.deploy();
      await mockActionDummyRevert.deployed();

      const mockActionDummyRevertGelato = new Action({
        inst: mockActionDummyRevert.address,
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      // Provider registers new acttion

      const newIceCream2 = new IceCream({
        condition: constants.AddressZero,
        actions: [mockActionDummyRevertGelato],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      await gelatoCore.connect(provider).provideIceCreams([newIceCream2]);

      const encoder = ethers.utils.defaultAbiCoder;
      const actionData = await encoder.encode(["bool"], [false]);

      // Mint ExexClaim
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: constants.AddressZero,
        data: constants.HashZero,
      });

      const action = new Action({
        inst: mockActionDummyRevert.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider: gelatoProvider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      let execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      // Should return "OK"
      // const isProvided = await gelatoCore.isIceCreamProvided(execClaim);

      await expect(userProxy.mintExecClaim(task)).to.emit(
        gelatoCore,
        "LogExecClaimMinted"
      );

      await expect(
        gelatoCore
          .connect(executor)
          .exec(execClaim, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(
          executorAddress,
          execClaim.id,
          "ActionReverted:Action TermsOk not ok"
        );
    });

    it("#6: Mint ActionERC20TransferFrom and revert with LogCanExecFailed in exec due to ActionRevertedNoMessage", async function () {
      // @DEV Use condition contract as an action to see termsOk revert
      const MockConditionDummyRevert = await ethers.getContractFactory(
        "MockConditionDummyRevert",
        sysAdmin
      );
      mockConditionDummyRevert = await MockConditionDummyRevert.deploy();
      await mockConditionDummyRevert.deployed();

      const revertingAction = new Action({
        inst: mockConditionDummyRevert.address,
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const newIceCream2 = new IceCream({
        condition: constants.AddressZero,
        actions: [revertingAction],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      await gelatoCore.connect(provider).provideIceCreams([newIceCream2]);

      const encoder = ethers.utils.defaultAbiCoder;
      const actionData = await encoder.encode(["bool"], [false]);

      // Mint ExexClaim
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: constants.AddressZero,
        data: constants.HashZero,
      });

      const action = new Action({
        inst: mockConditionDummyRevert.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider: gelatoProvider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      let execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      // Should return "OK"
      // const isProvided = await gelatoCore.isIceCreamProvided(execClaim);

      await expect(userProxy.mintExecClaim(task)).to.emit(
        gelatoCore,
        "LogExecClaimMinted"
      );

      await expect(
        gelatoCore
          .connect(executor)
          .exec(execClaim, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(executorAddress, execClaim.id, "ActionRevertedNoMessage");
    });

    it("#7: Mint ActionERC20TransferFrom and revert with LogCanExecFailed in exec due to Action termsOk failure", async function () {
      // Get Action Payload

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [
          {
            user: sellerAddress,
            userProxy: userProxyAddress,
            sendToken: sellToken.address,
            destination: providerAddress,
            sendAmount: ethers.utils.parseUnits("1", "ether"),
          },
        ],
      });

      const conditionDataTrue = await run("abi-encode-withselector", {
        contractname: "MockConditionDummy",
        functionname: "ok",
        inputs: [true],
      });

      // Mint ExexClaim
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: mockConditionDummy.address,
        data: conditionDataTrue,
      });

      const action = new Action({
        inst: actionERC20TransferFrom.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider: gelatoProvider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      let execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      // Should return "OK"
      // const isProvided = await gelatoCore.isIceCreamProvided(execClaim);

      await expect(userProxy.mintExecClaim(task)).to.emit(
        gelatoCore,
        "LogExecClaimMinted"
      );

      await expect(
        gelatoCore
          .connect(executor)
          .exec(execClaim, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(
          executorAddress,
          execClaim.id,
          "ActionTermsNotOk:ActionERC20TransferFrom: NotOkUserProxySendTokenAllowance"
        );
    });

    it("#8: Mint revert with InvalidExecClaimHash in exec due to ExecClaimHash not existing", async function () {
      // Get Action Payload

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [
          {
            user: sellerAddress,
            userProxy: userProxyAddress,
            sendToken: sellToken.address,
            destination: providerAddress,
            sendAmount: ethers.utils.parseUnits("1", "ether"),
          },
        ],
      });

      const conditionDataFalse = await run("abi-encode-withselector", {
        contractname: "MockConditionDummy",
        functionname: "ok",
        inputs: [false],
      });

      const conditionDataTrue = await run("abi-encode-withselector", {
        contractname: "MockConditionDummy",
        functionname: "ok",
        inputs: [true],
      });

      // Mint ExexClaim

      // Mint ExexClaim
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: mockConditionDummy.address,
        data: conditionDataFalse,
      });

      const action = new Action({
        inst: actionERC20TransferFrom.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider: gelatoProvider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      let execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      await expect(
        gelatoCore
          .connect(executor)
          .exec(execClaim, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(executorAddress, execClaim.id, "InvalidExecClaimHash");
    });

    it("#9: Mint and revert in exec due to InvalidExecutor", async function () {
      // Get Action Payload

      const MockConditionDummy = await ethers.getContractFactory(
        "MockConditionDummyRevert",
        sysAdmin
      );
      const mockConditionDummy = await MockConditionDummy.deploy();
      await mockConditionDummy.deployed();

      const mockConditionAsAction = new Action({
        inst: mockConditionDummy.address,
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: false,
      });

      const newIceCream2 = new IceCream({
        condition: constants.AddressZero,
        actions: [mockConditionAsAction],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      await gelatoCore.connect(provider).provideIceCreams([newIceCream2]);

      // Mint ExexClaim
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: constants.AddressZero,
        data: constants.HashZero,
      });

      const task = new Task({
        provider: gelatoProvider,
        condition,
        actions: [mockConditionAsAction],
        expiryDate: constants.HashZero,
      });

      let execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      await expect(userProxy.mintExecClaim(task)).to.emit(
        gelatoCore,
        "LogExecClaimMinted"
      );

      await expect(
        gelatoCore
          .connect(provider)
          .exec(execClaim, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      ).to.revertedWith("GelatoCore.exec: Invalid Executor");
    });

    it("#10: Mint and revert with Expired in exec due to expiry date having passed", async function () {
      // Get Action Payload
      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionERC20TransferFrom",
        functionname: "action",
        inputs: [
          {
            user: sellerAddress,
            userProxy: userProxyAddress,
            sendToken: sellToken.address,
            destination: providerAddress,
            sendAmount: ethers.utils.parseUnits("1", "ether"),
          },
        ],
      });

      const conditionDataFalse = await run("abi-encode-withselector", {
        contractname: "MockConditionDummy",
        functionname: "ok",
        inputs: [false],
      });

      const conditionDataTrue = await run("abi-encode-withselector", {
        contractname: "MockConditionDummy",
        functionname: "ok",
        inputs: [true],
      });

      // Mint ExexClaim

      // Mint ExexClaim
      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: mockConditionDummy.address,
        data: conditionDataFalse,
      });

      const action = new Action({
        inst: actionERC20TransferFrom.address,
        data: actionData,
        operation: Operation.Delegatecall,
        termsOkCheck: true,
      });

      let oldBlock = await ethers.provider.getBlock();

      const task = new Task({
        provider: gelatoProvider,
        condition,
        actions: [action],
        expiryDate: oldBlock.timestamp + 1000000,
      });

      let execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      await expect(userProxy.mintExecClaim(task)).to.emit(
        gelatoCore,
        "LogExecClaimMinted"
      );

      // By default connect to
      let provider = new ethers.providers.JsonRpcProvider();

      // Get a promise for your call
      await ethers.provider.send("evm_increaseTime", [1000000]);

      // Do random Tx to increment time
      await buyToken.mint(
        sellerAddress,
        ethers.utils.parseUnits("100", buyDecimals)
      );

      let newBlock = await ethers.provider.getBlock();

      await expect(
        gelatoCore
          .connect(executor)
          .exec(execClaim, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(executorAddress, execClaim.id, "ExecClaimExpired");
    });

    it("#11: Exec good execClaim, however revert  with GelatoCore.exec: Insufficient gas sent because insufficient gas was sent", async function () {
      // Get Action Payload
      const withdrawAmount = 10 * 10 ** buyDecimals;

      const sellerBalanceBefore = await buyToken.balanceOf(sellerAddress);

      // 3. MockBatchExchange Set withdraw amount
      tx = await mockBatchExchange.setWithdrawAmount(
        buyToken.address,
        withdrawAmount
      );
      await tx.wait();

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionWithdrawBatchExchange",
        functionname: "action",
        inputs: [
          sellerAddress,
          userProxyAddress,
          sellToken.address,
          buyToken.address,
        ],
      });

      // Mint ExexClaim
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
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider: gelatoProvider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      const execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      // Should return "OK"

      //const isProvided = await gelatoCore.isIceCreamProvided(execClaim);

      // LogExecClaimMinted(executor, execClaim.id, hashedExecClaim, execClaim);

      await expect(userProxy.mintExecClaim(task)).to.emit(
        gelatoCore,
        "LogExecClaimMinted"
      );

      expect(
        await gelatoCore.canExec(execClaim, GELATO_MAX_GAS, GELATO_GAS_PRICE)
      ).to.be.equal(
        "ActionTermsNotOk:ActionWithdrawBatchExchange: Sell Token not withdrawable yet"
      );

      await gelatoCore
        .connect(executor)
        .exec(execClaim, { gasPrice: GELATO_GAS_PRICE, gasLimit: 5000000 });

      await expect(
        gelatoCore
          .connect(executor)
          .exec(execClaim, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(
          executorAddress,
          execClaim.id,
          "ActionTermsNotOk:ActionWithdrawBatchExchange: Sell Token not withdrawable yet"
        );

      // Make ExecClaim executable
      await mockBatchExchange.setValidWithdrawRequest(userProxyAddress);

      const internalGasRequirement = await gelatoCore.internalGasRequirement();

      await expect(
        gelatoCore.connect(executor).exec(execClaim, {
          gasPrice: GELATO_GAS_PRICE,
          gasLimit: internalGasRequirement,
        })
      ).to.revertedWith("GelatoCore.exec: Insufficient gas sent");
    });

    it("#12: Exec good execClaim, however revert with LogExecutionRevert because insufficient gas was sent", async function () {
      // Get Action Payload
      const withdrawAmount = 10 * 10 ** buyDecimals;

      const sellerBalanceBefore = await buyToken.balanceOf(sellerAddress);

      // 3. MockBatchExchange Set withdraw amount
      tx = await mockBatchExchange.setWithdrawAmount(
        buyToken.address,
        withdrawAmount
      );
      await tx.wait();

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionWithdrawBatchExchange",
        functionname: "action",
        inputs: [
          sellerAddress,
          userProxyAddress,
          sellToken.address,
          buyToken.address,
        ],
      });

      // Mint ExexClaim
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
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider: gelatoProvider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      const execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      // Should return "OK"

      //const isProvided = await gelatoCore.isIceCreamProvided(execClaim);

      // LogExecClaimMinted(executor, execClaim.id, hashedExecClaim, execClaim);

      await expect(userProxy.mintExecClaim(task)).to.emit(
        gelatoCore,
        "LogExecClaimMinted"
      );

      expect(
        await gelatoCore.canExec(execClaim, GELATO_MAX_GAS, GELATO_GAS_PRICE)
      ).to.be.equal(
        "ActionTermsNotOk:ActionWithdrawBatchExchange: Sell Token not withdrawable yet"
      );

      await expect(
        gelatoCore
          .connect(executor)
          .exec(execClaim, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(
          executorAddress,
          execClaim.id,
          "ActionTermsNotOk:ActionWithdrawBatchExchange: Sell Token not withdrawable yet"
        );

      // Make ExecClaim executable
      await mockBatchExchange.setValidWithdrawRequest(userProxyAddress);

      const internalGasRequirement = await gelatoCore.internalGasRequirement();

      await expect(
        gelatoCore.connect(executor).exec(execClaim, {
          gasPrice: GELATO_GAS_PRICE,
          gasLimit: ethers.utils
            .bigNumberify(internalGasRequirement)
            .add(ethers.utils.bigNumberify("50000")),
        })
      ).to.emit(gelatoCore, "LogExecutionRevert");
    });

    it("#13: Successfully mint and execute ActionWithdrawBatchExchange execClaim (self-provider)", async function () {
      // Get Action Payload
      const withdrawAmount = 10 * 10 ** buyDecimals;

      // 3. MockBatchExchange Set withdraw amount
      tx = await mockBatchExchange.setWithdrawAmount(
        buyToken.address,
        withdrawAmount
      );
      await tx.wait();

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionWithdrawBatchExchange",
        functionname: "action",
        inputs: [
          sellerAddress,
          userProxyAddress,
          sellToken.address,
          buyToken.address,
        ],
      });

      // Mint ExexClaim
      const gelatoProvider = new GelatoProvider({
        addr: userProxyAddress,
        module: providerModuleGelatoUserProxy.address,
      });

      const condition = new Condition({
        inst: constants.AddressZero,
        data: constants.HashZero,
      });

      const action = new Action({
        inst: actionWithdrawBatchExchange.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider: gelatoProvider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      const execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      // Should return "OK"

      //const isProvided = await gelatoCore.isIceCreamProvided(execClaim);

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

      // Mint Claim
      const mintPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "mintExecClaim",
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

      const mintAction = new Action({
        inst: gelatoCore.address,
        data: mintPayload,
        operation: Operation.Call,
      });
      actions.push(mintAction);

      // LogExecClaimMinted(executor, execClaim.id, hashedExecClaim, execClaim);

      await expect(
        userProxy.multiExecActions(actions, {
          value: ethers.utils.parseUnits("1", "ether"),
        })
      ).to.emit(gelatoCore, "LogExecClaimMinted");

      // Make ExecClaim executable
      await mockBatchExchange.setValidWithdrawRequest(userProxyAddress);

      await expect(
        gelatoCore
          .connect(executor)
          .exec(execClaim, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      ).to.emit(gelatoCore, "LogExecSuccess");
    });

    // Exec Failed tests
    it("#14: Mint ActionWithdraw and revert with LogExecFailed in exec due action call reverting (to insufficient withdraw balance in WithdrawAction)", async function () {
      // Get Action Payload
      const withdrawAmount = 1 * 10 ** buyDecimals;

      const sellerBalanceBefore = await buyToken.balanceOf(sellerAddress);

      // 3. MockBatchExchange Set withdraw amount
      tx = await mockBatchExchange.setWithdrawAmount(
        buyToken.address,
        withdrawAmount
      );
      await tx.wait();

      // 4. Withdraw Funds from BatchExchange with withdraw action

      // const abiCoder = ethers.utils.defaultAbiCoder;
      // const withdrawPayload = abiCoder.encode(
      //   ["address", "address", "address", "address"],
      //   [sellerAddress, userProxyAddress, sellToken.address, buyToken.address]
      // );

      const actionData = await run("abi-encode-withselector", {
        contractname: "ActionWithdrawBatchExchange",
        functionname: "action",
        inputs: [
          sellerAddress,
          userProxyAddress,
          sellToken.address,
          buyToken.address,
        ],
      });

      // Mint ExexClaim

      // Mint ExexClaim
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
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider: gelatoProvider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      let execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      // Should return "OK"
      // const isProvided = await gelatoCore.isIceCreamProvided(execClaim);

      // LogExecClaimMinted(executor, execClaim.id, hashedExecClaim, execClaim);

      await expect(userProxy.mintExecClaim(task)).to.emit(
        gelatoCore,
        "LogExecClaimMinted"
      );

      expect(
        await gelatoCore.canExec(execClaim, GELATO_MAX_GAS, GELATO_GAS_PRICE)
      ).to.be.equal(
        "ActionTermsNotOk:ActionWithdrawBatchExchange: Sell Token not withdrawable yet"
      );

      await expect(
        gelatoCore
          .connect(executor)
          .exec(execClaim, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogCanExecFailed")
        .withArgs(
          executorAddress,
          execClaim.id,
          "ActionTermsNotOk:ActionWithdrawBatchExchange: Sell Token not withdrawable yet"
        );

      // Make ExecClaim executable
      await mockBatchExchange.setValidWithdrawRequest(userProxyAddress);

      await expect(
        gelatoCore
          .connect(executor)
          .exec(execClaim, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogExecFailed")
        .withArgs(
          executorAddress,
          1,
          0,
          "GelatoCore._exec:GelatoUserProxy.delegatecallAction:ActionWithdrawBatchExchange: Insufficient balance for user to pay for withdrawal 2"
        );

      const providerBalance = await buyToken.balanceOf(providerAddress);
      expect(providerBalance).to.be.equal(ethers.utils.bigNumberify("0"));
      const sellerBalanceAfter = await buyToken.balanceOf(sellerAddress);

      expect(ethers.utils.bigNumberify(sellerBalanceAfter)).to.be.equal(
        ethers.utils.bigNumberify(sellerBalanceBefore)
      );
    });

    it("#15: Mint DummyAction and revert with LogExecFailed in exec due execPayload reverting (due to revert in ProviderModule)", async function () {
      // Provider registers new condition
      const MockActionDummy = await ethers.getContractFactory(
        "MockActionDummy",
        sysAdmin
      );

      const mockActionDummy = await MockActionDummy.deploy();
      await mockActionDummy.deployed();

      const mockActionDummyGelato = new Action({
        inst: mockActionDummy.address,
        data: constants.HashZero,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      // Provider registers new acttion

      const newIceCream2 = new IceCream({
        condition: constants.AddressZero,
        actions: [mockActionDummyGelato],
        gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
      });

      // Instantiate ProviderModule that reverts in execPayload()

      const MockProviderModuleGelatoUserProxyRevert = await ethers.getContractFactory(
        "MockProviderModuleGelatoUserProxyRevert",
        sysAdmin
      );

      const mockProviderModuleGelatoUserProxyRevert = await MockProviderModuleGelatoUserProxyRevert.deploy();
      await mockProviderModuleGelatoUserProxyRevert.deployed();

      await gelatoCore
        .connect(provider)
        .batchProvide(
          constants.AddressZero,
          [newIceCream2],
          [mockProviderModuleGelatoUserProxyRevert.address]
        );
      // Provider batch providers dummy action and revertinng module

      const abi = ["function action(bool)"];
      const interFace = new utils.Interface(abi);

      const actionData = interFace.functions.action.encode([true]);

      const gelatoProvider = new GelatoProvider({
        addr: providerAddress,
        module: mockProviderModuleGelatoUserProxyRevert.address,
      });

      const condition = new Condition({
        inst: constants.AddressZero,
        data: constants.HashZero,
      });

      const action = new Action({
        inst: mockActionDummy.address,
        data: actionData,
        operation: Operation.Delegatecall,
        value: 0,
        termsOkCheck: true,
      });

      const task = new Task({
        provider: gelatoProvider,
        condition,
        actions: [action],
        expiryDate: constants.HashZero,
      });

      let execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      await expect(userProxy.mintExecClaim(task)).to.emit(
        gelatoCore,
        "LogExecClaimMinted"
      );

      await expect(
        gelatoCore
          .connect(executor)
          .exec(execClaim, { gasPrice: GELATO_GAS_PRICE, gasLimit: 7000000 })
      )
        .to.emit(gelatoCore, "LogExecFailed")
        .withArgs(
          executorAddress,
          1,
          0,
          "GelatoCore._exec.execPayload:Test Revert"
        );
    });
  });
});