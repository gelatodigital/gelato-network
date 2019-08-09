let {
    numberOfSubOrders,
    GelatoCore,
    GelatoDutchX,
    SellToken,
    BuyToken,
    DutchExchangeProxy,
    DutchExchange,
    timeTravel,
    MAXGAS,
    BN,
    NUM_SUBORDERS_BN,
    GELATO_GAS_PRICE_BN,
    TOTAL_SELL_VOLUME,
    SUBORDER_SIZE_BN,
    INTERVAL_SPAN,
    GDXSSAW_MAXGAS_BN,
    GELATO_PREPAID_FEE_BN,
    dutchExchangeProxy,
    dutchExchange,
    seller,
    accounts,
    sellToken,
    buyToken,
    gelatoDutchXContract,
    gelatoCore,
    gelatoCoreOwner,
    orderId,
    orderState,
    executionTime,
    interfaceOrderId,
    executionClaimIds,
    MSG_VALUE_BN,
    execShellCommand,
    DxGetter,
    execShellCommandLog,
    truffleAssert,
    userEthBalance,
    userSellTokenBalance,
    userBuyTokenBalance,
    executorEthBalance
  } = require("./truffleTestConfig.js");

  let txHash;
  let txReceipt;
  let revertExecutor;
  let amountReceivedByExecutor;
  let amountDeductedfromInterface;
  let nextExecutionClaim;
  let depositAndSellClaim;
  let withdrawClaim;
  let sellOrder;

describe("Cancel outstanding execution claims", () => {
    // ******** Deploy new instances Test ********
    before(async () => {
        gelatoDutchExchange = await GelatoDutchX.deployed();
        dutchExchangeProxy = await DutchExchangeProxy.deployed();
        dutchExchange = await DutchExchange.deployed();
        gelatoCore = await GelatoCore.deployed();
        sellToken = await SellToken.deployed();
        buyToken = await BuyToken.deployed();
        dxGetter = await DxGetter.deployed();
        accounts = await web3.eth.getAccounts();
        gelatoCoreOwner = await gelatoCore.contract.methods.owner().call();
        seller = accounts[2]; // account[2]
        revertExecutor = accounts[8]
        executor = accounts[9];
    });

    it("Fetch Before Balance", async function() {
        // Fetch User Ether Balance
        userEthBalance = await web3.eth.getBalance(seller);
        // Fetch User SellToken Balance
        userSellTokenBalance = await sellToken.contract.methods
        .balanceOf(seller)
        .call();
        // Fetch User BuyToken Balance
        userBuyTokenBalance = new BN(await buyToken.contract.methods
        .balanceOf(seller)
        .call());
        // Fetch Executor Ether Balance
        executorEthBalance = await web3.eth.getBalance(executor);
    });

    it("fetch the correct executionClaimId to execute", async () => {
        // Get the current execution claim on the core
        let lastExecutionClaimId = await gelatoCore.contract.methods
        .getCurrentExecutionClaimId()
        .call();
        // Get the first execution claim minted in by the mint test
        nextExecutionClaim =
        parseInt(lastExecutionClaimId) - parseInt(numberOfSubOrders) * 2 + 1;

        // Fetch owner of executionClaim, if address(0) gets returned, we it already was executed and we try the next
        let mustNotBeZero = "0x0";
        while (mustNotBeZero === "0x0") {
        try {
            mustNotBeZero = await gelatoCore.contract.methods
            .ownerOf(nextExecutionClaim)
            .call();
        } catch (err) {
            nextExecutionClaim = nextExecutionClaim + 1;
        }
        }
        console.log(`ExecutionClaimID: ${nextExecutionClaim}`);
        assert.isTrue(true);
    });

    it("Set correct depositAndSell claim & withdraw claim", async () => {
        // Get the current execution claim on the core
        // Assuming we get an depositAndSell claim
        let sellOrderTest = await gelatoDutchExchange.contract.methods
        .sellOrders(nextExecutionClaim + 1, nextExecutionClaim)
        .call();
        // It's a withdraw claim
        if (sellOrderTest.amount === "0") {
            depositAndSellClaim = nextExecutionClaim - 1;
            withdrawClaim = nextExecutionClaim;
        }
        else
        {
            depositAndSellClaim = nextExecutionClaim;
            withdrawClaim = nextExecutionClaim + 1;
        }
        assert.isTrue(true);
    });

    it("Cancel Action from someone other than the seller should revert", async () => {
        // Cancel executionClaim
        txReceipt = await truffleAssert.reverts(gelatoDutchExchange.contract.methods.cancelOrder(nextExecutionClaim)
        .send( {from: revertExecutor, gas: 300000} ));

    })

    it("Cancel Claim pair", async () => {
        sellOrder = await gelatoDutchExchange.contract.methods
        .sellOrders(withdrawClaim, depositAndSellClaim)
        .call();
        let amount = sellOrder.amount;
        let orderStateId = sellOrder.orderStateId;
        let orderState = await gelatoDutchExchange.contract.methods
        .orderStates(orderStateId)
        .call();

        // Cancel executionClaim
        txReceipt = await gelatoDutchExchange.contract.methods.cancelOrder(nextExecutionClaim)
        .send( {from: seller, gas: 300000} );

        console.log(txReceipt)

        await gelatoDutchExchange.getPastEvents("LogOrderCancelled", (error, events) => {
            console.log(events)
        })

        // Fetch User SellToken Balance
        userSellTokenBalanceAfter = await sellToken.contract.methods
        .balanceOf(seller)
        .call();

        let userSellTokenBalanceAfterBN = new BN(userSellTokenBalanceAfter.toString())
        console.log(userSellTokenBalanceAfter.toString())
        console.log(SUBORDER_SIZE_BN.toString())

        let amountsAreEqual = userSellTokenBalanceAfterBN.eq(SUBORDER_SIZE_BN)

        // CHECK: userSellTokenBalanceAfter must equal subOrderSizeBN
        assert.isTrue(amountsAreEqual, "Withdraw amount should equal SubOrderSize")



    });

    it("What happened in this test?", async function() {

        // Fetch User Ether Balance
        userEthBalanceAfter = await web3.eth.getBalance(seller);

        // Fetch User BuyToken Balance
        userBuyTokenBalanceAfter = await buyToken.contract.methods
        .balanceOf(seller)
        .call();
        // Fetch Executor Ether Balance
        executorEthBalanceAfter = await web3.eth.getBalance(executor);


        console.log(`
        ***************************************************+

        SELLER BALANCE:
            ETH Balances Before:  ${userEthBalance / 10 ** 18} ETH
            ETH Balances After:   ${userEthBalanceAfter / 10 ** 18} ETH
            -----------
            Difference:           ${(userEthBalanceAfter - userEthBalance) / 10 ** 18} ETH

            WETH Balance Before:  ${userSellTokenBalance / 10 ** 18} WETH
            WETH Balance After:   ${userSellTokenBalanceAfter / 10 ** 18} WETH
            -----------
            Difference:           ${(userSellTokenBalanceAfter - userSellTokenBalance) / 10 ** 18} WETH

            ICE Balance Before:   ${userBuyTokenBalance / 10 ** 18} ICE
            ICE Balance After:    ${userBuyTokenBalanceAfter / 10 ** 18} ICE
            -----------
            Difference:           ${(userBuyTokenBalanceAfter  - userBuyTokenBalance) / 10 ** 18} ICE

        EXECUTOR BALANCE:
            ETH Balance Before:   ${executorEthBalance / 10 ** 18} ETH
            ETH Balance After:    ${executorEthBalanceAfter / 10 ** 18} ETH
            -----------
            Difference:           ${(executorEthBalanceAfter - executorEthBalance) / 10 ** 18} ETH

        ***************************************************+

        `);

        assert.isTrue(true);
    });

});
