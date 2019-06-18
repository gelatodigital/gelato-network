const Gelato = artifacts.require('Gelato');
const BN = require('bignumber.js');
const EtherToken = artifacts.require('EtherToken')

// const EtherToken = contract(require('@gnosis.pm/util-contracts/build/contracts/EtherToken'))

module.exports = async () => {

    const gelato = await Gelato.at(Gelato.address)
    const subOrderAmount = web3.utils.toWei("9.95")
    const lastAuctionIndex = 2
    const WETH = EtherToken.address
    const RDN = '0x8ACEe021a27779d8E98B9650722676B850b25E11'
    const decimals = 18

    const block = await web3.eth.getBlockNumber()
    const blockDetails = await web3.eth.getBlock(block)
    const timestamp = blockDetails.timestamp
    console.log("----")
    console.log("Current Timestamp:", timestamp)

    console.log("----")

    console.log("...Starting withdrawing Script")

    const txReceipt = await gelato._calcWithdrawAmount(WETH, RDN, lastAuctionIndex, subOrderAmount)

    const num = txReceipt.logs[0].args.num.toString(10)
    const den = txReceipt.logs[0].args.den.toString(10)
    const withdrawAmount = txReceipt.logs[1].args.withdrawAmount.toString(10)

    const numBN = new BN(num)
    const denBN = new BN(den)
    const withdrawAmountBN = new BN(withdrawAmount)
    const subOrderAmountBN = new BN(subOrderAmount)

    // Calc directly with BN, not in Solidity
    const accurateWithdrawAmount = subOrderAmountBN.mul(numBN).div(denBN)

    console.log("----")
    console.log(`Denominator:               ${num}`)
    console.log(`Nominator:                 ${den}`)
    console.log("----")
    console.log(`Sub-order Amount:          ${subOrderAmount / (10**decimals)} WETH`)
    console.log(`Approx Price:              ${num / den} WETH/RDN`)
    console.log(`Withdraw Amount:           ${withdrawAmount / (10**decimals)} RDN`)
    console.log(`Accurate Withdraw Amount:  ${accurateWithdrawAmount / (10**decimals)} RDN`)
    console.log("----")
    console.log("BN Tests")
    console.log(`Withdraw Calc accurate:    ${accurateWithdrawAmount.eq(withdrawAmountBN)} `)




}