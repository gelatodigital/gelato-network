/* Gelato executeSubOrder script
    @dev: This script should only be run with the sellOrderHash
    that is printed to stdout when running the createSellOrder.js script.
    Terminal command to run this script:
    Terminal Window 1: watch this for stdout from Gelato.sol
    * yarn rpc
    Terminal Window2: watch this for stdout from execSubOrder.js file.
    * yarn setup
    * truffle exec ./createSellOrder.js
    * yarn cli deposit 100 WETH
    * yarn cli withdraw 100 WETH
    * truffle exec ./execSubOrder.js <sellOrderHash>
*/
// Truffle Artifacts/contract interfaces
// Requires
const Gelato = artifacts.require('Gelato');
const SellToken = artifacts.require('EtherToken')
const BuyToken = artifacts.require('TokenRDN')

// Token addresses
const BUY_TOKEN = BuyToken.address
const SELL_TOKEN = SellToken.address

// Big Number stuff
const BN = web3.utils.BN;

// Command line arguments
const sellOrderHash = process.argv[4];

// Constants
const GAS_PRICE = new BN('5000000000');

// Print commandline args to stdout
console.log(`process.argv[0]: ${process.argv[0]}`);
console.log(`process.argv[1]: ${process.argv[1]}`);
console.log(`process.argv[2]: ${process.argv[2]}`);
console.log(`process.argv[3]: ${process.argv[3]}`);
console.log(`
    ==================================================
`);
console.log(`process.argv[4]: ${process.argv[4]}`);

module.exports = () => {

    async function execSubOrder() {

        // Extract local instance of hashed Gelato sell order
        const gelato = await Gelato.at(Gelato.address);
        let sellOrder = await gelato.sellOrders(sellOrderHash);
        console.log(`Sell Order Hash: ${sellOrderHash}
        ==================================================
        `);

        console.log(`
                  Sell Order on-chain
                  -------------------
        `)
        console.log(sellOrder);
        console.log(`
        ==================================================
        `);

        // Starting
        console.log(`
                ...Starting Gelato execSubOrder script
        ==================================================
                Checking CLI inputted sell order hash:
                -------------------------------------
        Sell Order Hash: ${sellOrderHash}
        ==================================================
        `);

        // Extract block info
        const block = await web3.eth.getBlockNumber();
        const blockDetails = await web3.eth.getBlock(block);
        const timestamp = blockDetails.timestamp;
        console.log(`
                        Block Info:
                        ----------
        Current Timestamp:      ${timestamp}
        Current Timestamp Time: ${new Date(timestamp).toTimeString()}
        Current Timestamp Date: ${new Date(timestamp).toDateString()}
        ==================================================
        `);

        // Setting variables to benchmark seller BUY_TOKEN balance before the tx
        const accounts = await web3.eth.getAccounts()

        // Define Seller & Executor
        const executor = accounts[1];
        const seller = accounts[9]

        // Define Buy ERC20 Contract
        const buyTokenContract = await BuyToken.at(BUY_TOKEN)


        console.log(`Seller:                             ${seller}`)

        // Fetch Executor Before balance
        let executorBalancePreExec = await web3.eth.getBalance(executor);
        executorBalancePreExec = new BN(executorBalancePreExec);
        console.log(`executorBalancePreExec:             ${executorBalancePreExec}`);

        // Fetch Seller Before balance
        const buyBalanceBefore = await buyTokenContract.balanceOf(seller)
        console.log(`Sellers RDN balance before:         ${buyBalanceBefore / (10 ** 18)}`)

        // Starting the suborder execution phase
        console.log(`
        .......executing 1st subOrder from ${executor}
        ==================================================
        ||||||||||||||||||||||||||||||||||||||||||||||||||
        ||||||||||||✋Gelato requirements wall✋||||||||||||
        ||||||||||||||||||||||||||||||||||||||||||||||||||
        ==================================================
        `);

        // Executor sends the executeSubOrder transaction
        let executionReceipt = await gelato.executeSubOrderAndWithdraw(sellOrderHash, { from: executor });

        console.log(`
                    *** sub order executed ***
                    😎 😎 GREAT SUCCESS! 😎 😎
        ==================================================
                    executeSubOrder TX Receipt
                    -------------------------
        `);

        console.log(`
        ==================================================
                Executor Account Info BEFORE subOrder execution:
                ------------------------------------------------
            Executor Account:         ${executor}
            Executor Account Balance | =======================|
                BEFORE execution: > ${web3.utils.fromWei(executorBalancePreExec, "finney")} finney |
                                    | =======================|
        `);

        /* Calculate executor reward:
            * Calculate gas costs
            * Calculate executor reward with gas cost factored in
        */

        // ############## Tx Executor variables ##############
        const gasUsed = new BN(executionReceipt.receipt.gasUsed.toString());

        let gasCost = gasUsed.mul(GAS_PRICE);

        let executorBalancePostExec = await web3.eth.getBalance(executor);
        executorBalancePostExec = new BN(executorBalancePostExec);

        const executorTradeBalance = executorBalancePostExec.sub(executorBalancePreExec);

        console.log(`gasUsed:                    ${gasUsed}`);
        console.log(`gasPrice:                   ${GAS_PRICE}`);

        console.log(`gasCost:                    ${gasCost}`);
        console.log(`gasCostFinney               ${web3.utils.fromWei(gasCost, "finney")} finney`);
        console.log(`note:
        * gasCost based on yarn rpc gas price of: 20000000000 wei
        However: This gas cost is not actually observed when testing.
        `);

        console.log(`executorBalancePostExec:    ${executorBalancePostExec}`);
        console.log(`executorBalancePostExec:    ${web3.utils.fromWei(executorBalancePostExec, "finney")} finney`);
        console.log(`executorBalancePreExec:     ${web3.utils.fromWei(executorBalancePreExec, "finney")} finney`);



        console.log(`executorTradeBalance:       ${executorTradeBalance}`);
        console.log(`executorTradeBalanceFinney: ${web3.utils.fromWei(executorTradeBalance, "finney")} finney`);

        // Executor Profit and Loss Statement
        console.log(`
                            Executor Account Info AFTER subOrder execution:
                            -----------------------------------------------
            Executor Account:         ${executor}
            Executor Account Balance | ========================|
                AFTER execution:  > ${web3.utils.fromWei(executorBalancePostExec, "finney")} finney |
                                     | ========================|
                            Executor Profit/Loss Statement:
                            --------------------------------
            Assumption: executor did not receive any ether from elsewhere since execution.
            Executor reward
            per sub order:                  +${web3.utils.fromWei(sellOrder.executorRewardPerSubOrder, "finney")} finney
            Executor gas cost:               -${web3.utils.fromWei(gasCost, "finney")} finney
            ------------------------------------------------------------------
            Executor trade profit/deficit:    ${web3.utils.fromWei(executorTradeBalance, "finney")} finney
                                            ------------------------------------
                                            * note: gas cost must be wrong.
        ==================================================
        `);

        // ############## Seller variables ##############

        console.log(executionReceipt.logs)
        // Comparing the BUY_TOKEN Balance before and after
        const buyBalanceAfter = await buyTokenContract.balanceOf(seller);

        const buyBalanceDifference = buyBalanceAfter - buyBalanceBefore;

        // Fetched liquidity contribution (num, den)
        const num = executionReceipt.logs[0].args['num'].toString(10)
        const numBN = new BN(num)
        const den = executionReceipt.logs[0].args['den'].toString(10)
        const denBN = new BN(den)
        console.log(`Numerator ${num}`)
        console.log(`Denominator ${den}`)

        const oldSubOrderAmount = executionReceipt.logs[1].args.subOrderAmount.toString(10)
        const oldSubOrderAmountBN = new BN(oldSubOrderAmount)

        const actualSubOrderAmount = executionReceipt.logs[1].args.actualSubOrderAmount.toString(10)
        const actualSubOrderAmountBN = new BN(actualSubOrderAmount)

        const fee = executionReceipt.logs[1].args.fee.toString(10)
        const feeBN = new BN(fee)

        const calculatedFee = oldSubOrderAmountBN.mul(numBN).div(denBN)

        const feeCheck = oldSubOrderAmountBN.minus(feeBN)

        console.log(`
        )==================================================
                Seller Buyer Token Comparison:
                ------------------------------------------------
            Seller Account:         ${seller}
            Seller BUY Token Balance | =======================|
                BEFORE execution:    > ${web3.utils.fromWei(buyBalanceBefore, "ether")} ether |
                                     | =======================|
                After execution:     > ${web3.utils.fromWei(buyBalanceAfter, "ether")} ether |
                                     | =======================|
                Difference:          > ${web3.utils.fromWei(buyBalanceDifference, "ether")} ether |
                                     | =======================|
                                     | =======================|
                                     | =======================|
                Check if fee got calculated correctly in SC:

                Calculated fee:      > ${web3.utils.fromWei(calculatedFee, "ether")} ether |
                                     | =======================|
                Fetched fee:         > ${web3.utils.fromWei(fee, "ether")} ether |
                                     | =======================|
                Both fees are identical: ${feeBN.eq(calculatedFee)}
                                     | =======================|
                                     | =======================|
                                     | =======================|
                Show the acutal Sub Order amount that was sold on the DutchX (minus DutchX fee):

                Initial SubOrderSize:> ${web3.utils.fromWei(oldSubOrderAmount, "ether")} ether |
                                     | =======================|
                Actual SubOrderSize: > ${web3.utils.fromWei(actualSubOrderAmount, "ether")} ether |
                                     | =======================|
                Initial - fee === actual: ${feeCheck.eq(actualSubOrderAmountBN)}

        `);

    }

    execSubOrder().then(result => { console.log(result) });
}