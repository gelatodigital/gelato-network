const chai = require('chai');
//use default BigNumber
chai.use(require('chai-bignumber')());

const Gelato = artifacts.require('Gelato');

// const EtherToken = contract(require('@gnosis.pm/util-contracts/build/contracts/EtherToken'))

module.exports = async () => {

    const gelato = await Gelato.at(Gelato.address)
    const subOrderAmount = web3.utils.toWei("10")

    console.log("...Starting calcSubOrder Script")

    const block = await web3.eth.getBlockNumber()
    const blockDetails = await web3.eth.getBlock(block)
    const timestamp = blockDetails.timestamp
    console.log("Current Timestamp:", timestamp)

    console.log("Calculate actual subOrderSize of 10 WETH")

    let actualSubOrder = await gelato._calcActualSubOrderSize(subOrderAmount)

    let oldSubOrderAmount = actualSubOrder.logs[0].args.subOrderAmount.toString()
    let oldSubOrderAmountBN = actualSubOrder.logs[0].args.subOrderAmount
    let actualSubOrderAmount = actualSubOrder.logs[0].args.actualSubOrderAmount.toString()
    let actualSubOrderAmountBN = actualSubOrder.logs[0].args.actualSubOrderAmount
    let fee = actualSubOrder.logs[0].args.fee.toString()
    let feeBN = actualSubOrder.logs[0].args.fee.toFixed()
    
    console.log(oldSubOrderAmountBN)
    console.log(actualSubOrderAmountBN)
    console.log(feeBN)

    console.log("----")
    console.log("Old SubOrder Size: ", oldSubOrderAmount)
    console.log("Actual SubOrder Size: ", actualSubOrderAmount)
    console.log("Applied Fee: ", fee)
    console.log("Actual == Old - (Old*fee): ", parseInt(actualSubOrderAmount) == parseInt(oldSubOrderAmount) - parseInt(fee)) 
    console.log(`Fee (in %): ${parseInt(fee) / parseInt(actualSubOrderAmount) * 100}%`)
    console.log("----")
    console.log("SubOrder successfully calculated")
}