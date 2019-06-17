const Gelato = artifacts.require('Gelato');
const EtherToken = artifacts.require('EtherToken')

// const EtherToken = contract(require('@gnosis.pm/util-contracts/build/contracts/EtherToken'))

module.exports = function() {
   
    async function test() {

        // Hard coded. If you changed values in gelatoSetup1, please change hash here as well
        const sellOrderHash = '0x43e658e6525ad1a083dbc9bc64d86e0ccbc3cc336ae82076aebebc0651f2a9e8'

        console.log("...Starting Gelato Setup 2 Script")
        const block = await web3.eth.getBlockNumber()
        const blockDetails = await web3.eth.getBlock(block)
        const timestamp = blockDetails.timestamp
        console.log("Current Timestamp:", timestamp)
        
        const gelato = await Gelato.at(Gelato.address)

        console.log("Execute 1st subOrder Tx Executor: 0xf17f52151ebef6c7334fad080c5704d77216b732")

        let executeSubOrder = await gelato.executeSubOrder(sellOrderHash, {from: '0xf17f52151ebef6c7334fad080c5704d77216b732'})

        console.log(executeSubOrder)
        console.log("1st SubOrder executed")
    }
    test();
}