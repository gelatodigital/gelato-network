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

describe("TEST RESUME", () => {
  it("END - RESUME", async function() {
    accounts = await web3.eth.getAccounts();
    seller = accounts[2];
    executor = accounts[9];
    // Fetch User Ether Balance
    userEthBalanceAfter = await web3.eth.getBalance(seller);
    // Fetch User SellToken Balance
    userSellTokenBalanceAfter = await sellToken.contract.methods
      .balanceOf(seller)
      .call();
    // Fetch User BuyToken Balance
    userBuyTokenBalanceAfter = await buyToken.contract.methods
      .balanceOf(seller)
      .call();
    // Fetch Executor Ether Balance
    executorEthBalanceAfter = await web3.eth.getBalance(executor);

    let hunderdEth = web3.utils.toWei("100", "ether");
    let twentyWeth = TOTAL_SELL_VOLUME;
    userBuyTokenBalance = 0;
    userSellTokenBalance = twentyWeth;
    userEthBalance = hunderdEth;
    executorEthBalance = hunderdEth;
    console.log(`
            ***************************************************+

            TOTAL OUTCOME OF THIS TEST

            SELLER BALANCE:
                ETH Balances Before:  ${userEthBalance / 10 ** 18} ETH
                ETH Balances After:   ${userEthBalanceAfter / 10 ** 18} ETH
                -----------
                Difference:           ${(userEthBalanceAfter - userEthBalance) /
                  10 ** 18} ETH

                WETH Balance Before:  ${userSellTokenBalance / 10 ** 18} WETH
                WETH Balance After:   ${userSellTokenBalanceAfter /
                  10 ** 18} WETH
                -----------
                Difference:           ${(userSellTokenBalanceAfter -
                  userSellTokenBalance) /
                  10 ** 18} WETH

                ICE Balance Before:   ${userBuyTokenBalance / 10 ** 18} ICE🍦
                ICE Balance After:    ${userBuyTokenBalanceAfter /
                  10 ** 18} ICE🍦
                -----------
                Difference:           ${(userBuyTokenBalanceAfter -
                  userBuyTokenBalance) /
                  10 ** 18} ICE🍦

            EXECUTOR BALANCE:
                ETH Balance Before:   ${executorEthBalance / 10 ** 18} ETH
                ETH Balance After:    ${executorEthBalanceAfter / 10 ** 18} ETH
                -----------
                Difference:           ${(executorEthBalanceAfter -
                  executorEthBalance) /
                  10 ** 18} ETH

            ***************************************************+

            TOTAL OUTCOME OF THIS TEST

            ***************************************************+

            END OF TEST 🍦🍦🍦🍦🍦🍦🍦🍦🍦🍦🍦🍦🍦🍦🍦🍦🍦🍦
        `);
  });
});
