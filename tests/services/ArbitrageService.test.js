const testSetup = require('../helpers/testSetup')
// const AuctionRepoMock = require('../../src/repositories/AuctionRepo/AuctionRepoMock')
// const auctionRepoMock = new AuctionRepoMock({})
//
// const ArbitrageRepoMock = require('../../src/repositories/ArbitrageRepo/ArbitrageRepoMock')
// const arbitrageRepoMock = new ArbitrageRepoMock({})
//
// const PriceRepoMock = require('../../src/repositories/PriceRepo/PriceRepoMock')
// const priceRepo = new PriceRepoMock()
//
// const auctionsMockData = require('../data/auctions')
// const clone = require('lodash.clonedeep')

const numberUtil = require('../../src/helpers/numberUtil')
const { toWei, fromWei, toBigNumber } = numberUtil
// const BigNumber = require('bignumber.js')

const setupPromise = testSetup()

const UNISWAP_FEE = 0.003 // 0.3%

// test('It should ensureSellLiquidity', async () => {
//   const { liquidityService } = await setupPromise
//
//   // we mock the auction repo
//   liquidityService._auctionRepo = new AuctionRepoMock({
//     auctions: _getAuctionsWithUnderFundingEthOmg()
//   })
//
//   async function _isUnderFundingAuction ({ tokenA, tokenB }) {
//     const auctionIndex = await liquidityService._auctionRepo.getAuctionIndex({
//       sellToken: tokenA, buyToken: tokenB })
//     const { fundingA, fundingB } = await liquidityService._auctionRepo.getFundingInUSD({
//       tokenA, tokenB, auctionIndex
//     })
//
//     return fundingA.lessThan(MINIMUM_SELL_VOLUME) &&
//     fundingB.lessThan(MINIMUM_SELL_VOLUME)
//   }
//
//   function _isValidSellVolume (sellVolume, fundingSellVolume) {
//     return sellVolume.greaterThan(fundingSellVolume)
//   }
//
//   // GIVEN a not RUNNING auction, without enough sell liquidiy
//   expect(await _isUnderFundingAuction({ tokenA: 'OMG', tokenB: 'WETH' }))
//     .toBeTruthy()
//
//   // WHEN we ensure sell liquidity
//   const ensureLiquidityState = await liquidityService.ensureSellLiquidity({
//     sellToken: 'OMG', buyToken: 'WETH', from: '0x123', waitToReleaseTheLock: false })
//
//   // THEN bot sells in both sides, WETH-OMG and OMG-WETH, the pair market we expect
//   const expectedBotSell = [{
//     buyToken: 'WETH',
//     sellToken: 'OMG'
//   }, {
//     buyToken: 'OMG',
//     sellToken: 'WETH'
//   }]
//   expect(ensureLiquidityState).toMatchObject(expectedBotSell)
//
//   // THEN new sell volume is valid
//   let currentSellVolume = await liquidityService._auctionRepo.getSellVolume({ sellToken: 'WETH', buyToken: 'OMG' })
//   expect(_isValidSellVolume(currentSellVolume, UNDER_MINIMUM_FUNDING_WETH))
//     .toBeTruthy()
//   expect(_isValidSellVolume(currentSellVolume, ensureLiquidityState[0].amount))
//     .toBeTruthy()
//
//   // THEN is not underfunding auction
//   expect(await _isUnderFundingAuction({ tokenA: 'OMG', tokenB: 'WETH' }))
//     .toBeFalsy()
// })
//
// test('It should not ensureBuyLiquidity if auction has closed', async () => {
//   const { liquidityService } = await setupPromise
//
//   // we mock the auction repo
//   liquidityService._auctionRepo = new AuctionRepoMock({
//     auctions: _getClosedAuctions()
//   })
//   // we mock the exchange price repo
//   liquidityService._priceRepo = priceRepo
//
//   // GIVEN a CLOSED auction, with enough buy volume
//   expect(await _hasLowBuyVolume(
//     { sellToken: 'WETH', buyToken: 'RDN' },
//     liquidityService._auctionRepo
//   )).toBeFalsy()
//
//   // WHEN we ensure buy liquidity
//   const ensureLiquidityState = await liquidityService.ensureBuyLiquidity({
//     sellToken: 'WETH', buyToken: 'RDN', from: '0x123', waitToReleaseTheLock: false })
//
//   // THEN the bot don't buy anything
//   const expectedBotBuy = []
//   expect(ensureLiquidityState).toMatchObject(expectedBotBuy)
// })
//
// test.skip('It should detect concurrency when checking arbitrage', async () => {
  // const { arbitrageService } = await setupPromise
  //
  // // GIVEN a not RUNNING auction, without enough sell liquidiy
  // // we mock the auction repo
  // arbitrageService._auctionRepo = new AuctionRepoMock({
  //   auctions: _getAuctionsWithUnderFundingEthOmg()
  // })

  // // we wrap dutchOpportunity with jest mock functionalities
  // const dutchOpportunity = jest.fn(arbitrageService._arbitrageRepo.dutchOpportunity)
  // arbitrageService._arbitrageRepo.dutchOpportunity = dutchOpportunity
  //
  // // GIVEN no calls to dutchOpportunity function
  // expect(dutchOpportunity.mock.calls.length).toBe(0)
  //
  // // WHEN we ensure sell liquidity twice
  // let ensureLiquidityPromise1 = arbitrageService.checkUniswapArbitrage({
  //   sellToken: 'OMG', buyToken: 'WETH', from: '0x123', waitToReleaseTheLock: false })
  // let ensureLiquidityPromise2 = arbitrageService.checkUniswapArbitrage({
  //   sellToken: 'OMG', buyToken: 'WETH', from: '0x123', waitToReleaseTheLock: false })
  //
  // await Promise.all([
  //   ensureLiquidityPromise1,
  //   ensureLiquidityPromise2
  // ])
  //
  // // THEN expect 2 calls to dutchOpportunity function ensuring liquidity to both sides
  // // of the token pair
  // expect(dutchOpportunity.mock.calls.length).toBe(2)
// })

test('It should return the expected input price (output token amount) in Uniswap', async () => {
  const { arbitrageService } = await setupPromise

  // GIVEN two input prices and amount
  // Simulate sellToken/buyToken price to be 1000 / 3 and we buy with 1 buyToken
  const INPUT_TOKENA = 1
  const INPUT_RESERVEA = 3
  const OUTPUT_RESERVEA = 1000
  const INPUT_TOKENA_WEI = toWei(INPUT_TOKENA)
  const INPUT_RESERVEA_WEI = toWei(INPUT_RESERVEA)
  const OUTPUT_RESERVEA_WEI = toWei(OUTPUT_RESERVEA)

  // Simulate sellToken/buyToken price to be 60000 / 100 and buy using 10 buyToken
  const INPUT_TOKENB = 10
  const INPUT_RESERVEB = 100
  const OUTPUT_RESERVEB = 60000
  const INPUT_TOKENB_WEI = toWei(INPUT_TOKENB)
  const INPUT_RESERVEB_WEI = toWei(INPUT_RESERVEB)
  const OUTPUT_RESERVEB_WEI = toWei(OUTPUT_RESERVEB)

  // WHEN we check the expected amount to receive
  // getInputPrice is max tokens received in exchange of inputTokens
  const inputPrice1 = arbitrageService.getInputPrice(
    INPUT_TOKENA_WEI, INPUT_RESERVEA_WEI, OUTPUT_RESERVEA_WEI)
  const inputPrice2 = arbitrageService.getInputPrice(
    INPUT_TOKENB_WEI, INPUT_RESERVEB_WEI, OUTPUT_RESERVEB_WEI)

  // THEN
  const inputAmountAAfterFee = INPUT_TOKENA * (1 - UNISWAP_FEE)
  const expectedInputPrice1 = (OUTPUT_RESERVEA * inputAmountAAfterFee /
    (INPUT_RESERVEA + inputAmountAAfterFee))

  const inputAmountBAfterFee = INPUT_TOKENB * (1 - UNISWAP_FEE)
  const expectedInputPrice2 = (OUTPUT_RESERVEB * inputAmountBAfterFee /
    (INPUT_RESERVEB + inputAmountBAfterFee))

  expect(fromWei(inputPrice1).toFixed(4)).toBe(expectedInputPrice1.toFixed(4))
  expect(fromWei(inputPrice2).toFixed(4)).toBe(expectedInputPrice2.toFixed(4))
})

test('It should return the expected output price (input token amount) in Uniswap', async () => {
  const { arbitrageService } = await setupPromise

  // GIVEN two output prices and amount
  // Simulate sellToken/buyToken price to be 1000 / 3 and we want to get 400 buyToken
  const DESIRED_OUTPUT_TOKENA = 400
  const INPUT_RESERVEA = 3
  const OUTPUT_RESERVEA = 1000
  const DESIRED_OUTPUT_TOKENA_WEI = toWei(DESIRED_OUTPUT_TOKENA)
  const INPUT_RESERVEA_WEI = toWei(INPUT_RESERVEA)
  const OUTPUT_RESERVEA_WEI = toWei(OUTPUT_RESERVEA)

  // Simulate sellToken/buyToken price to be 60000 / 100 and we want to get 20000 buyToken
  const DESIRED_OUTPUT_TOKENB = 20000
  const INPUT_RESERVEB = 100
  const OUTPUT_RESERVEB = 60000
  const DESIRED_OUTPUT_TOKENB_WEI = toWei(DESIRED_OUTPUT_TOKENB)
  const INPUT_RESERVEB_WEI = toWei(INPUT_RESERVEB)
  const OUTPUT_RESERVEB_WEI = toWei(OUTPUT_RESERVEB)

  // WHEN we check the amount we have to add in Uniswap to get the desired token quantity
  // getOutputPrice is tokens to use in Uniswap to receive the outputTokens amount
  const outputPrice1 = arbitrageService.getOutputPrice(
    DESIRED_OUTPUT_TOKENA_WEI, INPUT_RESERVEA_WEI, OUTPUT_RESERVEA_WEI)
  const outputPrice2 = arbitrageService.getOutputPrice(
    DESIRED_OUTPUT_TOKENB_WEI, INPUT_RESERVEB_WEI, OUTPUT_RESERVEB_WEI)

  // THEN we check we receive the expected result
  const expectedOutputPrice1 = (INPUT_RESERVEA * DESIRED_OUTPUT_TOKENA /
    (OUTPUT_RESERVEA - DESIRED_OUTPUT_TOKENA)) *
    (1 + UNISWAP_FEE)
  const expectedOutputPrice2 = (INPUT_RESERVEB * DESIRED_OUTPUT_TOKENB /
    (OUTPUT_RESERVEB - DESIRED_OUTPUT_TOKENB)) *
    (1 + UNISWAP_FEE)

  expect(fromWei(outputPrice1).toFixed(4)).toBe(expectedOutputPrice1.toFixed(4))
  expect(fromWei(outputPrice2).toFixed(4)).toBe(expectedOutputPrice2.toFixed(4))
})

test('It should return the expected dutch spend amount', async () => {
  const { arbitrageService } = await setupPromise

  // GIVEN a not RUNNING auction, without enough sell liquidiy
  // we mock the auction repo
  arbitrageService._auctionRepo.getCurrentAuctionPriceWithFees =
    jest.fn(async ({ amount }) => {
      return {
        closesAuction: false,
        amountAfterFee: amount.sub(amount.mul('5').div('1000'))
      }
    })

  arbitrageService.getOutstandingVolume =
    jest.fn(async ({ amount }) => {
      return toWei(100)
    })

  // GIVEN two markets with this conditions
  // inputBalance is sellToken amount and outputBalance is buyToken amount
  // For market A we simulate to have a price in uniswap of 320 / 20 = 16
  const MAX_TO_SPEND = toWei(30) // We simulate to have 30 units of Token
  const INPUT_BALANCEA = toWei(20)
  const OUTPUT_BALANCEA = toWei(320)
  const DUTCHX_PRICEA = toBigNumber(9.95)
  // For market B we simulate to have a price in uniswap of 77 / 462 = 0,166666667
  const INPUT_BALANCEB = toWei(462)
  const OUTPUT_BALANCEB = toWei(77)
  const DUTCHX_PRICEB = toBigNumber(0.0995)

  // WHEN we check the amount we have to spend in DutchX
  const dutchSpendAmount = await arbitrageService.getDutchSpendAmount({
    maxToSpend: MAX_TO_SPEND,
    inputBalance: INPUT_BALANCEA, // sellToken balance
    outputBalance: OUTPUT_BALANCEA, // buyToken balance
    dutchPrice: DUTCHX_PRICEA,
    maximizeVolume: true,
    // Params to check user fee
    from: '0x123',
    sellToken: '',
    buyToken: '',
    auctionIndex: 0,
    owlAllowance: 0,
    owlBalance: 0,
    ethUSDPrice: 0
  })

  const dutchSpendAmount2 = await arbitrageService.getDutchSpendAmount({
    maxToSpend: MAX_TO_SPEND,
    inputBalance: INPUT_BALANCEB, // sellToken balance
    outputBalance: OUTPUT_BALANCEB, // buyToken balance
    dutchPrice: DUTCHX_PRICEB,
    maximizeVolume: true,
    // Params to check user fee
    from: '0x123',
    sellToken: '',
    buyToken: '',
    auctionIndex: 0,
    owlAllowance: 0,
    owlBalance: 0,
    ethUSDPrice: 0
  })

  // THEN in this scenario we use all the tokens we have to spend
  const expectedSpendAmount1 = fromWei(MAX_TO_SPEND)
  const expectedSpendAmount2 = fromWei(MAX_TO_SPEND)
  expect(fromWei(dutchSpendAmount).toFixed(4)).toBe(expectedSpendAmount1.toFixed(4))
  expect(fromWei(dutchSpendAmount2).toFixed(4)).toBe(expectedSpendAmount2.toFixed(4))
})
