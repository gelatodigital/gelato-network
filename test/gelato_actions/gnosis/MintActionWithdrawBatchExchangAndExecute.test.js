// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");
const FEE_USD = 2;
const FEE_ETH = 9000000000000000;
const GELATO_GAS_PRICE = utils.parseUnits("9", "gwei");

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
  let seller;
  let provider;
  let executor;
  let userProxy;
  let sellerAddress;
  let providerAddress;
  let executorAddress;
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
  let gelatoCore;
  let providerModuleGelatoUserProxy;
  let providerModuleGelatoUserProxyAddress;

  beforeEach(async function () {
    // Setup Gelato System
    const result = await run("setupgelato-gelatouserproxies", {
      actions: ["ActionERC20TransferFrom", "ActionERC20TransferFrom"],
    });
    gelatoCore = result.gelatoCore;
    gelatoUserProxyFactory = result.gelatoUserProxyFactory;
    providerModuleGelatoUserProxy = result.providerModuleGelatoUserProxy;
    providerModuleGelatoUserProxyAddress =
      providerModuleGelatoUserProxy.address;

    // Get the ContractFactory and Signers here.
    MockBatchExchange = await ethers.getContractFactory("MockBatchExchange");
    ActionWithdrawBatchExchange = await ethers.getContractFactory(
      "ActionWithdrawBatchExchange"
    );
    MockERC20 = await ethers.getContractFactory("MockERC20");
    GelatoUserProxyFactory = await ethers.getContractFactory(
      "GelatoUserProxyFactory"
    );

    [seller, executor, provider] = await ethers.getSigners();
    sellerAddress = await seller.getAddress();
    providerAddress = await provider.getAddress();
    executorAddress = await executor.getAddress();

    // Deploy MockBatchExchange action
    mockBatchExchange = await MockBatchExchange.deploy();
    await mockBatchExchange.deployed();

    // string memory _name, uint256 _mintAmount, address _to, uint8 _decimals
    // Deploy Sell Token
    sellDecimals = 18;
    sellToken = await MockERC20.deploy(
      "DAI",
      (100 * 10 ** sellDecimals).toString(),
      sellerAddress,
      sellDecimals
    );
    await sellToken.deployed();

    // Deploy Buy Token
    buyDecimals = 6;
    buyToken = await MockERC20.deploy(
      "USDC",
      (100 * 10 ** buyDecimals).toString(),
      sellerAddress,
      buyDecimals
    );
    await buyToken.deployed();

    // Deploy WETH
    wethDecimals = 18;
    WETH = await MockERC20.deploy(
      "WETH",
      (100 * 10 ** wethDecimals).toString(),
      sellerAddress,
      wethDecimals
    );
    await WETH.deployed();

    // address _batchExchange, address _weth, address _gelatoProvider
    // Deploy Withdraw action
    actionWithdrawBatchExchange = await ActionWithdrawBatchExchange.deploy(
      mockBatchExchange.address,
      WETH.address,
      providerAddress
    );
    await actionWithdrawBatchExchange.deployed();

    // Create User Proxy

    // 2. Create Proxy for seller
    tx = await gelatoUserProxyFactory.create();
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

    // Whitelist action by provider
    await gelatoCore.connect(provider).provideActions([
      {
        addresses: [actionWithdrawBatchExchange.address],
        gasPriceCeil: ethers.utils.parseUnits("100", "gwei"),
      },
    ]);
  });

  // We test different functionality of the contract as normal Mocha tests.
  describe("GelatoCore.Exec", function () {
    it("Successfully mint and execute ActionWithdrawBatchExchange execClaim", async function () {
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

      const actionPayload = await run("abi-encode-withselector", {
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
      let task = {
        provider: providerAddress,
        providerModule: providerModuleGelatoUserProxyAddress,
        condition: ethers.constants.AddressZero,
        actions: [actionWithdrawBatchExchange.address],
        conditionPayload: ethers.constants.HashZero,
        actionsPayload: [actionPayload],
        expiryDate: 0,
      };

      let execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      // Should return "Ok"

      const isProvided = await gelatoCore.isConditionActionProvided(execClaim);

      const mintPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "mintExecClaim",
        inputs: [task],
      });

      // LogExecClaimMinted(executor, execClaim.id, hashedExecClaim, execClaim);

      await expect(
        userProxy.callAction(gelatoCore.address, mintPayload)
      ).to.emit(gelatoCore, "LogExecClaimMinted");

      expect(await gelatoCore.canExec(execClaim, GELATO_GAS_PRICE)).to.be.equal(
        "ActionTermsNotOk:ActionWithdrawBatchExchange: Sell Token not withdrawable yet"
      );

      // LogCanExecFailed
      // await expect(gelatoCore.setExecClaimTenancy(69420))
      //   .to.emit(gelatoCore, "LogSetExecClaimTenancy")
      //   .withArgs(initialState.execClaimTenancy, 69420);

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

    it("Mint ActionWithdraw and revert in execution due to insufficient withdraw balance", async function () {
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

      const actionPayload = await run("abi-encode-withselector", {
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
      let task = {
        provider: providerAddress,
        providerModule: providerModuleGelatoUserProxyAddress,
        condition: ethers.constants.AddressZero,
        actions: [actionWithdrawBatchExchange.address],
        conditionPayload: ethers.constants.HashZero,
        actionsPayload: [actionPayload],
        expiryDate: 0,
      };

      let execClaim = {
        id: 1,
        userProxy: userProxyAddress,
        task,
      };

      // Should return "Ok"
      const isProvided = await gelatoCore.isConditionActionProvided(execClaim);

      const mintPayload = await run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "mintExecClaim",
        inputs: [task],
      });

      await expect(
        userProxy.callAction(gelatoCore.address, mintPayload)
      ).to.emit(gelatoCore, "LogExecClaimMinted");

      expect(await gelatoCore.canExec(execClaim, GELATO_GAS_PRICE)).to.be.equal(
        "ActionTermsNotOk:ActionWithdrawBatchExchange: Sell Token not withdrawable yet"
      );

      // LogCanExecFailed
      // await expect(gelatoCore.setExecClaimTenancy(69420))
      //   .to.emit(gelatoCore, "LogSetExecClaimTenancy")
      //   .withArgs(initialState.execClaimTenancy, 69420);

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
      ).to.emit(gelatoCore, "LogExecFailed");

      const feeAmount = FEE_USD * 10 ** buyDecimals;

      const providerBalance = await buyToken.balanceOf(providerAddress);
      expect(providerBalance).to.be.equal(ethers.utils.bigNumberify("0"));
      const sellerBalanceAfter = await buyToken.balanceOf(sellerAddress);

      expect(ethers.utils.bigNumberify(sellerBalanceAfter)).to.be.equal(
        ethers.utils.bigNumberify(sellerBalanceBefore)
        // .add(ethers.utils.bigNumberify(withdrawAmount))
        // .sub(ethers.utils.bigNumberify(feeAmount))
      );
    });
  });
});
