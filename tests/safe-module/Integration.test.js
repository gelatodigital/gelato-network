//const Web3 = require('web3')
const truffleContract = require('truffle-contract')
const conf = require('../../conf')
const HDWalletProvider = require('../../src/helpers/web3Providers/HDWalletProvider')
const testSetup = require('../helpers/testSetup')
const tokenPair = require('./../data/tokenPairs/local/RDN-WETH')

const setupPromise = testSetup()
const safeAddress = conf.SAFE_ADDRESS
const minSafeBalance = 22 // ETH
const minRDNBalance = 1000 // RDN
const ONE_HOUR = 60 * 60
const ONE = 1e18

let dxOperator, currentSnapshotId, hdWalletProvider
// Contract instances that won't be loaded by the instance factory
let dxContract, rdnContract, wethContract

jest.setTimeout(60000)

beforeEach(async (done) => {
  const {
    MNEMONIC,
    ETHEREUM_RPC_URL
  } = conf

  const { ethereumClient, contracts } = await setupPromise

  currentSnapshotId = await ethereumClient.makeSnapshot()

  // Create a classic HDWalletProvider instance
  hdWalletProvider = new HDWalletProvider({
    mnemonic: MNEMONIC,
    url: ETHEREUM_RPC_URL,
    addressIndex: 0,
    numAddresses: 5
  })

  // Create a web3 using the HDWalletProvider instead of the Safe's one
  const web3 = hdWalletProvider._web3
  dxOperator = hdWalletProvider.addresses[0]

  // Load WETH and RDN contracts using HDWalletProvider
  const dxContractJson = require('../../build/contracts/DutchExchange.json')
  const wethContractJson = require('../../build/contracts/EtherToken.json')
  const rdnContractJson = require('../../build/contracts/TokenRDN.json')
  const dxContractDef = truffleContract(dxContractJson)
  dxContractDef.setProvider(web3.currentProvider)

  const wethContractDef = truffleContract(wethContractJson)
  wethContractDef.setProvider(web3.currentProvider)

  const rdnContractDef = truffleContract(rdnContractJson)
  rdnContractDef.setProvider(web3.currentProvider)

  dxContract = await dxContractDef.at(contracts.dx.address)
  wethContract = await wethContractDef.at(contracts.eth.address)
  rdnContract = await rdnContractDef.at(contracts.erc20TokenContracts.RDN.address)

  console.debug(`\nSAFE ADDRESS: ${safeAddress}\n`)
  console.debug(`\nRDN ADDRESS: ${contracts.erc20TokenContracts.RDN.address}`)

  web3.eth.getBalance(safeAddress, async (e, safeETHBalance) => {
    if (!e) {
      console.debug(`\nSafe Balance: ${safeETHBalance.div(1e18)} ETH`)
      web3.eth.sendTransaction({
        from: dxOperator,
        to: safeAddress,
        value: web3.toWei(minSafeBalance, 'ether')
      }, async (e) => {
        if (!e) {
          console.debug("\nFund transaction sent to Safe")
          rdnContract.transfer(
            safeAddress,
            web3.toWei(minRDNBalance, 'ether'), {
            from: dxOperator
          }).then((txResponse) => {
            if (txResponse && txResponse.receipt && parseInt(txResponse.receipt.status) == 1) {
              console.debug("\nERC20Token transfer transaction done")
              rdnContract.transfer(
                dxOperator,
                web3.toWei(minRDNBalance, 'ether'), {
                from: dxOperator
              }).then((txResponse) => {
                if (txResponse && txResponse.receipt && parseInt(txResponse.receipt.status) == 1) {
                  console.debug("\nERC20Token transfer transaction to DX OPERATOR done")
                  done()
                } else {
                  throw new Error('RDN transfer transaction failed')
                }
              }).catch(error => {
                console.log(error)
                throw error
              })

            } else {
              throw new Error('RDN transfer transaction failed')
            }
          }).catch(error => {
            console.log(error)
            throw error
          })
        } else {
          throw e
        }
      })
    } else {
      throw e
    }
  })
})

afterEach(async () => {
  const { ethereumClient } = await setupPromise
  return ethereumClient.revertSnapshot(currentSnapshotId)
})

test('It should deposit tokens into the DX, buy and sell WETH => RDN and finally withdraw', async () => {
  const { auctionRepo, dxInfoService, dxTradeService, ethereumClient } = await setupPromise

  //
  // GENERIC TESTS
  //
  const ethUsdPrice = await auctionRepo.getPriceEthUsd()
  expect(ethUsdPrice.toNumber()).toBeGreaterThan(0)

  const thresholdNewTokenPair = await auctionRepo.getThresholdNewTokenPair()
  expect(thresholdNewTokenPair.toNumber()).toBeGreaterThan(0)

  const auctioneer = await dxContract.auctioneer()
  expect(auctioneer).toBe(dxOperator)

  // Get account balance from DX
  const safeWETHBalanceBefore = await dxInfoService.getAccountBalanceForToken({ token: 'WETH', address: safeAddress })

  // Deposit ETH into DX passing through the Safe (SafeModule)
  let wethDepositTxResult = await dxTradeService.deposit({
    token: 'WETH',
    amount: ONE,
    accountAddress: safeAddress
  })
  expectTxSucceed(wethDepositTxResult)

  let safeWETHBalanceAfter = await dxInfoService.getAccountBalanceForToken({ token: 'WETH', address: safeAddress })
  expect(safeWETHBalanceAfter.toNumber()).toBe(safeWETHBalanceBefore.plus(ONE).toNumber())

  //
  // Execute tokens approval
  //
  await dxContract.updateApprovalOfToken([wethContract.address, rdnContract.address], 1, { from: dxOperator, gas: 600000 })
  const amount = ethUsdPrice.mul(1e25).toNumber()
  // Deposit dxOperator's ETH into WETH
  wethDepositTxResult = await wethContract.deposit({ 
    from: dxOperator,
    value: amount
  })
  expectTxSucceed(wethDepositTxResult)

  // Set allowance, bypass HDWalletSafeProvider
  let wethAllowanceTxResult = await wethContract.approve(dxContract.address, amount, { from: dxOperator })
  expectTxSucceed(wethAllowanceTxResult)

  // Deposit WETH into DUTCHX
  let dxDepositTxResult = await dxContract.deposit(wethContract.address, amount, { from: dxOperator, gas: 600000 })
  expectTxSucceed(dxDepositTxResult)

  //
  // TEST ADD token-pair
  // 
  const { tokenA, tokenB, initialPrice } = tokenPair
  const isValidTokenPair = await auctionRepo.isValidTokenPair({ tokenA: tokenA.address, tokenB: tokenB.address })
  expect(isValidTokenPair).toBe(false)

  const addTokenPairParams = [
    tokenA.address,
    tokenB.address,
    // we don't use the actual on porpuse (let the contract do that)
    tokenA.funding,
    amount, //tokenB.funding,
    initialPrice.numerator,
    initialPrice.denominator
  ]
  const addTokenPairTxResult = await dxContract.addTokenPair(...addTokenPairParams, { from: dxOperator, gas: 600000 })
  expectTxSucceed(addTokenPairTxResult)

  // Check auctionIndex
  const auctionIndex = await dxContract.getAuctionIndex(rdnContract.address, wethContract.address)
  const auctionIndexFromService = await dxInfoService.getAuctionIndex({
    sellToken: rdnContract.address,
    buyToken:  wethContract.address
  })
  expect(auctionIndex.toNumber()).toBe(auctionIndexFromService)

  const priceUsdInDx = await auctionRepo.getPriceInUSD({
    token: 'WETH',
    amount
  })

  const { fundingA, fundingB } = await auctionRepo.getFundingInUSD({
    tokenA: 'RDN',
    tokenB: 'WETH',
    auctionIndex: auctionIndex.toNumber()
  })

  expect(fundingA.toNumber()).toBe(0) // No RDN funding
  expect(fundingB.toNumber()).toBeGreaterThan(0)
  expect(priceUsdInDx.div(ethUsdPrice.toNumber()).toNumber()).toBe(amount/1e18)

  let [
    totalWethSupply,
    wethAmountInDx,
    rdnAmountInDx
  ] = await Promise.all([
    dxInfoService.getTokenTotalSupply({ tokenAddress: wethContract.address }),
    // get token balance in DX
    dxInfoService.getAccountBalanceForToken({ token: 'WETH', address: safeAddress }),
    dxInfoService.getAccountBalanceForToken({ token: 'RDN', address: safeAddress })
  ])

  expect(wethAmountInDx.toNumber()).toBe(ONE)
  expect(rdnAmountInDx.toNumber()).toBe(0)
  expect(totalWethSupply.div(1e18).toNumber()).toBe((ONE/1e18)+(amount/1e18))

  //
  // TEST DEPOSIT
  //

  // Deposit more ETH into DX passing through the Safe (SafeModule)
  wethDepositTxResult = await dxTradeService.deposit({
    token: 'WETH',
    amount: ONE,
    accountAddress: safeAddress
  })
  expectTxSucceed(wethDepositTxResult)

  const rdnDepositTxResult = await dxTradeService.deposit({
    token: 'RDN',
    amount: ONE,
    accountAddress: safeAddress
  })
  expectTxSucceed(rdnDepositTxResult)

  // Test that 'deposit' was executed correctly
  totalWethSupply = await dxInfoService.getTokenTotalSupply({ tokenAddress: wethContract.address })
  wethAmountInDx = await dxInfoService.getAccountBalanceForToken({ token: 'WETH', address: safeAddress })
  rdnAmountInDx = await dxInfoService.getAccountBalanceForToken({ token: 'RDN', address: safeAddress })

  expect(wethAmountInDx.toNumber()).toBe(ONE*2)
  expect(totalWethSupply.div(1e18).toNumber()).toBe((ONE*2/1e18)+(amount/1e18))
  expect(rdnAmountInDx.toNumber()).toBe(ONE)

  //
  // TEST SELL
  //
  const sellVolumeBeforeSell = await auctionRepo.getSellVolume({
    sellToken: 'WETH',
    buyToken: 'RDN'
  })

  const sellTxResult = await dxTradeService.sell({
    sellToken: 'WETH',
    buyToken: 'RDN',
    auctionIndex: auctionIndex.toNumber(),
    amount: ONE,
    from: safeAddress // dxOperator we expect HDWalletSafeProvider to send transaction through the Safe Module
  })
  expectTxSucceed(sellTxResult)

  totalWethSupply = await dxInfoService.getTokenTotalSupply({ tokenAddress: wethContract.address })
  wethAmountInDx = await dxInfoService.getAccountBalanceForToken({ token: 'WETH', address: safeAddress })
  // Test sellVolume was increased
  const sellVolumeAfterSell = await auctionRepo.getSellVolume({
    sellToken: 'WETH',
    buyToken: 'RDN'
  })

  expect(sellVolumeAfterSell.toNumber()).toBeGreaterThan(sellVolumeBeforeSell.toNumber())
  expect(wethAmountInDx.toNumber()).toBe(ONE) // decreases from 2*ONE to ONE
  // totalWethSupply should not have changed
  expect(totalWethSupply.div(1e18).toNumber()).toBe((ONE*2/1e18)+(amount/1e18))

  //
  // TEST BUY
  //

  // Go forward in time
  await ethereumClient.increaseTime(6*ONE_HOUR)

  const buyVolumeBeforeBuy = await auctionRepo.getBuyVolume({
    sellToken: 'WETH',
    buyToken: 'RDN'
  })

  const buyTxResult = await dxTradeService.buy({
    sellToken: 'WETH',
    buyToken: 'RDN',
    auctionIndex: auctionIndex.toNumber(),
    amount: ONE,
    from: safeAddress
  })
  expectTxSucceed(buyTxResult)

  const buyVolumeAfterBuy = await auctionRepo.getBuyVolume({
    sellToken: 'WETH',
    buyToken: 'RDN'
  })
  expect(buyVolumeAfterBuy.toNumber()).toBeGreaterThan(buyVolumeBeforeBuy.toNumber())

})

const expectTxSucceed = txResult => {
  expect(txResult.tx).not.toBeUndefined()
  expect(txResult.receipt).not.toBeUndefined()
  expect(parseInt(txResult.receipt.status)).toBe(1)
}