let {GelatoCore,
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
    commandLine,
    executeTestScript} = require('./truffleTestConfig.js')
    require('dotenv').config()

    describe("successfully executes claim", () => {
        // ******** Deploy new instances Test ********
        before(async () => {
            gelatoDutchXContract = await GelatoDutchX.deployed()
            dutchExchangeProxy = await DutchExchangeProxy.deployed()
            dutchExchange = await DutchExchange.deployed()
            gelatoCore = await GelatoCore.deployed();
            sellToken = await SellToken.deployed();
            buyToken = await BuyToken.deployed();
            gelatoCoreOwner = await gelatoCore.contract.methods.owner().call();
            accounts = await web3.eth.getAccounts();
            seller = accounts[2]; // account[2]

        });

        it("Successfully conduct a manual withdraw", async function() {
            let copyEnv = [...process.env['EXECUTION_CLAIM'], process.env['CLAIM_STATE_ID']]
            // Execute first claim
            let executionClaim = copyEnv[0]
            let claimStateId = copyEnv[1]
            
            let balanceBefore
            await buyToken.balanceOf(seller)
            .then(result => balanceBefore = result.toString())

            let txReceipt = await gelatoDutchXContract.contract.methods.withdrawManually(executionClaim)
            .send( {from: seller })

            let balanceAfter
            await buyToken.balanceOf(seller)
            .then(result => balanceAfter = result.toString())

            console.log(balanceBefore)
            console.log(balanceAfter)

            assert.exists(txReceipt, "manual withdraw function has to go through")

        });
    })