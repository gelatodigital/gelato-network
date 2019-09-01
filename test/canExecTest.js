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
  let totalPrepayment;
  let decodedPayload;
  let decodedPayloads = {}
  let definedExecutionTimeBN;

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
          parseInt(lastExecutionClaimId) - parseInt(numberOfSubOrders) + 1;

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

    it("fetch executionClaim payload", async() => {
      let encodedPayload = await gelatoCore.contract.methods
        .getClaimPayload(nextExecutionClaim)
        .call();
      let arrayPayload = [...encodedPayload];
      let returnedPayloadSize = "";
      let returnedFuncSelec = "";
      let returnedDataPayload = "";
      for (let i = 0; i < encodedPayload.length; i++) {
        if (i < 10) {
          returnedFuncSelec = returnedFuncSelec.concat(encodedPayload[i]);
        } else {
          returnedDataPayload = returnedDataPayload.concat(encodedPayload[i]);
        }
      }

      console.log(`Returned Payload Size: ${returnedPayloadSize}`);
      console.log(`Returned Payload Size: ${returnedPayloadSize.length}`);
      console.log("---");
      console.log(`Returned Func Selec: ${returnedFuncSelec}`);
      console.log(`Returned Func Selec: ${returnedFuncSelec.length}`);
      console.log("---");
      console.log(`Returned Data Payload: ${returnedDataPayload}`);
      console.log(
        `Returned Data Payload Length: ${returnedDataPayload.length}`
      );
      console.log("---");
      console.log(`Returned whole encoded payload: ${encodedPayload}`);
      console.log(
        `Returned whole encoded payload length: ${encodedPayload.length}`
      );
      decodedPayload = web3.eth.abi.decodeParameters(
        [
          {
            type: "uint256",
            name: "_executionClaimId"
          },
          {
            type: "address",
            name: "_sellToken"
          },
          {
            type: "address",
            name: "_buyToken"
          },
          {
            type: "uint256",
            name: "_amount"
          },
          {
            type: "uint256",
            name: "_executionTime"
          },
          {
            type: "uint256",
            name: "_prepaymentPerSellOrder"
          }
        ],
        returnedDataPayload
      );

      console.log("Decoded Payload: decodedPayload ", decodedPayload);
      decodedPayloads[nextExecutionClaim] = decodedPayload

    })




    it("Set correct depositAndSell claim & withdraw claim", async() => {
      // Get the current execution claim on the core
      // // Assuming we get an depositAndSell claim
      // let sellOrderTest = await gelatoDutchExchange.contract.methods.sellOrders(nextExecutionClaim + 1, nextExecutionClaim).call()
      // // It's a withdraw claim
      // if (sellOrderTest.amount === '0')
      // {
      //   depositAndSellClaim = nextExecutionClaim - 1;
      //   withdrawClaim  = nextExecutionClaim;
      // }
      // else
      // {
      //   depositAndSellClaim = nextExecutionClaim;
      //   withdrawClaim  = nextExecutionClaim + 1;
      // }
      // assert.isTrue(true);
    })

    it("Check if execution claim is executable based on its execution Time, if not, test that execution reverts and fast forward", async () => {

      let sellOrderExecutionTime = decodedPayload._executionTime

      // Fetch time
      let blockNumber = await web3.eth.getBlockNumber();
      let block = await web3.eth.getBlock(blockNumber);
      let beforeTimeTravel = block.timestamp;

      let secondsUntilExecution  = sellOrderExecutionTime - beforeTimeTravel

      // console.log(`
      //              Claim is executable at: ${sellOrderExecutionTime}.
      //              Current Time: ${beforeTimeTravel}
      //              Difference: ${secondsUntilExecution}`);

      // If execution Time of claim is in the future, we execute and expect a revert and then fast forward in time to the execution time
      if(parseInt(secondsUntilExecution) > 0)
      {

        let canExecuteReturn = await gelatoCore.contract.methods.canExecute(nextExecutionClaim).call()
        let returnStatus = canExecuteReturn[0].toString(10)
        let dappInterfaceAddress = canExecuteReturn[1].toString(10)
        let payload = canExecuteReturn[2].toString(10)
        console.log(`
          Return Status: ${returnStatus}
          dappInterfaceAddress: ${dappInterfaceAddress}
          payload: ${payload}
          `)
        assert.equal(parseInt(returnStatus), 1);

        // fast forward
        await timeTravel.advanceTimeAndBlock(secondsUntilExecution);
        // console.log(`Time travelled ${secondsUntilExecution} seconds`)

      }

      // Fetch current time again, in case we fast forwarded in time
      let blockNumber2 = await web3.eth.getBlockNumber();
      let block2 = await web3.eth.getBlock(blockNumber2);
      let afterTimeTravel = block2.timestamp;

      // Check if execution claim is executable
      // assert.equal(executionTime + 15, claimsExecutionTime.toString(), `${claimsExecutionTime} should be equal to the execution time we set + 15 seconds`)
      let claimsExecutionTimeBN = new BN(sellOrderExecutionTime.toString());
      let afterTimeTravelBN = new BN(afterTimeTravel);
      let claimIsExecutable = afterTimeTravelBN.gte(claimsExecutionTimeBN);
      // Check if execution claim is executable, i.e. lies in the past
      assert.isTrue(
        claimIsExecutable,
        `${afterTimeTravel} should be greater than ${claimsExecutionTimeBN.toString()}`
      );
    });

    it("Check if the execution claim is executable calling canExec in core", async () => {
      let canExecuteReturn = await gelatoCore.contract.methods.canExecute(nextExecutionClaim).call()
      let returnStatus = canExecuteReturn[0].toString(10)
      let dappInterfaceAddress = canExecuteReturn[1].toString(10)
      let payload = canExecuteReturn[2].toString(10)
      console.log(`
        Return Status: ${returnStatus}
        dappInterfaceAddress: ${dappInterfaceAddress}
        payload: ${payload}
        `)
      assert.equal(parseInt(returnStatus), 0);
    })
  });
