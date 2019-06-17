const testSetup = require('../helpers/testSetup')
const AuctionRepoMock = require('../../src/repositories/AuctionRepo/AuctionRepoMock')
const auctionRepoMock = new AuctionRepoMock({})
const EthereumRepoMock = require('../../src/repositories/EthereumRepo/EthereumRepoMock')
const ethereumRepoMock = new EthereumRepoMock({})
const PriceRepoMock = require('../../src/repositories/PriceRepo/PriceRepoMock')
const priceRepo = new PriceRepoMock()

const auctionsMockData = require('../data/auctions')
const clone = require('lodash.clonedeep')

const BigNumber = require('bignumber.js')

const setupPromise = testSetup()

test('It should ensureSellLiquidity', async () => {
  const { liquidityService } = await setupPromise

  // we mock the auction repo
  liquidityService._auctionRepo = new AuctionRepoMock({
    auctions: _getAuctionsWithUnderFundingEthOmg()
  })
  // we mock the ethereum repo
  liquidityService._ethereumRepo = ethereumRepoMock

  async function _isUnderFundingAuction ({ tokenA, tokenB }) {
    const auctionIndex = await liquidityService._auctionRepo.getAuctionIndex({
      sellToken: tokenA, buyToken: tokenB
    })
    const { fundingA, fundingB } = await liquidityService._auctionRepo.getFundingInUSD({
      tokenA, tokenB, auctionIndex
    })

    return fundingA.lessThan(MINIMUM_SELL_VOLUME) &&
      fundingB.lessThan(MINIMUM_SELL_VOLUME)
  }

  function _isValidSellVolume (sellVolume, fundingSellVolume) {
    return sellVolume.greaterThan(fundingSellVolume)
  }

  // GIVEN a not RUNNING auction, without enough sell liquidiy
  expect(await _isUnderFundingAuction({ tokenA: 'OMG', tokenB: 'WETH' }))
    .toBeTruthy()

  // WHEN we ensure sell liquidity
  const ensureLiquidityState = await liquidityService.ensureSellLiquidity({
    sellToken: 'OMG', buyToken: 'WETH', from: '0x123', waitToReleaseTheLock: false
  })

  // THEN bot sells in both sides, WETH-OMG and OMG-WETH, the pair market we expect
  const expectedBotSell = [{
    buyToken: 'WETH',
    sellToken: 'OMG'
  }, {
    buyToken: 'OMG',
    sellToken: 'WETH'
  }]
  expect(ensureLiquidityState).toMatchObject(expectedBotSell)

  // THEN new sell volume is valid
  let currentSellVolume = await liquidityService._auctionRepo.getSellVolume({ sellToken: 'WETH', buyToken: 'OMG' })
  expect(_isValidSellVolume(currentSellVolume, UNDER_MINIMUM_FUNDING_WETH))
    .toBeTruthy()
  expect(_isValidSellVolume(currentSellVolume, ensureLiquidityState[0].amount))
    .toBeTruthy()

  // THEN is not underfunding auction
  expect(await _isUnderFundingAuction({ tokenA: 'OMG', tokenB: 'WETH' }))
    .toBeFalsy()
})

test('It should ensureBuyLiquidity', async () => {
  const { liquidityService } = await setupPromise

  // we mock the auction repo
  liquidityService._auctionRepo = new AuctionRepoMock({
    auctions: _getAuctionsWhereBotShouldBuyEthRdn()
  })
  // we mock the exchange price repo
  liquidityService._priceRepo = priceRepo

  // GIVEN a RUNNING auction, nearly to close but many tokens to sold
  expect(await _hasLowBuyVolume(
    { sellToken: 'WETH', buyToken: 'RDN' },
    liquidityService._auctionRepo
  )).toBeTruthy()

  // WHEN we ensure sell liquidity
  const ensureLiquidityState = await liquidityService.ensureBuyLiquidity({
    sellToken: 'WETH', buyToken: 'RDN', from: '0x123', waitToReleaseTheLock: false
  })

  // THEN bot buys in WETH-RDN market, the pair market we expect
  const expectedBotBuy = [{
    buyToken: 'RDN',
    sellToken: 'WETH'
  }]
  expect(ensureLiquidityState).toMatchObject(expectedBotBuy)

  // THEN auction hasn't got low buy volume
  expect(await _hasLowBuyVolume(
    { sellToken: 'WETH', buyToken: 'RDN' },
    liquidityService._auctionRepo
  )).toBeFalsy()
})

test('It should not ensureBuyLiquidity if enough buy volume', async () => {
  const { liquidityService } = await setupPromise

  // we mock the auction repo
  liquidityService._auctionRepo = new AuctionRepoMock({
    auctions: _getAuctionsWhereBotShouldBuyEthRdn()
  })
  // we mock the exchange price repo
  liquidityService._priceRepo = priceRepo

  // GIVEN a RUNNING auction, with enough buy volume for both pairs
  // Ensure with sellToken: RDN and buyToken: WETH on purpose
  // It shouldn't matter the order
  await liquidityService.ensureBuyLiquidity({
    sellToken: 'RDN', buyToken: 'WETH', from: '0x123', waitToReleaseTheLock: false
  })
  expect(await _hasLowBuyVolume(
    { sellToken: 'WETH', buyToken: 'RDN' },
    liquidityService._auctionRepo
  )).toBeFalsy()

  // WHEN we ensure buy liquidity
  const ensureLiquidityStateWethRdn = await liquidityService.ensureBuyLiquidity({
    sellToken: 'WETH', buyToken: 'RDN', from: '0x123', waitToReleaseTheLock: false
  })

  // THEN the bot don't buy anything
  const expectedBotBuy = []
  expect(ensureLiquidityStateWethRdn).toMatchObject(expectedBotBuy)
})

test('It should not ensureBuyLiquidity if auction has closed', async () => {
  const { liquidityService } = await setupPromise

  // we mock the auction repo
  liquidityService._auctionRepo = new AuctionRepoMock({
    auctions: _getClosedAuctions()
  })
  // we mock the exchange price repo
  liquidityService._priceRepo = priceRepo

  // GIVEN a CLOSED auction, with enough buy volume
  expect(await _hasLowBuyVolume(
    { sellToken: 'WETH', buyToken: 'RDN' },
    liquidityService._auctionRepo
  )).toBeFalsy()

  // WHEN we ensure buy liquidity
  const ensureLiquidityState = await liquidityService.ensureBuyLiquidity({
    sellToken: 'WETH', buyToken: 'RDN', from: '0x123', waitToReleaseTheLock: false
  })

  // THEN the bot don't buy anything
  const expectedBotBuy = []
  expect(ensureLiquidityState).toMatchObject(expectedBotBuy)
})

test('It should ensureBuyLiquidity if auction has only one side closed', async () => {
  const { liquidityService } = await setupPromise

  // we mock the auction repo
  liquidityService._auctionRepo = new AuctionRepoMock({
    auctions: _getAuctionsWithOneSideTheoreticalClosed()
  })
  // we mock the exchange price repo
  liquidityService._priceRepo = priceRepo

  // GIVEN a RUNNING auction, with one side theoretical closed and other still running
  expect(await _hasLowBuyVolume(
    { sellToken: 'WETH', buyToken: 'RDN' },
    liquidityService._auctionRepo
  )).toBeTruthy()

  // WHEN we ensure buy liquidity
  const ensureLiquidityState = await liquidityService.ensureBuyLiquidity({
    sellToken: 'WETH', buyToken: 'RDN', from: '0x123', waitToReleaseTheLock: false
  })

  // THEN bot buys in WETH-RDN market, the pair market we expect
  const expectedBotBuy = [{
    buyToken: 'RDN',
    sellToken: 'WETH'
  }]
  expect(ensureLiquidityState).toMatchObject(expectedBotBuy)
})

test('It should detect concurrency when ensuring liquidiy', async () => {
  const { liquidityService } = await setupPromise

  // GIVEN a not RUNNING auction, without enough sell liquidiy
  // we mock the auction repo
  liquidityService._auctionRepo = new AuctionRepoMock({
    auctions: _getAuctionsWithUnderFundingEthOmg()
  })

  // we wrap postSellOrder with jest mock functionalities
  const postSellOrder = jest.fn(liquidityService._auctionRepo.postSellOrder)
  liquidityService._auctionRepo.postSellOrder = postSellOrder

  // GIVEN no calls to postSellOrder function
  expect(postSellOrder.mock.calls.length).toBe(0)

  // WHEN we ensure sell liquidity twice
  let ensureLiquidityPromise1 = liquidityService.ensureSellLiquidity({
    sellToken: 'OMG', buyToken: 'WETH', from: '0x123', waitToReleaseTheLock: false
  })
  let ensureLiquidityPromise2 = liquidityService.ensureSellLiquidity({
    sellToken: 'OMG', buyToken: 'WETH', from: '0x123', waitToReleaseTheLock: false
  })

  await Promise.all([
    ensureLiquidityPromise1,
    ensureLiquidityPromise2
  ])

  // THEN expect 2 calls to postSellOrder function ensuring liquidity to both sides
  // of the token pair
  expect(postSellOrder.mock.calls.length).toBe(2)
})

test('It should not ensure sell liquidity if auction is not waiting for funding', async () => {
  const { liquidityService } = await setupPromise
  // we mock the auction repo
  liquidityService._auctionRepo = auctionRepoMock

  // GIVEN a running auction

  // WHEN we ensure sell liquidity
  const ensureLiquidityState = await liquidityService.ensureSellLiquidity({
    sellToken: 'RDN', buyToken: 'WETH', from: '0x123', waitToReleaseTheLock: false
  })

  // THEN we shouldn't be adding funds
  expect(ensureLiquidityState).toEqual([])
})

test('It should not ensure sell liquidity if auction has enough funds', async () => {
  const { liquidityService } = await setupPromise
  expect.assertions(1)
  // we mock the auction repo
  liquidityService._auctionRepo = auctionRepoMock

  // GIVEN an auction with enough funds
  // we mock the auction repo
  liquidityService._auctionRepo = new AuctionRepoMock({
    auctions: _getAuctionsWithBothSidesFundedEthOmg()
  })

  try {
    // WHEN we ensure sell liquidity
    await liquidityService.ensureSellLiquidity({
      sellToken: 'OMG', buyToken: 'WETH', from: '0x123', waitToReleaseTheLock: false
    })
  } catch (e) {
    // THEN we get an error becuse we shouldn't ensure liquidity
    expect(e).toBeInstanceOf(Error)
  }
})

test('It should not ensure buy liquidity if auction has not started yet', async () => {
  const { liquidityService } = await setupPromise

  // we mock the auction repo
  liquidityService._auctionRepo = auctionRepoMock

  // GIVEN an auction with enough funds
  // we mock the auction repo
  liquidityService._auctionRepo = new AuctionRepoMock({
    auctions: _getAuctionsWhereBotShouldBuyButAuctionNotStarted()
  })

  // WHEN we ensure sell liquidity
  const ensureLiquidityState = await liquidityService.ensureBuyLiquidity({
    sellToken: 'RDN', buyToken: 'WETH', from: '0x123', waitToReleaseTheLock: false
  })

  // THEN we shouldn't be adding a buy order
  expect(ensureLiquidityState).toEqual([])
})

test('It should return token balance for an account', async () => {
  const { liquidityService } = await setupPromise

  // we mock the auction repo
  liquidityService._auctionRepo = auctionRepoMock

  // GIVEN

  // WHEN
  let rdnEthAccountBalance = await liquidityService.getBalancesDx({
    tokens: ['RDN', 'WETH'],
    address: '0xAe6eCb2A4CdB1231B594cb66C2dA9277551f9ea7'
  })

  // THEN
  let expectedRdnEthAccountBalance = [{
    amount: new BigNumber('601.112e18'),
    amountInUSD: new BigNumber('2473.57'), // 2473.57588
    token: 'RDN'
  }, {
    amount: new BigNumber('4.01234e18'),
    amountInUSD: new BigNumber('4020.21'), // 4020.21221108
    token: 'WETH'
  }]
  expect(rdnEthAccountBalance).toEqual(expectedRdnEthAccountBalance)
})

// DX Fee up to 0.5%
// const MAXIMUM_DX_FEE = 0.005

const MINIMUM_SELL_VOLUME = 1000

const UNDER_MINIMUM_FUNDING_WETH = new BigNumber('0.5e18')

async function _hasLowBuyVolume ({ sellToken, buyToken }, auctionRepo) {
  const [buyVolume, sellVolume] = await Promise.all([
    auctionRepo.getBuyVolume({ buyToken, sellToken }),
    auctionRepo.getSellVolume({ buyToken, sellToken })
  ])
  return (sellVolume !== new BigNumber(0) && buyVolume.lessThan(sellVolume.div(2)))
}

function _getAuctionsWithUnderFundingEthOmg () {
  let localAuctionsData = clone(auctionsMockData)

  // GIVEN a not RUNNING auction, without enough sell liquidiy
  const currentAuctionEthOmgInMock = localAuctionsData.auctions['WETH-OMG'].length - 1
  const updatedAuction = Object.assign({}, localAuctionsData.auctions['WETH-OMG'][currentAuctionEthOmgInMock],
    { sellVolume: new BigNumber('0.5e18') })

  localAuctionsData.auctions['WETH-OMG'][currentAuctionEthOmgInMock] = updatedAuction
  return Object.assign({}, localAuctionsData.auctions,
    { 'WETH-OMG': localAuctionsData.auctions['WETH-OMG'] })
}

function _getAuctionsWhereBotShouldBuyEthRdn () {
  let localAuctionsData = clone(auctionsMockData)

  // GIVEN a RUNNING auction, nearly to close but many tokens to sold
  const currentAuctionEthRdnInMock = localAuctionsData.auctions['WETH-RDN'].length - 1
  const updatedAuctionEthRdn = Object.assign({}, localAuctionsData.auctions['WETH-RDN'][currentAuctionEthRdnInMock],
    {
      price: {
        numerator: new BigNumber('1000000'),
        denominator: new BigNumber('4275')
      }
    })
  const currentAuctionRdnEthInMock = localAuctionsData.auctions['RDN-WETH'].length - 1
  const updatedAuctionRdnEth = Object.assign({}, localAuctionsData.auctions['RDN-WETH'][currentAuctionRdnEthInMock],
    {
      price: {
        numerator: new BigNumber('4275'),
        denominator: new BigNumber('1000000')
      }
    })
  localAuctionsData.auctions['WETH-RDN'][currentAuctionEthRdnInMock] = updatedAuctionEthRdn

  localAuctionsData.auctions['RDN-WETH'][currentAuctionRdnEthInMock] = updatedAuctionRdnEth

  return Object.assign({}, localAuctionsData.auctions,
    {
      'WETH-RDN': localAuctionsData.auctions['WETH-RDN'],
      'RDN-WETH': localAuctionsData.auctions['RDN-WETH']
    })
}

function _getAuctionsWhereBotShouldBuyButAuctionNotStarted () {
  let localAuctionsData = _getAuctionsWhereBotShouldBuyEthRdn()

  const currentAuctionEthRdnInMock = localAuctionsData['WETH-RDN'].length - 1
  const now = new Date()

  const updatedAuctionEthRdn = {
    ...localAuctionsData['RDN-WETH'][currentAuctionEthRdnInMock],
    auctionStart: new Date(now.getTime() + 600000) // Auction starts in 10 minutes
  }

  const currentAuctionRdnEthInMock = localAuctionsData['RDN-WETH'].length - 1
  const updatedAuctionRdnEth = {
    ...localAuctionsData['RDN-WETH'][currentAuctionRdnEthInMock],
    auctionStart: new Date(now.getTime() + 600000) // Auction starts in 10 minutes)
  }

  localAuctionsData['WETH-RDN'][currentAuctionEthRdnInMock] = updatedAuctionEthRdn

  localAuctionsData['RDN-WETH'][currentAuctionRdnEthInMock] = updatedAuctionRdnEth

  return Object.assign({}, localAuctionsData,
    {
      'WETH-RDN': localAuctionsData['WETH-RDN'],
      'RDN-WETH': localAuctionsData['RDN-WETH']
    })
}

function _getAuctionsWithOneSideTheoreticalClosed () {
  let localAuctionsData = clone(auctionsMockData)

  // GIVEN a RUNNING auction, nearly to close but many tokens to sold
  const currentAuctionEthRdnInMock = localAuctionsData.auctions['WETH-RDN'].length - 1
  const updatedAuctionEthRdn = Object.assign({}, localAuctionsData.auctions['WETH-RDN'][currentAuctionEthRdnInMock],
    {
      price: {
        // Forced very low price
        numerator: new BigNumber('1000000'),
        denominator: new BigNumber('999999999999')
      }
    })
  const currentAuctionRdnEthInMock = localAuctionsData.auctions['RDN-WETH'].length - 1
  const updatedAuctionRdnEth = Object.assign({}, localAuctionsData.auctions['RDN-WETH'][currentAuctionRdnEthInMock],
    {
      price: {
        numerator: new BigNumber('4275'),
        denominator: new BigNumber('1000000')
      },
      buyVolume: new BigNumber('0.3272420335275e18')
    })
  localAuctionsData.auctions['WETH-RDN'][currentAuctionEthRdnInMock] = updatedAuctionEthRdn

  localAuctionsData.auctions['RDN-WETH'][currentAuctionRdnEthInMock] = updatedAuctionRdnEth

  return Object.assign({}, localAuctionsData.auctions,
    {
      'WETH-RDN': localAuctionsData.auctions['WETH-RDN'],
      'RDN-WETH': localAuctionsData.auctions['RDN-WETH']
    })
}

function _getClosedAuctions () {
  let localAuctionsData = clone(auctionsMockData)

  const currentAuctionEthRdnInMock = localAuctionsData.auctions['WETH-RDN'].length - 1
  const updatedAuctionEthRdn = Object.assign({}, localAuctionsData.auctions['WETH-RDN'][currentAuctionEthRdnInMock],
    {
      price: {
        numerator: new BigNumber('1000000'),
        denominator: new BigNumber('4275')
      },
      buyVolume: new BigNumber('67.7034e18')
    })
  localAuctionsData.auctions['WETH-RDN'][currentAuctionEthRdnInMock] = updatedAuctionEthRdn

  return Object.assign({}, localAuctionsData.auctions,
    {
      'WETH-RDN': localAuctionsData.auctions['WETH-RDN']
    })
}

function _getAuctionsWithBothSidesFundedEthOmg () {
  let localAuctionsData = clone(auctionsMockData)

  // GIVEN a not RUNNING auction, without enough sell liquidiy
  const currentAuctionEthOmgInMock = localAuctionsData.auctions['OMG-WETH'].length - 1
  const updatedAuction = Object.assign({}, localAuctionsData.auctions['OMG-WETH'][currentAuctionEthOmgInMock],
    { sellVolume: new BigNumber('860.5e18') })

  localAuctionsData.auctions['OMG-WETH'][currentAuctionEthOmgInMock] = updatedAuction
  return Object.assign({}, localAuctionsData.auctions,
    { 'OMG-WETH': localAuctionsData.auctions['OMG-WETH'] })
}
