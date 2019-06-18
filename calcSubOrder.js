const Gelato = artifacts.require('Gelato');
const BN = require('bignumber.js');

// const EtherToken = contract(require('@gnosis.pm/util-contracts/build/contracts/EtherToken'))

module.exports = async () => {

    const gelato = await Gelato.at(Gelato.address)
    const subOrderAmount = web3.utils.toWei("1")

    console.log("...Starting calcSubOrder Script")

    const block = await web3.eth.getBlockNumber()
    const blockDetails = await web3.eth.getBlock(block)
    const timestamp = blockDetails.timestamp
    console.log("----")
    console.log("Current Timestamp:", timestamp)

    console.log("----")

    const actualSubOrder = await gelato._calcActualSubOrderSize(subOrderAmount)

    // console.log(actualSubOrder)
    // Fetched liquidity contribution (num, den)
    const num = actualSubOrder.logs[0].args['num'].toString(10)
    const numBN = new BN(num)
    const den = actualSubOrder.logs[0].args['den'].toString(10)
    const denBN = new BN(den)
    console.log(`Numerator ${num}`)
    console.log(`Denominator ${den}`)

    const oldSubOrderAmount = actualSubOrder.logs[1].args.subOrderAmount.toString(10)
    const oldSubOrderAmountBN = new BN(oldSubOrderAmount)

    const actualSubOrderAmount = actualSubOrder.logs[1].args.actualSubOrderAmount.toString(10)
    const actualSubOrderAmountBN = new BN(actualSubOrderAmount)

    const fee = actualSubOrder.logs[1].args.fee.toString(10)
    const feeBN = new BN(fee)


    console.log("----")
    console.log("Check if fee got calculated correctly")
    const calculatedFee = oldSubOrderAmountBN.mul(numBN).div(denBN)
    console.log(`Calculated BN fee: ${calculatedFee}`)
    console.log(`Applied Fee:       ${fee}`)
    console.log(`Both fees are identical: ${feeBN.eq(calculatedFee)}`)

    console.log("----")
    console.log("Old SubOrder Size: ", oldSubOrderAmount)
    console.log("Actual SubOrder Size: ", actualSubOrderAmount)
    console.log("----")
    const feeCheck = oldSubOrderAmountBN.minus(feeBN)
    console.log(`Check if (old - fee === new): ${feeCheck.eq(actualSubOrderAmountBN)}`)
    console.log("----")
    console.log("SubOrder successfully calculated")

}