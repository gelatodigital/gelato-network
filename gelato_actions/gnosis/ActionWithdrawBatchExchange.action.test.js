// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");
const { run, ethers } = require("@nomiclabs/buidler");
const FEE_USD = 2;
const FEE_ETH = 9000000000000000;

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
  let userProxy;
  let sellerAddress;
  let providerAddress;
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

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    MockBatchExchange = await ethers.getContractFactory("MockBatchExchange");
    ActionWithdrawBatchExchange = await ethers.getContractFactory(
      "ActionWithdrawBatchExchange"
    );
    MockERC20 = await ethers.getContractFactory("MockERC20");
    GelatoUserProxyFactory = await ethers.getContractFactory(
      "GelatoUserProxyFactory"
    );

    [seller, provider] = await ethers.getSigners();
    sellerAddress = await seller.getAddress();
    providerAddress = await provider.getAddress();

    // Deploy MockBatchExchange action
    mockBatchExchange = await MockBatchExchange.deploy();
    await mockBatchExchange.deployed();

    gelatoUserProxyFactory = await GelatoUserProxyFactory.deploy(
      mockBatchExchange.address
    );
    await gelatoUserProxyFactory.deployed();

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

      tx = await userProxy.delegatecallGelatoAction(
        actionWithdrawBatchExchange.address,
        withdrawPayload
      );
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

      tx = await userProxy.delegatecallGelatoAction(
        actionWithdrawBatchExchange.address,
        withdrawPayload
      );
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

      await expect(
        userProxy.delegatecallGelatoAction(
          actionWithdrawBatchExchange.address,
          withdrawPayload
        )
      ).to.be.revertedWith(
        "GelatoUserProxy.delegatecallGelatoAction:ActionWithdrawBatchExchange: Insufficient balance for user to pay for withdrawal 2"
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

      await expect(
        userProxy.delegatecallGelatoAction(
          actionWithdrawBatchExchange.address,
          withdrawPayload
        )
      ).to.be.revertedWith(
        "GelatoUserProxy.delegatecallGelatoAction:ActionWithdrawBatchExchange: Insufficient balance for user to pay for withdrawal 2"
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

      tx = await userProxy.delegatecallGelatoAction(
        actionWithdrawBatchExchange.address,
        withdrawPayload
      );
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

      tx = await userProxy.delegatecallGelatoAction(
        actionWithdrawBatchExchange.address,
        withdrawPayload
      );
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

      await expect(
        userProxy.delegatecallGelatoAction(
          actionWithdrawBatchExchange.address,
          withdrawPayload
        )
      ).to.be.revertedWith(
        "GelatoUserProxy.delegatecallGelatoAction:ActionWithdrawBatchExchange: Insufficient balance for user to pay for withdrawal 1"
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

      await expect(
        userProxy.delegatecallGelatoAction(
          actionWithdrawBatchExchange.address,
          withdrawPayload
        )
      ).to.be.revertedWith(
        "GelatoUserProxy.delegatecallGelatoAction:ActionWithdrawBatchExchange: Insufficient balance for user to pay for withdrawal 1"
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
