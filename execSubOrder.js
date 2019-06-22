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

        // Fetch Seller Before ERC20 BUY_TOKEN balance
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
                            Executor Account Info BEFORE subOrder execution:
                            ------------------------------------------------
            Executor Account:         ${executor}
            Executor Account Balance | =======================|
                BEFORE execution: > ${web3.utils.fromWei(executorBalancePreExec, "finney")} finney |
                                     | =======================|

                            Executor Account Info AFTER subOrder execution:
                            -----------------------------------------------
            Executor Account:         ${executor}
            Executor Account Balance | ========================|
                AFTER execution:  > ${web3.utils.fromWei(executorBalancePostExec, "finney")} finney |
                                     | ========================|

        ==================================================

                            Executor Profit/Loss Statement:
                            --------------------------------
            Assumption: executor did not receive any ether from elsewhere since execution.
            Executor reward
            per sub order:                  +${web3.utils.fromWei(sellOrder.executorRewardPerSubOrder, "finney")} finney
            Executor gas cost:               -${web3.utils.fromWei(gasCost, "finney")} finney
            ------------------------------------------------------------------
            Executor trade profit/deficit:    ${web3.utils.fromWei(executorTradeBalance, "finney")} finney
                                            ------------------------------------
        ==================================================
        `);

        // ############## Seller variables ##############
        // console.log(executionReceipt.logs)

        // ############## Withdraw variables ##############

        // Comparing the BUY_TOKEN Balance before and after
        const buyBalanceAfter = await buyTokenContract.balanceOf(seller);
        const buyBalanceBeforeBN = new BN(buyBalanceBefore)
        const buyBalanceAfterBN = new BN(buyBalanceAfter)

        // Calculate the difference before and after the exection
        const buyBalanceDifference = buyBalanceAfterBN.sub(buyBalanceBeforeBN);

        // Variables to calculate the acutal subOrder amount that each seller will sell on the DutchX (subOrderAmount - fee)
        let num;
        let den;
        let oldSubOrderAmount;
        let actualSubOrderAmount;
        let fee;

        // Variables to calculate if the amount of RDN withdrawn is actually correctly calculated
        let withdrawAmount;
        let priceNum;
        let priceDen;

        // Fetch State of the sell order again after all state changes occured
        let sellOrder2 = await gelato.sellOrders(sellOrderHash);


        // Check if we are at the last withdrawal (no subOrder sell execution left)
        if (parseInt(sellOrder.remainingSubOrders) === 0) {

            // We are in the last withdrawal execution, do not check the actual withdraw amount because there is none
            withdrawAmount = executionReceipt.logs[3].args['withdrawAmount'].toString(10)
            priceNum = executionReceipt.logs[1].args['num'].toString(10)
            priceDen = executionReceipt.logs[1].args['den'].toString(10)
            let actualSubOrderAmount = sellOrder2.actualLastSubOrderAmount

            let withdrawAmountBN = new BN(withdrawAmount)
            let priceNumBN = new BN(priceNum)
            let priceDenBN = new BN(priceDen)
            let actualSubOrderAmountBN = new BN(actualSubOrderAmount)
            let calculatedWithdrawAmountBN = actualSubOrderAmountBN.mul(priceNumBN).div(priceDenBN)
            let calculatedWithdrawAmount = calculatedWithdrawAmountBN.toString(10)
            let wasWithdrawAmountCorrectlyCalculated = calculatedWithdrawAmountBN.eq(withdrawAmountBN)

            console.log(`

        ==================================================

            Seller BUY_TOKEN balance comparison (before vs. after execution):
            (Checking the Withdraw logic)
            ------------------------------------------------
            Seller Account:        ${seller}

            BEFORE execution:    > ${web3.utils.fromWei(buyBalanceBefore, "ether")} RDN |
                                    | =======================|
            After execution:     > ${web3.utils.fromWei(buyBalanceAfter, "ether")} RDN |
                                    | =======================|
            Difference:          > ${web3.utils.fromWei(buyBalanceDifference, "ether")} RDN |
                                    | =======================|
                                    | =======================|
                                    | =======================|

            We just withdrew some RND!

            Did we withdraw the correct amount based on actual SubOrder Size * DutchX Price of previous auction?
            ------------------------------------------------

            Amount withdrawn: (web3)            > ${web3.utils.fromWei(withdrawAmount, "ether")} RDN |
                                | =======================|
            What should be withdrawn (BN test)  > ${web3.utils.fromWei(calculatedWithdrawAmount, "ether")} RDN |
                                | =======================|
            Both amounts are identical:           ${wasWithdrawAmountCorrectlyCalculated}

            #####################################

            Sell Order completed!

            `);

        // After each execution except the last one where we only withdraw, get the actual withdraw amount
        } else {
            num = executionReceipt.logs[0].args['num'].toString(10)
            den = executionReceipt.logs[0].args['den'].toString(10)
            oldSubOrderAmount = executionReceipt.logs[1].args['subOrderAmount'].toString(10)
            actualSubOrderAmount = executionReceipt.logs[1].args['actualSubOrderAmount'].toString(10)
            fee = executionReceipt.logs[1].args['fee'].toString(10)

            let numBN = new BN(num)
            let denBN = new BN(den)
            let oldSubOrderAmountBN = new BN(oldSubOrderAmount)
            let actualSubOrderAmountBN = new BN(actualSubOrderAmount)
            let feeBN = new BN(fee)
            let calculatedFee = oldSubOrderAmountBN.mul(numBN).div(denBN)
            let calculatedSubOrderAmount = oldSubOrderAmountBN.sub(feeBN)

            console.log(`
        ==================================================

                Seller BUY_TOKEN balance comparison (before vs. after execution):
                (Checking the Withdraw logic)
                ------------------------------------------------
                Seller Account:        ${seller}

                BEFORE execution:    > ${web3.utils.fromWei(buyBalanceBefore, "ether")} RDN |
                                        | =======================|
                After execution:     > ${web3.utils.fromWei(buyBalanceAfter, "ether")} RDN |
                                        | =======================|
                Difference:          > ${web3.utils.fromWei(buyBalanceDifference, "ether")} RDN |
                                        | =======================|
                                        | =======================|
                                        | =======================|

                Show the acutal Sub Order amount that was sold on the DutchX (minus DutchX fee):
                ------------------------------------------------

                Initial SubOrderSize:   > ${web3.utils.fromWei(oldSubOrderAmount, "ether")} WETH |
                                    | =======================|
                Actual SubOrderSize:    > ${web3.utils.fromWei(actualSubOrderAmount, "ether")} WETH |
                                    | =======================|
                Initial - fee === actual: ${calculatedSubOrderAmount.eq(actualSubOrderAmountBN)}
                                    | =======================|
                                    | =======================|
                                    | =======================|

                Check if fee got calculated correctly in SC:
                ------------------------------------------------

                Calculated fee (web3)    > ${web3.utils.fromWei(calculatedFee, "ether")} WETH |
                                        | =======================|
                Fetched fee:             > ${web3.utils.fromWei(fee, "ether")} WETH |
                                        | =======================|
                Both fees are identical:   ${feeBN.eq(calculatedFee)}
                                        | =======================|
                                        | =======================|
                                        | =======================|
            `);

            // Only calc after first exexAndWithdrawSubOrder func has been executed
            if (parseInt(buyBalanceAfter) > 0)
            {
                withdrawAmount = executionReceipt.logs[6].args['withdrawAmount'].toString(10)
                priceNum = executionReceipt.logs[4].args['num'].toString(10)
                priceDen = executionReceipt.logs[4].args['den'].toString(10)


                let withdrawAmountBN = new BN(withdrawAmount)
                let priceNumBN = new BN(priceNum)
                let priceDenBN = new BN(priceDen)

                let calculatedWithdrawAmountBN = actualSubOrderAmountBN.mul(priceNumBN).div(priceDenBN)
                let calculatedWithdrawAmount = calculatedWithdrawAmountBN.toString(10)

                let wasWithdrawAmountCorrectlyCalculated = calculatedWithdrawAmountBN.eq(withdrawAmountBN)

                console.log(`

        ==================================================

                We just withdrew some RND!

                Did we withdraw the correct amount based on actual SubOrder Size * DutchX Price of previous auction?
                ------------------------------------------------

                Amount withdrawn: (web3)            > ${web3.utils.fromWei(withdrawAmount, "ether")} RDN |
                                    | =======================|
                What should be withdrawn (BN test)  > ${web3.utils.fromWei(calculatedWithdrawAmount, "ether")} RDN |
                                    | =======================|
                Both amounts are identical:           ${wasWithdrawAmountCorrectlyCalculated}

                `);
            }

        }

        // ############## Withdraw variables END ##############

        return (`

        ==================================================

            ExecuteSubOrder was successful!

            Sub Order Executions left: ${sellOrder2.remainingSubOrders}
            Withdraws left: ${sellOrder2.remainingWithdrawals}
        `)
    }

    execSubOrder().then(result => { console.log(result) });
}