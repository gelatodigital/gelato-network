// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");
const FEE_USD = 2;
const FEE_ETH = 9000000000000000;
const OPERATION = {
  call: 0,
  delegatecall: 1,
};
const GELATO_GAS_PRICE = ethers.utils.parseUnits("8", "gwei");

// ##### Gnosis Action Test Cases #####
// 1. All sellTokens got converted into buy tokens, sufficient for withdrawal
// 2. All sellTokens got converted into buy tokens, insufficient for withdrawal
// 3. SellTokens got partially converted into buy tokens, insufficient buy tokens for withdrawal
// 4. No sellTokens got converted into buy tokens, sufficient sell tokens for withdrawal
// 5. No sellTokens got converted into buy tokens, insufficient sell tokens for withdrawal
describe("Gnosis - ActionWithdrawBatchExchange - Action", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
  let actionWithdrawBatchExchange;
  let providerModuleGelatoUserProxy;
  let seller;
  let provider;
  let sysAdmin;
  let executor;
  let userProxy;
  let sellerAddress;
  let providerAddress;
  let executorAddress;
  let sysAdminAddress;
  let userProxyAddress;
  let sellToken; //DAI
  let buyToken; //USDC
  let MockERC20;
  let mockBatchExchange;
  let WETH;
  let sellDecimals;
  let buyDecimals;
  let wethDecimals;
  let tx;
  let txResponse;
  let gelatoCore;

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
    const gelatoUserProxyFactory = await GelatoUserProxyFactory.deploy(
      gelatoCore.address
    );

    // Call proxyExtcodehash on Factory and deploy ProviderModuleGelatoUserProxy with constructorArgs
    const proxyExtcodehash = await gelatoUserProxyFactory.proxyExtcodehash();
    const ProviderModuleGelatoUserProxy = await ethers.getContractFactory(
      "ProviderModuleGelatoUserProxy",
      sysAdmin
    );
    providerModuleGelatoUserProxy = await ProviderModuleGelatoUserProxy.deploy([
      proxyExtcodehash,
    ]);

    // Deploy Condition (if necessary)

    // Deploy Actions
    // // ERCTransferFROM
    const ActionERC20TransferFrom = await ethers.getContractFactory(
      "ActionERC20TransferFrom",
      sysAdmin
    );
    const actionERC20TransferFrom = await ActionERC20TransferFrom.deploy();
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

    // Register new provider CAM on core with provider EDITS NEED ä#######################

    const condition = new Condition({
      inst: constants.AddressZero,
      data: constants.HashZero,
    });

    const actionERC20TransferFromGelato = new Action({
      inst: actionERC20TransferFrom.address,
      data: constants.HashZero,
      operation: "delegatecall",
      value: 0,
      termsOkCheck: true,
    });

    const actionWithdrawBatchExchangeGelato = new Action({
      inst: actionWithdrawBatchExchange.address,
      data: constants.HashZero,
      operation: "delegatecall",
      value: 0,
      termsOkCheck: true,
    });

    const newCam = new CAM({
      condition: condition.inst,
      actions: [actionWithdrawBatchExchangeGelato],
      gasPriceCeil: ethers.utils.parseUnits("20", "gwei"),
    });

    // Call batchProvider(executor, CAMS[], providerModules[])
    await gelatoCore
      .connect(provider)
      .batchProvide(
        executorAddress,
        [newCam],
        [providerModuleGelatoUserProxy.address]
      );

    // Create UserProxy
    tx = await gelatoUserProxyFactory.connect(seller).create();
    txResponse = await tx.wait();

    const executionEvent = await run("event-getparsedlog", {
      contractname: "GelatoUserProxyFactory",
      contractaddress: gelatoUserProxyFactory.address,
      eventname: "LogCreation",
      txhash: txResponse.transactionHash,
      blockhash: txResponse.blockHash,
      values: true,
      stringify: true,
    });

    userProxyAddress = executionEvent.userProxy;

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
  describe("ActionWithdrawBatchExchange.action", function () {
    it("Case #1: No sellTokens withdrawable, 10 buyTokens (non weth) withdrawable to pay fees", async function () {
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

      const withdrawPayload = await run("abi-encode-withselector", {
        contractname: "ActionWithdrawBatchExchange",
        functionname: "action",
        inputs: [
          sellerAddress,
          userProxyAddress,
          sellToken.address,
          buyToken.address,
        ],
      });

      const gelatoAction = {
        inst: actionWithdrawBatchExchange.address,
        data: withdrawPayload,
        operation: OPERATION.delegatecall,
        value: 0,
        termsOkCheck: true,
      };

      tx = await userProxy.execGelatoAction(gelatoAction);
      txResponse = await tx.wait();

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

    it("Case #2: No sellTokens withdrawable, 1 WETH withdrawable", async function () {
      const withdrawAmount = ethers.utils.parseUnits("1", wethDecimals);

      const sellerBalanceBefore = await WETH.balanceOf(sellerAddress);

      // 3. MockBatchExchange Set withdraw amount
      tx = await mockBatchExchange.setWithdrawAmount(
        WETH.address,
        withdrawAmount.toString()
      );
      await tx.wait();

      const withdrawPayload = await run("abi-encode-withselector", {
        contractname: "ActionWithdrawBatchExchange",
        functionname: "action",
        inputs: [
          sellerAddress,
          userProxyAddress,
          sellToken.address,
          WETH.address,
        ],
      });

      const gelatoAction = {
        inst: actionWithdrawBatchExchange.address,
        data: withdrawPayload,
        operation: OPERATION.delegatecall,
        value: 0,
        termsOkCheck: true,
      };

      tx = await userProxy.execGelatoAction(gelatoAction);
      txResponse = await tx.wait();

      const feeAmount = FEE_ETH;

      const providerBalance = await WETH.balanceOf(providerAddress);
      expect(providerBalance).to.be.equal(ethers.utils.bigNumberify(feeAmount));

      const sellerBalanceAfter = await WETH.balanceOf(sellerAddress);
      expect(ethers.utils.bigNumberify(sellerBalanceAfter)).to.be.equal(
        sellerBalanceBefore
          .add(withdrawAmount)
          .sub(ethers.utils.bigNumberify(feeAmount))
      );
    });

    it("Case #3: No sellTokens withdrawable, 1.9 (insufficient) buyTokens (non weth) withdrawable", async function () {
      const withdrawAmount = 1.9 * 10 ** buyDecimals;

      const sellerBalanceBefore = await buyToken.balanceOf(sellerAddress);

      // 3. MockBatchExchange Set withdraw amount
      tx = await mockBatchExchange.setWithdrawAmount(
        buyToken.address,
        withdrawAmount
      );
      await tx.wait();

      const withdrawPayload = await run("abi-encode-withselector", {
        contractname: "ActionWithdrawBatchExchange",
        functionname: "action",
        inputs: [
          sellerAddress,
          userProxyAddress,
          sellToken.address,
          buyToken.address,
        ],
      });

      const gelatoAction = {
        inst: actionWithdrawBatchExchange.address,
        data: withdrawPayload,
        operation: OPERATION.delegatecall,
        value: 0,
        termsOkCheck: true,
      };
      await expect(userProxy.execGelatoAction(gelatoAction)).to.be.revertedWith(
        "GelatoUserProxy.delegatecallAction:ActionWithdrawBatchExchange: Insufficient balance for user to pay for withdrawal 2"
      );

      const providerBalance = await buyToken.balanceOf(providerAddress);
      expect(providerBalance).to.be.equal(0);

      const sellerBalanceAfter = await buyToken.balanceOf(sellerAddress);
      expect(ethers.utils.bigNumberify(sellerBalanceAfter)).to.be.equal(
        ethers.utils.bigNumberify(sellerBalanceBefore)
      );
    });

    it("Case #4: No sellTokens withdrawable, 4000000000000000 (insufficient) WETH withdrawable", async function () {
      const withdrawAmount = 4000000000000000;

      const sellerBalanceBefore = await WETH.balanceOf(sellerAddress);

      // 3. MockBatchExchange Set withdraw amount
      tx = await mockBatchExchange.setWithdrawAmount(
        WETH.address,
        withdrawAmount
      );
      await tx.wait();

      // 4. Withdraw Funds from BatchExchange with withdraw action

      // const abiCoder = ethers.utils.defaultAbiCoder;
      // const withdrawPayload = abiCoder.encode(
      //   ["address", "address", "address", "address"],
      //   [sellerAddress, userProxyAddress, sellToken.address, WETH.address]
      // );

      const withdrawPayload = await run("abi-encode-withselector", {
        contractname: "ActionWithdrawBatchExchange",
        functionname: "action",
        inputs: [
          sellerAddress,
          userProxyAddress,
          sellToken.address,
          WETH.address,
        ],
      });

      const gelatoAction = {
        inst: actionWithdrawBatchExchange.address,
        data: withdrawPayload,
        operation: OPERATION.delegatecall,
        value: 0,
        termsOkCheck: true,
      };

      await expect(userProxy.execGelatoAction(gelatoAction)).to.be.revertedWith(
        "GelatoUserProxy.delegatecallAction:ActionWithdrawBatchExchange: Insufficient balance for user to pay for withdrawal 2"
      );

      const providerBalance = await WETH.balanceOf(providerAddress);
      expect(providerBalance).to.be.equal(0);

      const sellerBalanceAfter = await WETH.balanceOf(sellerAddress);
      expect(ethers.utils.bigNumberify(sellerBalanceAfter)).to.be.equal(
        ethers.utils.bigNumberify(sellerBalanceBefore)
      );
    });

    it("Case #5: 10 sellTokens withdrawable, No buyTokens withdrawable", async function () {
      const withdrawAmount = ethers.utils.parseUnits("10", sellDecimals);

      const sellerBalanceBefore = await sellToken.balanceOf(sellerAddress);

      // 3. MockBatchExchange Set withdraw amount
      tx = await mockBatchExchange.setWithdrawAmount(
        sellToken.address,
        withdrawAmount
      );
      await tx.wait();

      const withdrawPayload = await run("abi-encode-withselector", {
        contractname: "ActionWithdrawBatchExchange",
        functionname: "action",
        inputs: [
          sellerAddress,
          userProxyAddress,
          sellToken.address,
          buyToken.address,
        ],
      });

      const gelatoAction = {
        inst: actionWithdrawBatchExchange.address,
        data: withdrawPayload,
        operation: OPERATION.delegatecall,
        value: 0,
        termsOkCheck: true,
      };

      tx = await userProxy.execGelatoAction(gelatoAction);
      txResponse = await tx.wait();

      const feeAmount = ethers.utils.parseUnits(
        FEE_USD.toString(),
        sellDecimals
      );

      const providerBalance = await sellToken.balanceOf(providerAddress);
      expect(providerBalance).to.be.equal(feeAmount);

      const sellerBalanceAfter = await sellToken.balanceOf(sellerAddress);
      expect(ethers.utils.bigNumberify(sellerBalanceAfter)).to.be.equal(
        ethers.utils
          .bigNumberify(sellerBalanceBefore)
          .add(ethers.utils.bigNumberify(withdrawAmount))
          .sub(ethers.utils.bigNumberify(feeAmount))
      );
    });

    it("Case #6: 1 sellToken (WETH) withdrawable, No buyTokens withdrawable", async function () {
      const withdrawAmount = ethers.utils.parseUnits("10", wethDecimals);

      const sellerBalanceBefore = await WETH.balanceOf(sellerAddress);

      // 3. MockBatchExchange Set withdraw amount
      tx = await mockBatchExchange.setWithdrawAmount(
        WETH.address,
        withdrawAmount
      );
      await tx.wait();

      const withdrawPayload = await run("abi-encode-withselector", {
        contractname: "ActionWithdrawBatchExchange",
        functionname: "action",
        inputs: [
          sellerAddress,
          userProxyAddress,
          WETH.address,
          buyToken.address,
        ],
      });

      const gelatoAction = {
        inst: actionWithdrawBatchExchange.address,
        data: withdrawPayload,
        operation: OPERATION.delegatecall,
        value: 0,
        termsOkCheck: true,
      };

      tx = await userProxy.execGelatoAction(gelatoAction);
      txResponse = await tx.wait();

      const feeAmount = FEE_ETH.toString();

      const providerBalance = await WETH.balanceOf(providerAddress);
      expect(providerBalance).to.be.equal(feeAmount);

      const sellerBalanceAfter = await WETH.balanceOf(sellerAddress);
      expect(ethers.utils.bigNumberify(sellerBalanceAfter)).to.be.equal(
        ethers.utils
          .bigNumberify(sellerBalanceBefore)
          .add(ethers.utils.bigNumberify(withdrawAmount))
          .sub(ethers.utils.bigNumberify(feeAmount))
      );
    });

    it("Case #7: Insufficient sellTokens withdrawable and insufficient buyTokens withdrawable", async function () {
      const withdrawAmount = ethers.utils.parseUnits("1.5", sellDecimals);

      const sellerBalanceBefore = await sellToken.balanceOf(sellerAddress);

      // 3. MockBatchExchange Set withdraw amount
      tx = await mockBatchExchange.setWithdrawAmount(
        sellToken.address,
        withdrawAmount
      );
      await tx.wait();

      const withdrawPayload = await run("abi-encode-withselector", {
        contractname: "ActionWithdrawBatchExchange",
        functionname: "action",
        inputs: [
          sellerAddress,
          userProxyAddress,
          sellToken.address,
          buyToken.address,
        ],
      });

      const gelatoAction = {
        inst: actionWithdrawBatchExchange.address,
        data: withdrawPayload,
        operation: OPERATION.delegatecall,
        value: 0,
        termsOkCheck: true,
      };
      await expect(userProxy.execGelatoAction(gelatoAction)).to.be.revertedWith(
        "GelatoUserProxy.delegatecallAction:ActionWithdrawBatchExchange: Insufficient balance for user to pay for withdrawal 1"
      );

      const providerBalance = await sellToken.balanceOf(providerAddress);
      expect(providerBalance).to.be.equal(0);

      const sellerBalanceAfter = await sellToken.balanceOf(sellerAddress);
      expect(ethers.utils.bigNumberify(sellerBalanceAfter)).to.be.equal(
        ethers.utils.bigNumberify(sellerBalanceBefore)
      );
    });

    it("Case #8: Insufficient sellTokens (WETH) withdrawable and insufficient buyTokens withdrawable", async function () {
      // withdraw amount == any amount smaller than the required FEE (insufficient)
      const withdrawAmount = FEE_ETH - 100000;

      const sellerBalanceBefore = await WETH.balanceOf(sellerAddress);

      // 3. MockBatchExchange Set withdraw amount
      tx = await mockBatchExchange.setWithdrawAmount(
        WETH.address,
        withdrawAmount
      );
      await tx.wait();

      const withdrawPayload = await run("abi-encode-withselector", {
        contractname: "ActionWithdrawBatchExchange",
        functionname: "action",
        inputs: [
          sellerAddress,
          userProxyAddress,
          WETH.address,
          buyToken.address,
        ],
      });

      const gelatoAction = {
        inst: actionWithdrawBatchExchange.address,
        data: withdrawPayload,
        operation: OPERATION.delegatecall,
        value: 0,
        termsOkCheck: true,
      };

      await expect(userProxy.execGelatoAction(gelatoAction)).to.be.revertedWith(
        "GelatoUserProxy.delegatecallAction:ActionWithdrawBatchExchange: Insufficient balance for user to pay for withdrawal 1"
      );

      const providerBalance = await WETH.balanceOf(providerAddress);
      expect(providerBalance).to.be.equal(0);

      const sellerBalanceAfter = await WETH.balanceOf(sellerAddress);
      expect(ethers.utils.bigNumberify(sellerBalanceAfter)).to.be.equal(
        ethers.utils.bigNumberify(sellerBalanceBefore)
      );
    });
  });
});
