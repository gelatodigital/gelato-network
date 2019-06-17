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

    console.log("Actual SubOrder Size: ", actualSubOrder)
    console.log("SubOrder successfully calculated")
}