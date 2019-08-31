// Exec Test

/*
 */

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
    orderStateId,
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
  let nextExecutionClaim
  let depositAndSellClaim
  let withdrawClaim
  let sellOrder;

  describe("Successfully execute first execution claim", () => {
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
      seller = accounts[2];
      revertExecutor = accounts[8]
      executor = accounts[9];
    });

    it("fetch the correct executionClaimId to execute", async() => {
        // Get the current execution claim on the core
        let lastExecutionClaimId = await gelatoCore.contract.methods
          .getCurrentExecutionClaimId()
          .call();
        // Get the first execution claim minted in by the mint test
        nextExecutionClaim =
          parseInt(lastExecutionClaimId) - (parseInt(numberOfSubOrders) * 2) + 1;

        // Fetch owner of executionClaim, if address(0) gets returned, we it already was executed and we try the next
        let mustNotBeZero = "0x0";
        while (mustNotBeZero === "0x0")
        {
          try
          {
            mustNotBeZero = await gelatoCore.contract.methods.ownerOf(nextExecutionClaim).call()
          }
          catch(err)
          {
            nextExecutionClaim = nextExecutionClaim + 1
          }

        }
        console.log(`ExecutionClaimID: ${nextExecutionClaim}`)
        assert.isTrue(true);
    })

    it("Check if first two execution claims are executable calling canExec in core", async () => {
        let canExecuteReturn = await gelatoCore.contract.methods.canExecute(nextExecutionClaim).call()
        console.log(`Return Value EC ${nextExecutionClaim}: ${canExecuteReturn.toString()}`)
        assert.equal(parseInt(canExecuteReturn), 0);
    })
  });
