const testSetup = require('../helpers/testSetup')
const AuctionRepoMock = require('../../src/repositories/AuctionRepo/AuctionRepoMock')
const auctionRepoMock = new AuctionRepoMock({})
const EthereumRepoMock = require('../../src/repositories/EthereumRepo/EthereumRepoMock')
const ethereumRepoMock = new EthereumRepoMock({})
const numberUtil = require('../../src/helpers/numberUtil.js')

const auctionsMockData = require('../data/auctions')

const BigNumber = require('bignumber.js')

const setupPromise = testSetup()

test('It should return available markets', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock
  dxInfoService._ethereumRepo = ethereumRepoMock
  const EXPECTED_MARKETS = [{
    tokenA: { name: 'Raiden network tokens', symbol: 'RDN', address: '0x234', decimals: 18 },
    tokenB: { name: 'Ethereum Token', symbol: 'WETH', address: '0x123', decimals: 18 }
  }, {
    tokenA: { name: 'OmiseGO', symbol: 'OMG', address: '0x345', decimals: 18 },
    tokenB: { name: 'Ethereum Token', symbol: 'WETH', address: '0x123', decimals: 18 }
  }]

  const markets = await dxInfoService.getMarkets()
  expect(markets.data).toMatchObject(EXPECTED_MARKETS)
})

test('It should return a token list', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock
  dxInfoService._ethereumRepo = ethereumRepoMock
  const EXPECTED_TOKENS = [
    { name: 'Raiden network tokens', symbol: 'RDN', address: '0x234', decimals: 18 },
    { name: 'Ethereum Token', symbol: 'WETH', address: '0x123', decimals: 18 },
    { name: 'OmiseGO', symbol: 'OMG', address: '0x345', decimals: 18 }
  ]

  let tokenList = await dxInfoService.getConfiguredTokenList()
  expect(tokenList.data).toMatchObject(EXPECTED_TOKENS)
})

test('It should return auction state', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  let rdnEthAuctionState = await dxInfoService.getState({
    sellToken: 'RDN', buyToken: 'WETH' })
  expect(rdnEthAuctionState).toBe('RUNNING')
})

test('It should return auction index', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  let rdnEthAuctionIndex = await dxInfoService.getAuctionIndex({
    sellToken: 'RDN', buyToken: 'WETH' })
  expect(rdnEthAuctionIndex).toBe(77)
})

test('It should return closing price for auction', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  const auctionIndex = 1
  const mockAuction = auctionsMockData.auctions['OMG-WETH'].find(auction => {
    return auction.index === auctionIndex
  })
  const EXPECTED_OMG_WETH_PRICE = mockAuction.price.numerator.div(
    mockAuction.price.denominator)

  // WHEN we ask for the closing price
  let wethOmgClosingPrice = await dxInfoService.getClosingPrice({
    sellToken: 'OMG', buyToken: 'WETH', auctionIndex
  })

  // THEN the closing price match the expected closing price
  expect(wethOmgClosingPrice).toMatchObject(EXPECTED_OMG_WETH_PRICE)
})

test('It should return closing prices for N auctions', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  // WHEN we ask for the last 5 closing prices
  let wethOmgLatestClosingPrices = await dxInfoService.getLastClosingPrices({
    sellToken: 'OMG', buyToken: 'WETH', count: 5
  })

  // THEN the closing price list match the expected closing prices
  expect(wethOmgLatestClosingPrices).toMatchObject(EXPECTED_OMG_WETH_CLOSING_PRICES)
})

test('It should return market details', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  let rdnEthMarketDetails = await dxInfoService.getMarketDetails({
    sellToken: 'RDN', buyToken: 'WETH' })
  expect(rdnEthMarketDetails).toMatchObject(EXPECTED_RDN_WETH_MARKET)
})

test('It should return current auction price', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  // Service returns a computed value of numerator.div(denominator)
  // Mock values are 10 / 233
  const RDN_WETH_CURRENT_PRICE = new BigNumber('0.0429184549356223176')

  let rdnEthCurrentPrice = await dxInfoService.getCurrentPrice({
    sellToken: 'RDN', buyToken: 'WETH' })
  expect(rdnEthCurrentPrice).toEqual(RDN_WETH_CURRENT_PRICE)
})

test('It should return current auction start', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  let rdnEthAuctionStart = await dxInfoService.getAuctionStart({
    sellToken: 'RDN', buyToken: 'WETH' })
  expect(rdnEthAuctionStart).toEqual(CURRENT_RDN_WETH_AUCTION.auctionStart)
})

test('It should return current auction sell volume', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  let rdnEthSellVolume = await dxInfoService.getSellVolume({
    sellToken: 'RDN', buyToken: 'WETH' })
  expect(rdnEthSellVolume).toEqual(CURRENT_RDN_WETH_AUCTION.sellVolume)
})

test('It should return next auction sell volume', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  let rdnEthSellVolumeNext = await dxInfoService.getSellVolumeNext({
    sellToken: 'RDN', buyToken: 'WETH' })
  expect(rdnEthSellVolumeNext).toEqual(CURRENT_RDN_WETH_AUCTION.sellVolumeNext)
})

test('It should return current auction buy volume', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  let rdnEthBuyVolume = await dxInfoService.getBuyVolume({
    sellToken: 'RDN', buyToken: 'WETH' })
  expect(rdnEthBuyVolume).toEqual(CURRENT_RDN_WETH_AUCTION.buyVolume)
})

test('It should get balances for all currencies of an account', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  const EXPECTED_ACCOUNT_BALANCES = [
    {amount: new BigNumber('2.23154e18'), token: 'WETH'},
    {amount: new BigNumber('30.20e18'), token: 'RDN'},
    {amount: new BigNumber('15.20e18'), token: 'OMG'}
  ]

  let accountBalance = await dxInfoService.getBalances({
    address: '0x8c3fab73727E370C1f319Bc7fE5E25fD9BEa991e' })
  expect(accountBalance).toEqual(EXPECTED_ACCOUNT_BALANCES)
})

test('It should get current price in USD', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  const token = 'WETH'
  const amount = new BigNumber('2e18')
  const price = PRICES_IN_USD.find(price => {
    return price.token === token
  })
  const EXPECTED_PRICE_IN_USD = amount.mul(price.price).div(1e18)

  const priceInUSD = await dxInfoService.getPriceInUSD({
    token, amount})
  expect(priceInUSD).toEqual(EXPECTED_PRICE_IN_USD)
})

test('It should get current fee ratio for an user', async () => {
  const { dxInfoService } = await setupPromise

  dxInfoService._auctionRepo = auctionRepoMock

  const COMPUTED_MAXIMUM_DX_FEE = new BigNumber('0.005')

  let feeRatio = await dxInfoService.getCurrentFeeRatio({ address: '0x123' })
  expect(feeRatio).toMatchObject(COMPUTED_MAXIMUM_DX_FEE)
})

const EXPECTED_OMG_WETH_CLOSING_PRICES = auctionsMockData.auctions['OMG-WETH'].reduce(
  (prices, { index, price }) => {
    if (price) {
      prices.push({
        auctionIndex: index,
        price: numberUtil.toBigNumberFraction(price, true) || null
      })
    }
    return prices
  },
  []
).reverse()

const currentRdnWethAuctionInMockIndex = auctionsMockData.auctions['RDN-WETH'].length - 1
const CURRENT_RDN_WETH_AUCTION = auctionsMockData.auctions['RDN-WETH'][currentRdnWethAuctionInMockIndex]

const CURRENT_WETH_RDN_AUCTION = auctionsMockData.auctions['WETH-RDN'][currentRdnWethAuctionInMockIndex]

const PRICES_IN_USD = auctionsMockData.pricesInUSD

const EXPECTED_RDN_WETH_MARKET = {
  auction: {
    buyVolume: CURRENT_RDN_WETH_AUCTION.buyVolume,
    closingPrice: {},
    isClosed: false,
    isTheoreticalClosed: false,
    sellVolume: CURRENT_RDN_WETH_AUCTION.sellVolume
  },
  auctionOpp: {
    buyVolume: CURRENT_WETH_RDN_AUCTION.buyVolume,
    closingPrice: {},
    isClosed: false,
    isTheoreticalClosed: false,
    sellVolume: CURRENT_WETH_RDN_AUCTION.sellVolume
  },
  isValidTokenPair: true,
  state: 'RUNNING',
  isSellTokenApproved: true,
  isBuyTokenApproved: true,
  auctionIndex: CURRENT_RDN_WETH_AUCTION.index
}
