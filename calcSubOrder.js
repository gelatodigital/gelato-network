const Gelato = artifacts.require('Gelato');
const BN = require('bignumber.js');

// const EtherToken = contract(require('@gnosis.pm/util-contracts/build/contracts/EtherToken'))

module.exports = async () => {

    const gelato = await Gelato.at(Gelato.address)
    const subOrderAmount = web3.utils.toWei("10")

    console.log("...Starting calcSubOrder Script")

    const block = await web3.eth.getBlockNumber()
    const blockDetails = await web3.eth.getBlock(block)
    const timestamp = blockDetails.timestamp
    console.log("----")
    console.log("Current Timestamp:", timestamp)

    console.log("----")

    console.log("Calculate actual subOrderSize of 10 WETH")

    const actualSubOrder = await gelato._calcActualSubOrderSize(subOrderAmount)

    const oldSubOrderAmount = actualSubOrder.logs[0].args.subOrderAmount.toString(10)
    const oldSubOrderAmountBN = new BN(oldSubOrderAmount)

    const actualSubOrderAmount = actualSubOrder.logs[0].args.actualSubOrderAmount.toString(10)
    const actualSubOrderAmountBN = new BN(actualSubOrderAmount)

    const fee = actualSubOrder.logs[0].args.fee.toString(10)
    const feeBN = new BN(fee)

    console.log("----")
    console.log("Old SubOrder Size: ", oldSubOrderAmount)
    console.log("Actual SubOrder Size: ", actualSubOrderAmount)
    console.log("Applied Fee: ", fee)
    console.log("----")
    const feeCheck = oldSubOrderAmountBN.minus(feeBN)
    console.log(`Check if (old - fee === new): ${feeCheck.eq(actualSubOrderAmountBN)}`)
    console.log("----")
    console.log("SubOrder successfully calculated")
}